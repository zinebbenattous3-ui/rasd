import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/utils";
import { validateCurrentSession } from "@/lib/auth";
import { normalizeWilayaCode } from "@/lib/wilayas";
import { isPrivateClinic } from "@/lib/facilities";
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
  UserCheck
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
  const [pendingClinicDoctors, setPendingClinicDoctors] = useState<any[]>([]);

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

            const { count: pendingDocCount } = await supabase
              .from("doctors")
              .select("id", { count: "exact", head: true })
              .eq("facility_id", fac.id)
              .eq("status", "PENDING");

            return {
              ...fac,
              doctorCount: docCount || 0,
              eventCount: evCount || 0,
              hasPending: (pendingDocCount || 0) > 0,
            };
          })
        );

        setFacilities(enriched);

        // 3. Fetch Doctors pending verification for Private Clinics in Inspector's Wilaya
        const facIds = facList.map(f => f.id);
        if (facIds.length > 0) {
          const { data: pendingDocs } = await supabase
            .from("doctors")
            .select(`
              *,
              users:user_id (first_name, last_name, email),
              facility:facility_id (id, name, facility_type, wilaya, address)
            `)
            .in("facility_id", facIds)
            .eq("status", "PENDING")
            .order("created_at", { ascending: false });

          setPendingClinicDoctors(pendingDocs || []);
        } else {
          setPendingClinicDoctors([]);
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

    if (activeTab === "PENDING_CLINICS") {
      return matchesSearch && isPrivateClinic(fac.facility_type) && fac.hasPending;
    }

    return matchesSearch && matchesType;
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
          Cliniques à vérifier ({pendingClinicDoctors.filter(d => isPrivateClinic(d.facility?.facility_type)).length})
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
              placeholder="Rechercher un établissement..."
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

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: "9px 14px",
              borderRadius: "10px",
              border: `1px solid ${COLORS.border}`,
              fontSize: "0.9rem",
              backgroundColor: "white",
              color: COLORS.navy,
              outline: "none",
              cursor: "pointer"
            }}
          >
            <option value="ALL">Tous les types (CHU, EPH, EPSP, Clinique)</option>
            <option value="CHU">CHU — Centre Hosp. Univ.</option>
            <option value="EPH">EPH — Établissement Public Hosp.</option>
            <option value="EPSP">EPSP — Santé de Proximité</option>
            <option value="Clinique privée">Clinique privée</option>
          </select>
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
                color: COLORS.muted,
                border: `1px solid ${COLORS.border}`,
                padding: "9px 12px",
                borderRadius: "10px",
                fontWeight: "600",
                fontSize: "0.85rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <RotateCcw size={14} /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* PENDING CLINICS REVIEW TAB VIEW */}
      {activeTab === "PENDING_CLINICS" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {pendingClinicDoctors.length === 0 ? (
            <div style={{ backgroundColor: "white", borderRadius: "16px", border: `1px solid ${COLORS.border}`, padding: "40px 20px", textAlign: "center" }}>
              <CheckCircle2 size={40} color={COLORS.teal} style={{ margin: "0 auto 12px auto" }} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: COLORS.navy, margin: 0 }}>
                Aucune demande de clinique privée en attente
              </h3>
              <p style={{ fontSize: "0.88rem", color: COLORS.muted, marginTop: "6px" }}>
                Toutes les cliniques privées et rattachements de votre Wilaya sont à jour.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
              {pendingClinicDoctors.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    border: `1px solid #FDE68A`,
                    boxShadow: "0 4px 14px rgba(180, 83, 9, 0.05)",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "14px"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                      <span style={{ backgroundColor: "#FEF3C7", color: "#B45309", fontSize: "0.75rem", fontWeight: "800", padding: "4px 10px", borderRadius: "8px", border: "1px solid #FDE68A" }}>
                        Clinique privée à vérifier
                      </span>
                      <span style={{ fontSize: "0.78rem", color: COLORS.muted }}>
                        {doc.created_at ? formatDateTime(doc.created_at) : "Date inconnue"}
                      </span>
                    </div>

                    <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: COLORS.navy, margin: "0 0 4px 0" }}>
                      {doc.facility?.name || "Clinique privée"}
                    </h3>
                    <div style={{ fontSize: "0.82rem", color: COLORS.muted, display: "flex", alignItems: "center", gap: "4px" }}>
                      <MapPin size={14} color={COLORS.teal} />
                      {doc.facility?.address || doc.facility?.wilaya || "Adresse non spécifiée"}
                    </div>

                    <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: `1px solid ${COLORS.border}` }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: "800", color: COLORS.navy, textTransform: "uppercase", marginBottom: "6px" }}>
                        Médecin demandeur
                      </div>
                      <div style={{ fontSize: "0.95rem", fontWeight: "800", color: COLORS.navy }}>
                        Dr. {doc.users?.first_name} {doc.users?.last_name}
                      </div>
                      <div style={{ fontSize: "0.82rem", color: COLORS.teal, fontWeight: "700" }}>
                        {doc.specialty}
                      </div>
                      {doc.order_number && (
                        <div style={{ fontSize: "0.78rem", color: COLORS.muted, marginTop: "2px" }}>
                          N° d'ordre: <strong>{doc.order_number}</strong>
                        </div>
                      )}
                      {doc.nin && (
                        <div style={{ fontSize: "0.78rem", color: COLORS.muted }}>
                          NIN: <strong>{doc.nin}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  <Link
                    to="/inspector/requests"
                    style={{
                      backgroundColor: COLORS.navy,
                      color: "white",
                      textAlign: "center",
                      padding: "10px",
                      borderRadius: "10px",
                      fontWeight: "700",
                      fontSize: "0.85rem",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px"
                    }}
                  >
                    <FileCheck size={16} /> Examiner dans les Demandes
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* FACILITIES MAIN GRID VIEW */
        <div style={{ backgroundColor: "white", borderRadius: "18px", border: `1px solid ${COLORS.border}`, padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: COLORS.muted }}>
              Chargement des établissements de la Wilaya...
            </div>
          ) : filteredFacilities.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: COLORS.muted }}>
              Aucun établissement correspondant aux critères de recherche.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
              {filteredFacilities.map((fac) => {
                const isPrivate = isPrivateClinic(fac.facility_type);

                return (
                  <div
                    key={fac.id}
                    style={{
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: "16px",
                      padding: "20px",
                      backgroundColor: COLORS.bgLight,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "16px",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: "800",
                            padding: "4px 10px",
                            borderRadius: "8px",
                            backgroundColor: isPrivate ? "#f0fdfa" : COLORS.lightTeal,
                            color: isPrivate ? "#0fa29b" : COLORS.navy,
                            border: `1px solid ${isPrivate ? "rgba(15,162,155,0.3)" : COLORS.border}`
                          }}
                        >
                          {fac.facility_type || "Établissement"}
                        </span>

                        <span style={{ fontSize: "0.78rem", color: COLORS.muted, fontWeight: "600" }}>
                          Wilaya {fac.wilaya}
                        </span>
                      </div>

                      <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: COLORS.navy, margin: "0 0 6px 0" }}>
                        {fac.name}
                      </h3>

                      <p style={{ fontSize: "0.82rem", color: COLORS.muted, margin: 0, display: "flex", alignItems: "center", gap: "4px" }}>
                        <MapPin size={14} color={COLORS.teal} />
                        {fac.address || "Adresse non renseignée"}
                      </p>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "16px", paddingTop: "14px", borderTop: `1px solid ${COLORS.border}` }}>
                        <div style={{ backgroundColor: "white", padding: "10px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, textAlign: "center" }}>
                          <div style={{ fontSize: "1.2rem", fontWeight: "900", color: COLORS.navy }}>{fac.doctorCount}</div>
                          <div style={{ fontSize: "0.72rem", color: COLORS.muted, fontWeight: "700", textTransform: "uppercase" }}>Praticiens</div>
                        </div>

                        <div style={{ backgroundColor: "white", padding: "10px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, textAlign: "center" }}>
                          <div style={{ fontSize: "1.2rem", fontWeight: "900", color: fac.eventCount > 0 ? "#DC2626" : COLORS.navy }}>{fac.eventCount}</div>
                          <div style={{ fontSize: "0.72rem", color: COLORS.muted, fontWeight: "700", textTransform: "uppercase" }}>Signalements</div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleViewFacility(fac)}
                      style={{
                        backgroundColor: "white",
                        border: `1.5px solid ${COLORS.navy}`,
                        color: COLORS.navy,
                        padding: "10px",
                        borderRadius: "10px",
                        fontWeight: "700",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px"
                      }}
                    >
                      <Eye size={16} /> Fiche Détillée Établissement
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* FACILITY DETAIL MODAL */}
      {selectedFacility && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(6, 44, 84, 0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 50 }}>
          <div style={{ backgroundColor: "white", borderRadius: "20px", width: "100%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto", padding: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: "800", color: COLORS.teal, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {selectedFacility.facility_type} • Wilaya {selectedFacility.wilaya}
                </span>
                <h2 style={{ fontSize: "1.4rem", fontWeight: "900", color: COLORS.navy, margin: "4px 0 0 0" }}>
                  {selectedFacility.name}
                </h2>
                <div style={{ fontSize: "0.85rem", color: COLORS.muted, marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <MapPin size={14} color={COLORS.teal} />
                  {selectedFacility.address || "Adresse non renseignée"}
                </div>
              </div>

              <button onClick={() => setSelectedFacility(null)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.muted }}>
                <X size={20} />
              </button>
            </div>

            {loadingDetails ? (
              <div style={{ padding: "30px", textAlign: "center", color: COLORS.muted }}>
                Chargement des détails de l'établissement...
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                
                {/* Doctors Attached */}
                <div style={{ backgroundColor: COLORS.bgLight, padding: "16px", borderRadius: "12px", border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: "0.88rem", fontWeight: "800", color: COLORS.navy, marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Stethoscope size={16} color={COLORS.teal} />
                    Corps Médical Rattaché ({facilityDoctors.length})
                  </div>

                  {facilityDoctors.length === 0 ? (
                    <div style={{ fontSize: "0.82rem", color: COLORS.muted }}>
                      Aucun praticien actuellement enregistré dans cet établissement.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {facilityDoctors.map((doc) => (
                        <div key={doc.id} style={{ backgroundColor: "white", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: "700", color: COLORS.navy, fontSize: "0.88rem" }}>
                              Dr. {doc.users?.first_name} {doc.users?.last_name}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: COLORS.muted }}>
                              {doc.specialty} {doc.order_number ? `• N° Ordre: ${doc.order_number}` : ""}
                            </div>
                          </div>
                          <span style={{ fontSize: "0.72rem", fontWeight: "800", padding: "2px 8px", borderRadius: "6px", backgroundColor: doc.status === "ACCEPTED" ? "#f0fdf4" : "#fefce8", color: doc.status === "ACCEPTED" ? "#166534" : "#854d0e" }}>
                            {doc.status === "ACCEPTED" ? "Validé" : "En attente"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Health Events */}
                <div style={{ backgroundColor: COLORS.bgLight, padding: "16px", borderRadius: "12px", border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: "0.88rem", fontWeight: "800", color: COLORS.navy, marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Activity size={16} color="#DC2626" />
                    Derniers Signalements Sanitaires ({facilityEvents.length})
                  </div>

                  {facilityEvents.length === 0 ? (
                    <div style={{ fontSize: "0.82rem", color: COLORS.muted }}>
                      Aucun événement de santé signalé par cet établissement.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {facilityEvents.map((ev) => (
                        <div key={ev.id} style={{ backgroundColor: "white", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: "700", color: COLORS.navy, fontSize: "0.85rem" }}>
                              {ev.reportable_diseases?.name || "Maladie signalée"}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: COLORS.muted }}>
                              {formatDateTime(ev.created_at)}
                            </div>
                          </div>
                          <span style={{ fontSize: "0.72rem", fontWeight: "800", padding: "2px 8px", borderRadius: "6px", backgroundColor: ev.severity === "CRITICAL" ? "#fef2f2" : "#fffbeb", color: ev.severity === "CRITICAL" ? "#991b1b" : "#92400e" }}>
                            {ev.severity}
                          </span>
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

    </div>
  );
}
