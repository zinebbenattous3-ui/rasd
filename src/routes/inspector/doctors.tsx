import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { validateCurrentSession } from "@/lib/auth";
import { normalizeWilayaCode } from "@/lib/wilayas";
import { formatDateTime } from "@/lib/utils";
import { isPrivateClinic } from "@/lib/facilities";
import { UnifiedSelect } from "@/components/ui/UnifiedSelect";
import { 
  Stethoscope, 
  Search, 
  Filter, 
  Building2, 
  Eye, 
  RefreshCw, 
  Lock, 
  MapPin, 
  X, 
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  UserCheck,
  Check,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";

export const Route = createFileRoute("/inspector/doctors")({
  head: () => ({
    meta: [
      { title: "Effectifs Médicaux & Validation — Inspectorat Rased" },
    ],
  }),
  component: InspectorDoctorsPage,
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

export function InspectorDoctorsPage() {
  const [loading, setLoading] = useState(true);
  const [inspectorWilaya, setInspectorWilaya] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"ACCEPTED" | "PENDING">("ACCEPTED");

  // Action states
  const [processingAction, setProcessingAction] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Rejection modal
  const [rejectingDoc, setRejectingDoc] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("ALL");
  const [facilityFilter, setFacilityFilter] = useState("ALL");

  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const [appliedSpecialtyFilter, setAppliedSpecialtyFilter] = useState("ALL");
  const [appliedFacilityFilter, setAppliedFacilityFilter] = useState("ALL");

  // Selected Doctor Profile Modal
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const authResult = await validateCurrentSession(["INSPECTOR"]);
      if (!authResult.authorized || !authResult.user) return;

      // 1. Fetch Inspector's Wilaya
      const { data: inspRec } = await supabase
        .from("inspectors")
        .select("wilaya")
        .eq("user_id", authResult.user.id)
        .maybeSingle();

      if (inspRec?.wilaya) {
        setInspectorWilaya(inspRec.wilaya);
        const normCode = normalizeWilayaCode(inspRec.wilaya);

        // 2. Fetch Facilities in Inspector's Wilaya strictly
        const { data: facsData } = await supabase
          .from("facilities")
          .select("*")
          .ilike("wilaya", `%${normCode}%`)
          .order("name");

        const facList = facsData || [];
        setFacilities(facList);

        const facIds = facList.map(f => f.id);

        let docsData: any[] = [];
        if (facIds.length > 0) {
          // Fetch Doctors in those facilities
          const { data: fetchDocs } = await supabase
            .from("doctors")
            .select(`
              *,
              users:user_id (id, first_name, last_name, email),
              facility:facility_id (id, name, facility_type, wilaya, address)
            `)
            .in("facility_id", facIds)
            .order("created_at", { ascending: false });

          docsData = fetchDocs || [];
        }

        // 3. Fetch Unlisted Private Clinic Requests for this Wilaya
        let formattedUnlisted: any[] = [];
        try {
          const { data: unlistedReqs } = await supabase
            .from("unlisted_clinic_requests")
            .select(`
              *,
              users:user_id (id, first_name, last_name, email)
            `)
            .ilike("wilaya", `%${normCode}%`)
            .order("created_at", { ascending: false });

          if (unlistedReqs) {
            formattedUnlisted = unlistedReqs.map((u) => ({
              id: u.id,
              is_unlisted_clinic_req: true,
              status: u.status === 'APPROVED' ? 'ACCEPTED' : u.status,
              created_at: u.created_at,
              specialty: u.specialty,
              nin: u.nin,
              phone: u.phone,
              order_number: u.order_number,
              user_id: u.user_id,
              users: u.users ? {
                id: u.users.id,
                first_name: u.users.first_name,
                last_name: u.users.last_name,
                email: u.users.email
              } : null,
              facility: {
                id: null,
                name: u.clinic_name,
                facility_type: u.facility_type || 'Clinique privée',
                wilaya: u.wilaya,
                address: u.address || 'Adresse non renseignée'
              },
              raw: u
            }));
          }
        } catch (unlistedErr) {
          console.warn("unlisted_clinic_requests query error:", unlistedErr);
        }

        // Merge standard doctor records and unlisted clinic doctor requests
        const combined = [...formattedUnlisted, ...docsData].sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );

        setDoctors(combined);
      }
    } catch (err) {
      console.error("Error loading doctors for inspector:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Accept Doctor Request
  const handleAcceptDoctor = async (doc: any) => {
    setProcessingAction(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const authResult = await validateCurrentSession(["INSPECTOR"]);

      if (doc.is_unlisted_clinic_req) {
        const raw = doc.raw;

        // 1. Create or retrieve existing private clinic facility
        let facilityId: string | null = null;
        const { data: existingFac } = await supabase
          .from("facilities")
          .select("id")
          .eq("name", raw.clinic_name.trim())
          .eq("facility_type", "Clinique privée")
          .maybeSingle();

        if (existingFac) {
          facilityId = existingFac.id;
        } else {
          const { data: newFac, error: facErr } = await supabase
            .from("facilities")
            .insert([{
              name: raw.clinic_name.trim(),
              facility_type: "Clinique privée",
              wilaya: raw.wilaya,
              address: raw.address || "Adresse non renseignée",
              created_by: authResult.user?.id
            }])
            .select("id")
            .single();

          if (facErr || !newFac) throw new Error("Erreur lors de l'enregistrement de la clinique privée.");
          facilityId = newFac.id;
        }

        // 2. Link or create doctor record
        const userId = raw.user_id;
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
              nin: raw.nin,
              specialty: raw.specialty,
              facility_id: facilityId,
              order_number: raw.order_number,
              phone: raw.phone,
              status: "ACCEPTED",
              verified_by_facility: facilityId,
              verified_at: new Date().toISOString()
            }]);

          if (docErr) throw new Error(docErr.message || "Erreur lors du rattachement du médecin.");
        } else {
          await supabase
            .from("doctors")
            .update({
              facility_id: facilityId,
              order_number: raw.order_number,
              status: "ACCEPTED",
              verified_by_facility: facilityId,
              verified_at: new Date().toISOString()
            })
            .eq("id", existingDoc.id);
        }

        // 3. Mark unlisted clinic request as APPROVED
        await supabase
          .from("unlisted_clinic_requests")
          .update({
            status: "APPROVED",
            reviewed_by: authResult.user?.id,
            reviewed_at: new Date().toISOString()
          })
          .eq("id", raw.id);

        const docName = doc.users ? `Dr. ${doc.users.first_name} ${doc.users.last_name}` : "Médecin";
        setActionSuccess(`La demande de ${docName} et l'homologation de "${raw.clinic_name}" ont été validées.`);
      } else {
        // Standard doctor record update
        const { error } = await supabase
          .from("doctors")
          .update({
            status: "ACCEPTED",
            verified_at: new Date().toISOString()
          })
          .eq("id", doc.id);

        if (error) throw error;
        setActionSuccess(`Le médecin Dr. ${doc.users?.first_name || ""} ${doc.users?.last_name || ""} a été validé.`);
      }

      await loadData();
    } catch (err: any) {
      setActionError(err.message || "Erreur lors de la validation du médecin.");
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle Reject Doctor Request
  const handleConfirmReject = async () => {
    if (!rejectingDoc) return;
    setProcessingAction(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const authResult = await validateCurrentSession(["INSPECTOR"]);

      if (rejectingDoc.is_unlisted_clinic_req) {
        const { error } = await supabase
          .from("unlisted_clinic_requests")
          .update({
            status: "REJECTED",
            reviewed_by: authResult.user?.id,
            reviewed_at: new Date().toISOString(),
            rejection_reason: rejectReason
          })
          .eq("id", rejectingDoc.id);

        if (error) throw error;
        setActionSuccess("La demande de clinique privée et du médecin a été refusée.");
      } else {
        const { error } = await supabase
          .from("doctors")
          .update({
            status: "REJECTED"
          })
          .eq("id", rejectingDoc.id);

        if (error) throw error;
        setActionSuccess("La demande d'inscription du médecin a été refusée.");
      }

      setRejectingDoc(null);
      setRejectReason("");
      await loadData();
    } catch (err: any) {
      setActionError(err.message || "Erreur lors du refus.");
    } finally {
      setProcessingAction(false);
    }
  };

  // Filter Action Handlers
  const handleApplyFilters = () => {
    setAppliedSearchQuery(searchQuery);
    setAppliedSpecialtyFilter(specialtyFilter);
    setAppliedFacilityFilter(facilityFilter);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSpecialtyFilter("ALL");
    setFacilityFilter("ALL");
    setAppliedSearchQuery("");
    setAppliedSpecialtyFilter("ALL");
    setAppliedFacilityFilter("ALL");
  };

  // Specialties Options extraction
  const specialties = Array.from(
    new Set(doctors.map(d => d.specialty).filter(Boolean))
  );

  // Filtered Doctors list split by active tab (ACCEPTED vs PENDING)
  const tabFilteredDoctors = doctors.filter((doc) => {
    if (activeTab === "PENDING") {
      return doc.status === "PENDING";
    }
    return doc.status === "ACCEPTED" || doc.status === "APPROVED" || !doc.status;
  });

  const filteredDoctors = tabFilteredDoctors.filter((doc) => {
    const firstName = doc.users?.first_name || "";
    const lastName = doc.users?.last_name || "";
    const email = doc.users?.email || "";
    const fullName = `${firstName} ${lastName}`.toLowerCase();

    const matchesSearch = 
      fullName.includes(appliedSearchQuery.toLowerCase()) ||
      email.toLowerCase().includes(appliedSearchQuery.toLowerCase()) ||
      (doc.nin && doc.nin.includes(appliedSearchQuery)) ||
      (doc.order_number && doc.order_number.toLowerCase().includes(appliedSearchQuery.toLowerCase())) ||
      (doc.facility?.name && doc.facility.name.toLowerCase().includes(appliedSearchQuery.toLowerCase()));

    const matchesSpecialty = 
      appliedSpecialtyFilter === "ALL" || doc.specialty === appliedSpecialtyFilter;

    const matchesFacility = 
      appliedFacilityFilter === "ALL" || doc.facility_id === appliedFacilityFilter;

    return matchesSearch && matchesSpecialty && matchesFacility;
  });

  const pendingCount = doctors.filter(d => d.status === "PENDING").length;
  const acceptedCount = doctors.filter(d => d.status === "ACCEPTED" || d.status === "APPROVED" || !d.status).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", backgroundColor: "white", padding: "24px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
              <Stethoscope size={22} />
            </div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "900", color: COLORS.navy, margin: 0, letterSpacing: "-0.02em" }}>
              Effectifs Médicaux & Inscriptions
            </h1>
          </div>
          <p style={{ fontSize: "0.88rem", color: COLORS.muted, margin: 0 }}>
            Revue et contrôle des praticiens de santé exerçant dans la Wilaya {inspectorWilaya || "—"}.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* WILAYA SCOPE LOCKED BADGE */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#FEF3C7", color: "#B45309", border: "1px solid #FDE68A", padding: "8px 14px", borderRadius: "12px", fontSize: "0.85rem", fontWeight: "800" }}>
            <MapPin size={16} />
            <span>Wilaya {inspectorWilaya || "—"}</span>
            <Lock size={12} style={{ marginLeft: "2px" }} />
          </div>

          <button onClick={loadData} disabled={loading} style={{ background: "white", border: `1px solid ${COLORS.border}`, padding: "10px", borderRadius: "12px", cursor: "pointer", color: COLORS.navy }}>
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
          onClick={() => setActiveTab("ACCEPTED")}
          style={{
            padding: "10px 18px",
            borderRadius: "10px",
            border: "none",
            backgroundColor: activeTab === "ACCEPTED" ? COLORS.navy : "transparent",
            color: activeTab === "ACCEPTED" ? "white" : COLORS.muted,
            fontWeight: "700",
            fontSize: "0.9rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <UserCheck size={16} />
          Médecins Validés ({acceptedCount})
        </button>

        <button
          onClick={() => setActiveTab("PENDING")}
          style={{
            padding: "10px 18px",
            borderRadius: "10px",
            border: "none",
            backgroundColor: activeTab === "PENDING" ? "#B45309" : "#FEF3C7",
            color: activeTab === "PENDING" ? "white" : "#B45309",
            fontWeight: "700",
            fontSize: "0.9rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <Clock size={16} />
          Demandes de validation ({pendingCount})
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
              placeholder="Rechercher par nom, email, NIN, N° d'ordre..."
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

          {/* Unified Select for Specialty */}
          <div style={{ width: "200px" }}>
            <UnifiedSelect
              icon={Stethoscope}
              value={specialtyFilter}
              onChange={(val) => setSpecialtyFilter(val)}
              options={[
                { value: "ALL", label: "Toutes spécialités" },
                ...specialties.map((s) => ({ value: s, label: s }))
              ]}
            />
          </div>

          {/* Unified Select for Facility */}
          <div style={{ width: "220px" }}>
            <UnifiedSelect
              icon={Building2}
              value={facilityFilter}
              onChange={(val) => setFacilityFilter(val)}
              options={[
                { value: "ALL", label: "Tous les établissements" },
                ...facilities.map((f) => ({ value: f.id, label: f.name, sublabel: f.facility_type }))
              ]}
            />
          </div>
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
          
          {(appliedSearchQuery || appliedSpecialtyFilter !== "ALL" || appliedFacilityFilter !== "ALL") && (
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

      {/* DOCTORS TABLE / LIST */}
      <div style={{ backgroundColor: "white", borderRadius: "16px", border: `1px solid ${COLORS.border}`, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.02)" }}>
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: COLORS.navy }}>
            <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 12px auto", color: COLORS.teal }} />
            <div style={{ fontWeight: "700", fontSize: "1.05rem" }}>Chargement des fiches médecins...</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead style={{ backgroundColor: "#F8FAFC", borderBottom: `1px solid ${COLORS.border}` }}>
                <tr>
                  <th style={{ padding: "14px 20px", color: COLORS.navy, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "800" }}>Médecin</th>
                  <th style={{ padding: "14px 20px", color: COLORS.navy, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "800" }}>Spécialité & NIN</th>
                  <th style={{ padding: "14px 20px", color: COLORS.navy, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "800" }}>Établissement / Clinique</th>
                  <th style={{ padding: "14px 20px", color: COLORS.navy, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "800" }}>N° Ordre</th>
                  <th style={{ padding: "14px 20px", color: COLORS.navy, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "800" }}>Statut</th>
                  <th style={{ padding: "14px 20px", color: COLORS.navy, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "800", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors.map((doc, idx) => {
                  const firstName = doc.users?.first_name || "";
                  const lastName = doc.users?.last_name || "";
                  const fullName = `Dr. ${firstName} ${lastName}`.trim() || "Médecin";
                  const email = doc.users?.email || "Email non disponible";
                  const isUnlistedReq = doc.is_unlisted_clinic_req;

                  return (
                    <tr
                      key={doc.id}
                      style={{
                        borderBottom: idx !== filteredDoctors.length - 1 ? `1px solid ${COLORS.border}` : "none",
                        transition: "background-color 0.1s"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      {/* Doctor Name & Contact */}
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{ width: "38px", height: "38px", borderRadius: "10px", backgroundColor: COLORS.lightTeal, color: COLORS.teal, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "0.95rem" }}>
                            {firstName ? firstName.charAt(0).toUpperCase() : "D"}
                          </div>
                          <div>
                            <div style={{ fontWeight: "800", color: COLORS.navy, fontSize: "0.95rem" }}>{fullName}</div>
                            <div style={{ fontSize: "0.8rem", color: COLORS.muted, marginTop: "2px" }}>{email} • {doc.phone || "Tél non renseigné"}</div>
                          </div>
                        </div>
                      </td>

                      {/* Specialty & NIN */}
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ fontWeight: "700", color: COLORS.navy, fontSize: "0.9rem" }}>{doc.specialty}</div>
                        <div style={{ fontSize: "0.78rem", color: COLORS.muted, marginTop: "2px" }}>NIN: {doc.nin}</div>
                      </td>

                      {/* Facility */}
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ fontWeight: "700", color: COLORS.navy, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px" }}>
                          <Building2 size={15} color={COLORS.teal} />
                          <span>{doc.facility?.name || "Clinique non répertoriée"}</span>
                        </div>
                        <div style={{ fontSize: "0.78rem", color: COLORS.muted, marginTop: "2px" }}>
                          {doc.facility?.facility_type || "Clinique privée"} {isUnlistedReq ? "(Demande d'homologation)" : ""}
                        </div>
                      </td>

                      {/* N° Ordre */}
                      <td style={{ padding: "16px 20px", fontSize: "0.88rem", fontWeight: "700", color: COLORS.navy }}>
                        {doc.order_number || <span style={{ color: COLORS.muted, fontWeight: "400" }}>—</span>}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "16px 20px" }}>
                        {doc.status === "PENDING" ? (
                          <span style={{ backgroundColor: "#FEF3C7", color: "#B45309", padding: "4px 10px", borderRadius: "8px", fontSize: "0.8rem", fontWeight: "800", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Clock size={14} /> En attente
                          </span>
                        ) : (
                          <span style={{ backgroundColor: "#DCFCE7", color: "#15803D", padding: "4px 10px", borderRadius: "8px", fontSize: "0.8rem", fontWeight: "800", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <CheckCircle2 size={14} /> Validé
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "16px 20px", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                          {doc.status === "PENDING" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAcceptDoctor(doc)}
                                disabled={processingAction}
                                style={{
                                  backgroundColor: COLORS.teal,
                                  color: "white",
                                  border: "none",
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
                                <Check size={14} /> Valider
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectingDoc(doc)}
                                disabled={processingAction}
                                style={{
                                  backgroundColor: "#FEF2F2",
                                  color: "#DC2626",
                                  border: "1px solid #FCA5A5",
                                  padding: "6px 10px",
                                  borderRadius: "8px",
                                  fontSize: "0.82rem",
                                  fontWeight: "700",
                                  cursor: "pointer"
                                }}
                              >
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedDoctor(doc)}
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
                              <Eye size={14} /> Profil
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredDoctors.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "40px 20px", color: COLORS.muted }}>
                      <div style={{ fontSize: "1rem", fontWeight: "700", color: COLORS.navy }}>Aucun médecin trouvé</div>
                      <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>Ajustez vos critères de recherche.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DOCTOR PROFILE MODAL */}
      {selectedDoctor && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(6, 44, 84, 0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 50 }}>
          <div style={{ backgroundColor: "white", borderRadius: "20px", width: "100%", maxWidth: "520px", padding: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: "12px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "900", color: COLORS.navy, margin: 0 }}>
                Profil Médecin
              </h3>
              <button onClick={() => setSelectedDoctor(null)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.muted }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.9rem", color: COLORS.navy }}>
              <div><strong>Nom complet:</strong> Dr. {selectedDoctor.users?.first_name} {selectedDoctor.users?.last_name}</div>
              <div><strong>Email:</strong> {selectedDoctor.users?.email}</div>
              <div><strong>Spécialité:</strong> {selectedDoctor.specialty}</div>
              <div><strong>NIN:</strong> {selectedDoctor.nin}</div>
              <div><strong>N° Ordre des Médecins:</strong> {selectedDoctor.order_number || "Non renseigné"}</div>
              <div><strong>Établissement rattaché:</strong> {selectedDoctor.facility?.name} ({selectedDoctor.facility?.facility_type})</div>
              <div><strong>Wilaya:</strong> {selectedDoctor.facility?.wilaya}</div>
              <div><strong>Téléphone:</strong> {selectedDoctor.phone}</div>
            </div>

            <div style={{ marginTop: "20px", textAlign: "right" }}>
              <button onClick={() => setSelectedDoctor(null)} style={{ backgroundColor: COLORS.navy, color: "white", border: "none", padding: "10px 20px", borderRadius: "10px", fontWeight: "700", cursor: "pointer" }}>
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      {rejectingDoc && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(6, 44, 84, 0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 50 }}>
          <div style={{ backgroundColor: "white", borderRadius: "20px", width: "100%", maxWidth: "480px", padding: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "900", color: "#991b1b", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertTriangle size={20} /> Refuser l'inscription
              </h3>
              <button onClick={() => setRejectingDoc(null)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.muted }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: "0.88rem", color: COLORS.text, marginBottom: "14px" }}>
              Spécifiez le motif de refus de l'inscription pour <strong>Dr. {rejectingDoc.users?.first_name} {rejectingDoc.users?.last_name}</strong>.
            </p>

            <div style={{ marginBottom: "16px" }}>
              <textarea
                placeholder="Motif du refus..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${COLORS.border}`, fontSize: "0.88rem", outline: "none" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setRejectingDoc(null)}
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
