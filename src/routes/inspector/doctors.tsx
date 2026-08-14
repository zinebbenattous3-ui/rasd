import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { validateCurrentSession } from "@/lib/auth";
import { normalizeWilayaCode } from "@/lib/wilayas";
import { formatDateTime } from "@/lib/utils";
import { isPrivateClinic } from "@/lib/facilities";
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
  UserCheck
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

        if (facIds.length > 0) {
          // 3. Fetch Doctors in those facilities
          const { data: docsData } = await supabase
            .from("doctors")
            .select(`
              *,
              users:user_id (first_name, last_name, email),
              facility:facility_id (id, name, facility_type, wilaya, address)
            `)
            .in("facility_id", facIds)
            .order("created_at", { ascending: false });

          setDoctors(docsData || []);
        } else {
          setDoctors([]);
        }
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
      (doc.order_number && doc.order_number.toLowerCase().includes(appliedSearchQuery.toLowerCase()));

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
              placeholder="Rechercher par nom, email, NIN ou N° d'ordre..."
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

          {/* Specialty Filter */}
          <select
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
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
            <option value="ALL">Toutes les spécialités</option>
            {specialties.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Facility Filter */}
          <select
            value={facilityFilter}
            onChange={(e) => setFacilityFilter(e.target.value)}
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
            <option value="ALL">Tous les établissements</option>
            {facilities.map(f => (
              <option key={f.id} value={f.id}>{f.name} ({f.facility_type})</option>
            ))}
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
          
          {(appliedSearchQuery || appliedSpecialtyFilter !== "ALL" || appliedFacilityFilter !== "ALL") && (
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

      {/* DOCTORS LIST VIEW */}
      <div style={{ backgroundColor: "white", borderRadius: "18px", border: `1px solid ${COLORS.border}`, padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: COLORS.muted }}>
            Chargement des praticiens de la Wilaya...
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: COLORS.muted }}>
            {activeTab === "PENDING" ? "Aucune demande de validation en attente." : "Aucun médecin ne correspond aux critères de recherche."}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
            {filteredDoctors.map((doc) => {
              const isPrivate = isPrivateClinic(doc.facility?.facility_type);
              const isPending = doc.status === "PENDING";

              return (
                <div
                  key={doc.id}
                  style={{
                    border: `1px solid ${isPending ? "#FDE68A" : COLORS.border}`,
                    borderRadius: "16px",
                    padding: "20px",
                    backgroundColor: isPending ? "#fffbeb" : COLORS.bgLight,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "14px"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: "800",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          backgroundColor: isPending ? "#FEF3C7" : COLORS.lightTeal,
                          color: isPending ? "#B45309" : COLORS.teal,
                        }}
                      >
                        {isPending ? "Attente de validation" : "Compte Validé"}
                      </span>

                      <span style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "600" }}>
                        {doc.created_at ? formatDateTime(doc.created_at) : "Inscrit"}
                      </span>
                    </div>

                    <h3 style={{ fontSize: "1.1rem", fontWeight: "900", color: COLORS.navy, margin: "0 0 4px 0" }}>
                      Dr. {doc.users?.first_name} {doc.users?.last_name}
                    </h3>
                    
                    <div style={{ fontSize: "0.85rem", color: COLORS.teal, fontWeight: "700", marginBottom: "8px" }}>
                      {doc.specialty}
                    </div>

                    <div style={{ fontSize: "0.82rem", color: COLORS.text, backgroundColor: "white", padding: "10px", borderRadius: "10px", border: `1px solid ${COLORS.border}` }}>
                      <div style={{ fontWeight: "700", color: COLORS.navy, marginBottom: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Building2 size={14} color={COLORS.teal} />
                        {doc.facility?.name || "Établissement non assigné"}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: COLORS.muted }}>
                        Type: <strong>{doc.facility?.facility_type || "N/A"}</strong> • Wilaya {doc.facility?.wilaya || inspectorWilaya}
                      </div>
                      {isPrivate && doc.order_number && (
                        <div style={{ fontSize: "0.75rem", color: COLORS.navy, marginTop: "4px", fontWeight: "700" }}>
                          N° d'ordre: {doc.order_number}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => setSelectedDoctor(doc)}
                      style={{
                        flex: 1,
                        backgroundColor: "white",
                        border: `1.5px solid ${COLORS.navy}`,
                        color: COLORS.navy,
                        padding: "8px 12px",
                        borderRadius: "10px",
                        fontWeight: "700",
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px"
                      }}
                    >
                      <Eye size={14} /> Fiche Profil
                    </button>

                    {isPending && (
                      <Link
                        to="/inspector/requests"
                        style={{
                          backgroundColor: COLORS.navy,
                          color: "white",
                          padding: "8px 12px",
                          borderRadius: "10px",
                          fontWeight: "700",
                          fontSize: "0.82rem",
                          textDecoration: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px"
                        }}
                      >
                        <FileCheck size={14} /> Examiner
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DOCTOR PROFILE MODAL */}
      {selectedDoctor && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(6, 44, 84, 0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 50 }}>
          <div style={{ backgroundColor: "white", borderRadius: "20px", width: "100%", maxWidth: "520px", padding: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: "800", color: COLORS.teal, textTransform: "uppercase" }}>
                  Profil Praticien • {selectedDoctor.status === "PENDING" ? "En attente de validation" : "Validé"}
                </span>
                <h2 style={{ fontSize: "1.35rem", fontWeight: "900", color: COLORS.navy, margin: "4px 0 0 0" }}>
                  Dr. {selectedDoctor.users?.first_name} {selectedDoctor.users?.last_name}
                </h2>
                <div style={{ fontSize: "0.85rem", color: COLORS.teal, fontWeight: "700" }}>
                  {selectedDoctor.specialty}
                </div>
              </div>

              <button onClick={() => setSelectedDoctor(null)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.muted }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", backgroundColor: COLORS.bgLight, padding: "16px", borderRadius: "14px", border: `1px solid ${COLORS.border}` }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "700", textTransform: "uppercase" }}>Email institutionnel</div>
                <div style={{ fontSize: "0.9rem", fontWeight: "700", color: COLORS.navy }}>{selectedDoctor.users?.email || "Non renseigné"}</div>
              </div>

              <div>
                <div style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "700", textTransform: "uppercase" }}>Numéro d'Identification National (NIN)</div>
                <div style={{ fontSize: "0.9rem", fontWeight: "700", color: COLORS.navy }}>{selectedDoctor.nin || "Non renseigné"}</div>
              </div>

              {selectedDoctor.order_number && (
                <div>
                  <div style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "700", textTransform: "uppercase" }}>Numéro d'ordre des médecins</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: "800", color: COLORS.navy }}>{selectedDoctor.order_number}</div>
                </div>
              )}

              <div>
                <div style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "700", textTransform: "uppercase" }}>Téléphone de contact</div>
                <div style={{ fontSize: "0.9rem", fontWeight: "700", color: COLORS.navy }}>{selectedDoctor.phone || "Non renseigné"}</div>
              </div>

              <div style={{ paddingTop: "10px", borderTop: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "700", textTransform: "uppercase" }}>Établissement d'exercice</div>
                <div style={{ fontSize: "0.92rem", fontWeight: "800", color: COLORS.navy }}>{selectedDoctor.facility?.name || "Non spécifié"}</div>
                <div style={{ fontSize: "0.78rem", color: COLORS.muted }}>{selectedDoctor.facility?.facility_type} • Wilaya {selectedDoctor.facility?.wilaya || inspectorWilaya}</div>
              </div>
            </div>

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setSelectedDoctor(null)}
                style={{
                  backgroundColor: COLORS.navy,
                  color: "white",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "0.88rem",
                  cursor: "pointer"
                }}
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
