import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/utils";
import { validateCurrentSession } from "@/lib/auth";
import { normalizeWilayaCode } from "@/lib/wilayas";
import { isPrivateClinic } from "@/lib/facilities";
import { UnifiedSelect } from "@/components/ui/UnifiedSelect";
import { 
  Building2, 
  Search, 
  Filter, 
  Eye, 
  RefreshCw, 
  Lock, 
  MapPin, 
  Stethoscope, 
  Activity, 
  X, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Shield,
  FileCheck,
  UserCheck,
  Check,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";

export const Route = createFileRoute("/inspector/facilities")({
  head: () => ({
    meta: [
      { title: "Annuaire & Validation des Établissements — Inspectorat Rased" },
    ],
  }),
  component: InspectorFacilitiesPage,
});

const COLORS = {
  navy: "#062C54",
  teal: "#0fa29b",
  lightTeal: "#e6f5f4",
  text: "#2d3748",
  muted: "#718096",
  border: "#e2e8f0",
  bgLight: "#f8fafc"
};

export function InspectorFacilitiesPage() {
  const [loading, setLoading] = useState(true);
  const [inspectorWilaya, setInspectorWilaya] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [pendingUnlistedRequests, setPendingUnlistedRequests] = useState<any[]>([]);

  // Action states
  const [processingAction, setProcessingAction] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Rejection Modal
  const [rejectingRequest, setRejectingRequest] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const [appliedTypeFilter, setAppliedTypeFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING_CLINICS">("ALL");

  // Selected Facility Detail View Modal
  const [selectedFacility, setSelectedFacility] = useState<any | null>(null);
  const [facilityDoctors, setFacilityDoctors] = useState<any[]>([]);
  const [facilityEvents, setFacilityEvents] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadFacilities = async () => {
    setLoading(true);
    try {
      const authResult = await validateCurrentSession(["INSPECTOR"]);
      if (!authResult.authorized || !authResult.user) return;

      // 1. Fetch Inspector Wilaya
      const { data: inspRec } = await supabase
        .from("inspectors")
        .select("wilaya")
        .eq("user_id", authResult.user.id)
        .maybeSingle();

      if (inspRec?.wilaya) {
        setInspectorWilaya(inspRec.wilaya);
        const normCode = normalizeWilayaCode(inspRec.wilaya);

        // 2. Fetch Facilities strictly matching Inspector's Wilaya
        const { data: facsData } = await supabase
          .from("facilities")
          .select("*")
          .ilike("wilaya", `%${normCode}%`)
          .order("name");

        const facList = facsData || [];

        // Enrich facilities with doctor count and health event count
        const enriched = await Promise.all(
          facList.map(async (fac) => {
            const { count: docCount } = await supabase
              .from("doctors")
              .select("id", { count: "exact", head: true })
              .eq("facility_id", fac.id);

            const { count: evCount } = await supabase
              .from("health_events")
              .select("id", { count: "exact", head: true })
              .eq("facility_id", fac.id);

            return {
              ...fac,
              doctorCount: docCount || 0,
              eventCount: evCount || 0,
            };
          })
        );

        setFacilities(enriched);

        // 3. Fetch Unlisted Private Clinic Requests strictly for Inspector's Wilaya
        try {
          const { data: unlistedData } = await supabase
            .from("unlisted_clinic_requests")
            .select(`
              *,
              users:user_id (id, first_name, last_name, email)
            `)
            .ilike("wilaya", `%${normCode}%`)
            .eq("status", "PENDING")
            .order("created_at", { ascending: false });

          setPendingUnlistedRequests(unlistedData || []);
        } catch (unlistedErr) {
          console.warn("Could not load unlisted_clinic_requests:", unlistedErr);
          setPendingUnlistedRequests([]);
        }
      }
    } catch (err) {
      console.error("Error loading facilities for inspector:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFacilities();
  }, []);

  // Handle Approve Unlisted Clinic Request
  const handleApproveRequest = async (req: any) => {
    setProcessingAction(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const authResult = await validateCurrentSession(["INSPECTOR"]);

      // 1. Create or retrieve existing private clinic facility
      let facilityId: string | null = null;
      const { data: existingFac } = await supabase
        .from("facilities")
        .select("id")
        .eq("name", req.clinic_name.trim())
        .eq("facility_type", "Clinique privée")
        .maybeSingle();

      if (existingFac) {
        facilityId = existingFac.id;
      } else {
        const { data: newFac, error: facErr } = await supabase
          .from("facilities")
          .insert([{
            name: req.clinic_name.trim(),
            facility_type: "Clinique privée",
            wilaya: req.wilaya,
            address: req.address || "Adresse non renseignée",
            created_by: authResult.user?.id
          }])
          .select("id")
          .single();

        if (facErr || !newFac) throw new Error("Erreur lors de la création de la clinique privée.");
        facilityId = newFac.id;
      }

      // 2. Link/create doctor record in doctors
      const userId = req.user_id;
      const { data: existingDoc } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!existingDoc) {
        const { error: docErr } = await supabase
          .from("doctors")
          .insert([{
            user_id: userId,
            nin: req.nin,
            specialty: req.specialty,
            facility_id: facilityId,
            order_number: req.order_number,
            phone: req.phone,
            status: "ACCEPTED",
            verified_by_facility: facilityId,
            verified_at: new Date().toISOString()
          }]);

        if (docErr) throw new Error(docErr.message || "Erreur lors de la création de la fiche médecin.");
      } else {
        await supabase
          .from("doctors")
          .update({
            facility_id: facilityId,
            order_number: req.order_number,
            status: "ACCEPTED",
            verified_by_facility: facilityId,
            verified_at: new Date().toISOString()
          })
          .eq("id", existingDoc.id);
      }

      // 3. Mark unlisted_clinic_requests as APPROVED
      const { error: reqErr } = await supabase
        .from("unlisted_clinic_requests")
        .update({
          status: "APPROVED",
          reviewed_by: authResult.user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", req.id);

      if (reqErr) throw reqErr;

      setActionSuccess(`La clinique privée "${req.clinic_name}" et son médecin ont été homologués et enregistrés.`);
      await loadFacilities();
    } catch (err: any) {
      setActionError(err.message || "Erreur lors de l'homologation de la clinique.");
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle Reject Unlisted Clinic Request
  const handleConfirmReject = async () => {
    if (!rejectingRequest) return;
    if (!rejectReason.trim()) {
      setActionError("Veuillez spécifier le motif du refus.");
      return;
    }

    setProcessingAction(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const authResult = await validateCurrentSession(["INSPECTOR"]);

      const { error } = await supabase
        .from("unlisted_clinic_requests")
        .update({
          status: "REJECTED",
          reviewed_by: authResult.user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectReason
        })
        .eq("id", rejectingRequest.id);

      if (error) throw error;

      setActionSuccess(`La demande d'homologation pour "${rejectingRequest.clinic_name}" a été refusée.`);
      setRejectingRequest(null);
      setRejectReason("");
      await loadFacilities();
    } catch (err: any) {
      setActionError(err.message || "Erreur lors du refus de la demande.");
    } finally {
      setProcessingAction(false);
    }
  };

  // Open Facility Detail View Modal
  const handleViewFacility = async (facility: any) => {
    setSelectedFacility(facility);
    setLoadingDetails(true);
    try {
      const { data: docs } = await supabase
        .from("doctors")
        .select(`
          *,
          users:user_id (first_name, last_name, email)
        `)
        .eq("facility_id", facility.id);

      const { data: evs } = await supabase
        .from("health_events")
        .select(`
          *,
          reportable_diseases:reportable_disease_id(name, category)
        `)
        .eq("facility_id", facility.id)
        .order("created_at", { ascending: false })
        .limit(5);

      setFacilityDoctors(docs || []);
      setFacilityEvents(evs || []);
    } catch (err) {
      console.error("Error loading details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Filter Handlers
  const handleApplyFilters = () => {
    setAppliedSearchQuery(searchQuery);
    setAppliedTypeFilter(typeFilter);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setTypeFilter("ALL");
    setAppliedSearchQuery("");
    setAppliedTypeFilter("ALL");
  };

  const filteredFacilities = facilities.filter((fac) => {
    const matchesSearch = 
      fac.name.toLowerCase().includes(appliedSearchQuery.toLowerCase()) ||
      (fac.address && fac.address.toLowerCase().includes(appliedSearchQuery.toLowerCase()));

    const matchesType = 
      appliedTypeFilter === "ALL" || fac.facility_type === appliedTypeFilter;

    return matchesSearch && matchesType;
  });

  const filteredRequests = pendingUnlistedRequests.filter((req) => {
    const docName = `${req.users?.first_name || ""} ${req.users?.last_name || ""}`.toLowerCase();
    const clinicName = (req.clinic_name || "").toLowerCase();
    const q = appliedSearchQuery.toLowerCase();
    return docName.includes(q) || clinicName.includes(q) || (req.nin && req.nin.includes(q));
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", backgroundColor: "white", padding: "24px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
              <Building2 size={22} />
            </div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "900", color: COLORS.navy, margin: 0, letterSpacing: "-0.02em" }}>
              Établissements de Santé (Inspection)
            </h1>
          </div>
          <p style={{ fontSize: "0.88rem", color: COLORS.muted, margin: 0 }}>
            Registre de surveillance et contrôle territorial des structures publiques et privées sous votre juridiction.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* WILAYA SCOPE LOCKED BADGE */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#FEF3C7", color: "#B45309", border: "1px solid #FDE68A", padding: "8px 14px", borderRadius: "12px", fontSize: "0.85rem", fontWeight: "800" }}>
            <MapPin size={16} />
            <span>Wilaya {inspectorWilaya || "—"}</span>
            <Lock size={12} style={{ marginLeft: "2px" }} />
          </div>

          <button onClick={loadFacilities} disabled={loading} style={{ background: "white", border: `1px solid ${COLORS.border}`, padding: "10px", borderRadius: "12px", cursor: "pointer", color: COLORS.navy }}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* FEEDBACK ALERTS */}
      {actionSuccess && (
        <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "12px 16px", borderRadius: "12px", fontSize: "0.88rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldCheck size={18} /> {actionSuccess}
        </div>
      )}
      {actionError && (
        <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "12px 16px", borderRadius: "12px", fontSize: "0.88rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldAlert size={18} /> {actionError}
        </div>
      )}

      {/* SECTION TABS */}
      <div style={{ display: "flex", gap: "12px", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: "12px" }}>
        <button
          onClick={() => setActiveTab("ALL")}
          style={{
            padding: "10px 18px",
            borderRadius: "10px",
            border: "none",
            backgroundColor: activeTab === "ALL" ? COLORS.navy : "transparent",
            color: activeTab === "ALL" ? "white" : COLORS.muted,
            fontWeight: "700",
            fontSize: "0.9rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <Building2 size={16} />
          Tous les Établissements ({facilities.length})
        </button>

        <button
          onClick={() => setActiveTab("PENDING_CLINICS")}
          style={{
            padding: "10px 18px",
            borderRadius: "10px",
            border: "none",
            backgroundColor: activeTab === "PENDING_CLINICS" ? "#B45309" : "#FEF3C7",
            color: activeTab === "PENDING_CLINICS" ? "white" : "#B45309",
            fontWeight: "700",
            fontSize: "0.9rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <Clock size={16} />
          Cliniques à vérifier ({pendingUnlistedRequests.length})
        </button>
      </div>

      {/* FILTERS TOOLBAR */}
      <div style={{ backgroundColor: "white", padding: "18px 22px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "14px" }}>
        
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", flex: 1, minWidth: "280px" }}>
          {/* Search Box */}
          <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
            <Search size={18} color={COLORS.muted} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Rechercher par nom, adresse, NIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              style={{
                width: "100%",
                padding: "9px 14px 9px 40px",
                borderRadius: "10px",
                border: `1px solid ${COLORS.border}`,
                fontSize: "0.9rem",
                outline: "none"
              }}
            />
          </div>

          {/* Unified Select Dropdown for Type Filter */}
          {activeTab === "ALL" && (
            <div style={{ width: "240px" }}>
              <UnifiedSelect
                icon={Building2}
                value={typeFilter}
                onChange={(val) => setTypeFilter(val)}
                options={[
                  { value: "ALL", label: "Tous les types" },
                  { value: "CHU", label: "CHU — Centre Hosp. Univ." },
                  { value: "EPH", label: "EPH — Établissement Public" },
                  { value: "EPSP", label: "EPSP — Santé de Proximité" },
                  { value: "Clinique privée", label: "Clinique privée" }
                ]}
              />
            </div>
          )}
        </div>

        {/* Filter Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={handleApplyFilters}
            style={{
              backgroundColor: COLORS.navy,
              color: "white",
              border: "none",
              padding: "9px 16px",
              borderRadius: "10px",
              fontWeight: "700",
              fontSize: "0.88rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Filter size={15} /> Appliquer
          </button>
          
          {(appliedSearchQuery || appliedTypeFilter !== "ALL") && (
            <button
              onClick={handleResetFilters}
              style={{
                backgroundColor: COLORS.bgLight,
                color: COLORS.navy,
                border: `1px solid ${COLORS.border}`,
                padding: "9px 14px",
                borderRadius: "10px",
                fontWeight: "700",
                fontSize: "0.88rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <RotateCcw size={14} /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* CONTENT DISPLAY: CLINIQUE A VERIFIER TAB vs ALL TAB */}
      {activeTab === "PENDING_CLINICS" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {loading ? (
            <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, textAlign: "center", color: COLORS.muted }}>
              Chargement des demandes d'homologation...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, textAlign: "center" }}>
              <UserCheck size={40} color={COLORS.teal} style={{ margin: "0 auto 12px auto" }} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: COLORS.navy, margin: 0 }}>
                Aucune clinique privée en attente d'homologation
              </h3>
              <p style={{ fontSize: "0.88rem", color: COLORS.muted, marginTop: "6px" }}>
                Toutes les demandes de création de clinique privée dans la Wilaya {inspectorWilaya || ""} ont été traitées.
              </p>
            </div>
          ) : (
            filteredRequests.map((req, idx) => {
              const reqCode = `#REQ-CLINIC-${String(idx + 1).padStart(3, "0")}`;
              const docName = `Dr. ${req.users?.first_name || ""} ${req.users?.last_name || ""}`.trim();

              return (
                <div
                  key={req.id}
                  style={{
                    backgroundColor: "white",
                    borderRadius: "18px",
                    border: "1.5px solid #FDE68A",
                    boxShadow: "0 4px 20px rgba(180, 83, 9, 0.05)",
                    padding: "24px"
                  }}
                >
                  {/* CARD HEADER */}
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: "14px", marginBottom: "18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "0.88rem", fontWeight: "900", color: COLORS.navy, backgroundColor: COLORS.bgLight, padding: "4px 10px", borderRadius: "8px", border: `1px solid ${COLORS.border}` }}>
                        {reqCode}
                      </span>
                      <span style={{ fontSize: "0.8rem", color: COLORS.muted }}>
                        Demandé le {req.created_at ? formatDateTime(req.created_at) : "Date non spécifiée"}
                      </span>
                    </div>

                    <span style={{ fontSize: "0.78rem", fontWeight: "800", padding: "4px 12px", borderRadius: "8px", backgroundColor: "#fefce8", color: "#854d0e", border: "1px solid #fef08a" }}>
                      En attente d'homologation
                    </span>
                  </div>

                  {/* DUAL COLUMN: CLINIC INFO & DOCTOR INFO */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }} className="md:grid-cols-2">
                    
                    {/* LEFT COLUMN: CLINIC INFORMATION */}
                    <div style={{ backgroundColor: COLORS.bgLight, padding: "16px 20px", borderRadius: "14px", border: `1px solid ${COLORS.border}` }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: "900", color: COLORS.navy, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Building2 size={16} /> Clinique Privée Proposée
                      </div>

                      <div style={{ fontSize: "1.2rem", fontWeight: "900", color: COLORS.navy }}>
                        {req.clinic_name}
                      </div>

                      <div style={{ fontSize: "0.85rem", fontWeight: "700", color: COLORS.teal, marginTop: "2px" }}>
                        Type: {req.facility_type || "Clinique privée"}
                      </div>

                      <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.82rem", color: COLORS.text }}>
                        <div>Wilaya: <strong>{req.wilaya}</strong></div>
                        <div>Adresse: <strong>{req.address || "Adresse non renseignée"}</strong></div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: DOCTOR APPLICANT */}
                    <div style={{ backgroundColor: COLORS.bgLight, padding: "16px 20px", borderRadius: "14px", border: `1px solid ${COLORS.border}` }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: "900", color: COLORS.teal, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Stethoscope size={16} /> Médecin Demandeur
                      </div>

                      <div style={{ fontSize: "1.1rem", fontWeight: "900", color: COLORS.navy }}>
                        {docName}
                      </div>

                      <div style={{ fontSize: "0.85rem", fontWeight: "700", color: COLORS.teal, marginTop: "2px" }}>
                        Spécialité: {req.specialty}
                      </div>

                      <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.82rem", color: COLORS.text }}>
                        <div>NIN: <strong>{req.nin}</strong></div>
                        <div>Email: <strong>{req.users?.email || "Non renseigné"}</strong></div>
                        <div>Téléphone: <strong>{req.phone}</strong></div>
                        <div style={{ marginTop: "4px", backgroundColor: "white", padding: "6px 10px", borderRadius: "8px", border: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                          N° Ordre des Médecins: <strong>{req.order_number || "Non fourni"}</strong>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* REVIEW ACTION BUTTONS */}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px", paddingTop: "16px", borderTop: `1px solid ${COLORS.border}` }}>
                    <button
                      onClick={() => setRejectingRequest(req)}
                      disabled={processingAction}
                      style={{
                        backgroundColor: "#fef2f2",
                        color: "#991b1b",
                        border: "1px solid #fecaca",
                        padding: "10px 20px",
                        borderRadius: "10px",
                        fontWeight: "700",
                        fontSize: "0.88rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <X size={16} /> Refuser
                    </button>

                    <button
                      onClick={() => handleApproveRequest(req)}
                      disabled={processingAction}
                      style={{
                        backgroundColor: COLORS.teal,
                        color: "white",
                        border: "none",
                        padding: "10px 24px",
                        borderRadius: "10px",
                        fontWeight: "800",
                        fontSize: "0.88rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 4px 14px rgba(15, 162, 155, 0.3)"
                      }}
                    >
                      <Check size={16} /> Accepter & Homologuer
                    </button>
                  </div>

                </div>
              );
            })
          )}
        </div>
      ) : (
        /* STANDARD FACILITIES LIST */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
          {loading ? (
            <div style={{ gridColumn: "1 / -1", backgroundColor: "white", padding: "40px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, textAlign: "center", color: COLORS.muted }}>
              Chargement des établissements de la Wilaya {inspectorWilaya}...
            </div>
          ) : filteredFacilities.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", backgroundColor: "white", padding: "40px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, textAlign: "center" }}>
              <Building2 size={40} color={COLORS.muted} style={{ margin: "0 auto 12px auto" }} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: COLORS.navy, margin: 0 }}>
                Aucun établissement trouvé
              </h3>
              <p style={{ fontSize: "0.88rem", color: COLORS.muted, marginTop: "6px" }}>
                Modifiez vos critères de recherche pour afficher des résultats.
              </p>
            </div>
          ) : (
            filteredFacilities.map((fac) => {
              const isPrivate = isPrivateClinic(fac.facility_type);

              return (
                <div
                  key={fac.id}
                  style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    border: `1px solid ${COLORS.border}`,
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "16px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.02)"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                      <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: isPrivate ? COLORS.lightTeal : "#E0F2FE", color: isPrivate ? COLORS.teal : "#0369A1" }}>
                        <Building2 size={20} />
                      </div>

                      <span style={{ fontSize: "0.78rem", fontWeight: "800", padding: "4px 10px", borderRadius: "8px", backgroundColor: isPrivate ? COLORS.lightTeal : "#F1F5F9", color: isPrivate ? COLORS.teal : COLORS.navy }}>
                        {fac.facility_type}
                      </span>
                    </div>

                    <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: COLORS.navy, marginTop: "14px", marginBottom: "4px" }}>
                      {fac.name}
                    </h3>

                    <div style={{ fontSize: "0.83rem", color: COLORS.muted, display: "flex", alignItems: "center", gap: "6px" }}>
                      <MapPin size={14} />
                      <span>{fac.address || fac.wilaya}</span>
                    </div>
                  </div>

                  <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: "16px", fontSize: "0.82rem", color: COLORS.navy }}>
                      <div>
                        <strong>{fac.doctorCount}</strong> <span style={{ color: COLORS.muted }}>Médecins</span>
                      </div>
                      <div>
                        <strong>{fac.eventCount}</strong> <span style={{ color: COLORS.muted }}>Événements</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleViewFacility(fac)}
                      style={{
                        backgroundColor: COLORS.bgLight,
                        color: COLORS.navy,
                        border: `1px solid ${COLORS.border}`,
                        padding: "6px 12px",
                        borderRadius: "8px",
                        fontSize: "0.82rem",
                        fontWeight: "700",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <Eye size={14} /> Détails
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* FACILITY DETAILS MODAL */}
      {selectedFacility && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(6, 44, 84, 0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 50 }}>
          <div style={{ backgroundColor: "white", borderRadius: "20px", width: "100%", maxWidth: "600px", padding: "24px", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: "12px" }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "900", color: COLORS.navy, margin: 0 }}>
                  {selectedFacility.name}
                </h3>
                <span style={{ fontSize: "0.82rem", color: COLORS.teal, fontWeight: "700" }}>
                  {selectedFacility.facility_type} — Wilaya {selectedFacility.wilaya}
                </span>
              </div>
              <button onClick={() => setSelectedFacility(null)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.muted }}>
                <X size={20} />
              </button>
            </div>

            {loadingDetails ? (
              <div style={{ padding: "30px", textAlign: "center", color: COLORS.muted }}>Chargement des détails...</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                
                {/* Doctor List */}
                <div>
                  <h4 style={{ fontSize: "0.9rem", fontWeight: "800", color: COLORS.navy, marginBottom: "10px" }}>
                    Praticiens Rattachés ({facilityDoctors.length})
                  </h4>
                  {facilityDoctors.length === 0 ? (
                    <div style={{ fontSize: "0.85rem", color: COLORS.muted }}>Aucun médecin actuellement rattaché.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {facilityDoctors.map((doc) => (
                        <div key={doc.id} style={{ backgroundColor: COLORS.bgLight, padding: "10px 14px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: "700", fontSize: "0.88rem", color: COLORS.navy }}>Dr. {doc.users?.first_name} {doc.users?.last_name}</div>
                            <div style={{ fontSize: "0.78rem", color: COLORS.muted }}>{doc.specialty} • NIN: {doc.nin}</div>
                          </div>
                          <span style={{ fontSize: "0.75rem", fontWeight: "800", padding: "2px 8px", borderRadius: "6px", backgroundColor: doc.status === "ACCEPTED" ? "#dcfce7" : "#fef3c7", color: doc.status === "ACCEPTED" ? "#166534" : "#b45309" }}>
                            {doc.status || "ACCEPTED"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Health Events */}
                <div>
                  <h4 style={{ fontSize: "0.9rem", fontWeight: "800", color: COLORS.navy, marginBottom: "10px" }}>
                    Derniers Signalaments Sanitaires ({facilityEvents.length})
                  </h4>
                  {facilityEvents.length === 0 ? (
                    <div style={{ fontSize: "0.85rem", color: COLORS.muted }}>Aucun signalement enregistré pour cet établissement.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {facilityEvents.map((ev) => (
                        <div key={ev.id} style={{ backgroundColor: COLORS.bgLight, padding: "10px 14px", borderRadius: "10px", border: `1px solid ${COLORS.border}` }}>
                          <div style={{ fontWeight: "700", fontSize: "0.88rem", color: COLORS.navy }}>{ev.reportable_diseases?.name || "Maladie"}</div>
                          <div style={{ fontSize: "0.78rem", color: COLORS.muted }}>{ev.created_at ? formatDateTime(ev.created_at) : ""} • Gravité: {ev.severity}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      {rejectingRequest && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(6, 44, 84, 0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 50 }}>
          <div style={{ backgroundColor: "white", borderRadius: "20px", width: "100%", maxWidth: "480px", padding: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "900", color: "#991b1b", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertTriangle size={20} /> Refuser l'homologation
              </h3>
              <button onClick={() => setRejectingRequest(null)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.muted }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: "0.88rem", color: COLORS.text, marginBottom: "14px" }}>
              Vous êtes sur le point de refuser l'homologation de la clinique privée <strong>{rejectingRequest.clinic_name}</strong> (Wilaya {rejectingRequest.wilaya}).
            </p>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "700", color: COLORS.navy, marginBottom: "6px" }}>
                Motif du refus *
              </label>
              <textarea
                placeholder="Précisez le motif administratif ou technique du refus..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${COLORS.border}`, fontSize: "0.88rem", outline: "none" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setRejectingRequest(null)}
                disabled={processingAction}
                style={{ backgroundColor: COLORS.bgLight, color: COLORS.navy, border: `1px solid ${COLORS.border}`, padding: "10px 16px", borderRadius: "10px", fontWeight: "700", cursor: "pointer" }}
              >
                Annuler
              </button>

              <button
                onClick={handleConfirmReject}
                disabled={processingAction}
                style={{ backgroundColor: "#991b1b", color: "white", border: "none", padding: "10px 20px", borderRadius: "10px", fontWeight: "700", cursor: "pointer" }}
              >
                {processingAction ? "Traitement..." : "Confirmer le refus"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
