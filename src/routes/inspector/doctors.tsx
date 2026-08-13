import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { validateCurrentSession } from "@/lib/auth";
import { normalizeWilayaCode } from "@/lib/wilayas";
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
  RotateCcw
} from "lucide-react";

export const Route = createFileRoute("/inspector/doctors")({
  head: () => ({
    meta: [
      { title: "Effectifs Médicaux & Cliniques — Inspectorat Rased" },
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

  // Filters State (Draft vs Applied)
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

        // 2. Fetch Facilities in Inspector's Wilaya
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
              facility:facility_id (id, name, facility_type, wilaya)
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

  // Filtered Doctors list
  const filteredDoctors = doctors.filter((doc) => {
    const firstName = doc.users?.first_name || "";
    const lastName = doc.users?.last_name || "";
    const email = doc.users?.email || "";
    const fullName = `${firstName} ${lastName}`.toLowerCase();

    const matchesSearch = 
      fullName.includes(appliedSearchQuery.toLowerCase()) ||
      email.toLowerCase().includes(appliedSearchQuery.toLowerCase()) ||
      (doc.nin && doc.nin.includes(appliedSearchQuery));

    const matchesSpecialty = 
      appliedSpecialtyFilter === "ALL" || doc.specialty === appliedSpecialtyFilter;

    const matchesFacility = 
      appliedFacilityFilter === "ALL" || doc.facility_id === appliedFacilityFilter;

    return matchesSearch && matchesSpecialty && matchesFacility;
  });

  // Active filter chips
  const activeChips = [];
  if (appliedSearchQuery) {
    activeChips.push({
      key: "search",
      label: `Recherche: "${appliedSearchQuery}"`,
      clear: () => { setSearchQuery(""); setAppliedSearchQuery(""); }
    });
  }
  if (appliedSpecialtyFilter !== "ALL") {
    activeChips.push({
      key: "specialty",
      label: `Spécialité: ${appliedSpecialtyFilter}`,
      clear: () => { setSpecialtyFilter("ALL"); setAppliedSpecialtyFilter("ALL"); }
    });
  }
  if (appliedFacilityFilter !== "ALL") {
    const facObj = facilities.find(f => f.id === appliedFacilityFilter);
    activeChips.push({
      key: "facility",
      label: `Établissement: ${facObj ? facObj.name : "Sélectionné"}`,
      clear: () => { setFacilityFilter("ALL"); setAppliedFacilityFilter("ALL"); }
    });
  }

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
              Effectifs Médicaux & Cliniques
            </h1>
          </div>
          <p style={{ fontSize: "0.88rem", color: COLORS.muted, margin: 0 }}>
            Consultation et annuaire des praticiens de santé exerçant dans les établissements de votre Wilaya.
          </p>
        </div>

        <button onClick={loadData} disabled={loading} style={{ background: "white", border: `1px solid ${COLORS.border}`, padding: "10px", borderRadius: "12px", cursor: "pointer", color: COLORS.navy }}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* UNIFIED RASED FILTER PANEL */}
      <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: "16px", marginBottom: "20px" }}>
          <Filter size={18} color={COLORS.teal} />
          <h2 style={{ fontSize: "1rem", fontWeight: "800", color: COLORS.navy, margin: 0 }}>
            Filtres & Critères de Recherche
          </h2>
        </div>

        {/* ACTIVE FILTER CHIPS */}
        {activeChips.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "18px", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: "700", color: COLORS.muted }}>Filtres actifs:</span>
            {activeChips.map(chip => (
              <span key={chip.key} style={{ backgroundColor: COLORS.lightTeal, color: COLORS.teal, border: `1px solid ${COLORS.teal}40`, padding: "4px 10px", borderRadius: "999px", fontSize: "0.78rem", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                {chip.label}
                <X size={14} style={{ cursor: "pointer" }} onClick={chip.clear} />
              </span>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
          
          {/* SEARCH */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
              Nom du médecin / Email
            </label>
            <div style={{ position: "relative" }}>
              <Search size={16} color={COLORS.muted} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                placeholder="Dr. Nom, prénom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", padding: "10px 14px 10px 40px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.88rem", outline: "none", backgroundColor: COLORS.bgLight }}
              />
            </div>
          </div>

          {/* SPECIALTY */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
              Spécialité médicale
            </label>
            <select
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.88rem", outline: "none", backgroundColor: COLORS.bgLight, color: COLORS.navy, fontWeight: "600" }}
            >
              <option value="ALL">Toutes les spécialités</option>
              {specialties.map((spec) => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>

          {/* FACILITY */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
              Établissement (Wilaya)
            </label>
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.88rem", outline: "none", backgroundColor: COLORS.bgLight, color: COLORS.navy, fontWeight: "600" }}
            >
              <option value="ALL">Tous les établissements</option>
              {facilities.map((fac) => (
                <option key={fac.id} value={fac.id}>{fac.name}</option>
              ))}
            </select>
          </div>

          {/* JURISDICTION WILAYA */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
              Wilaya (Verrouillée)
            </label>
            <div style={{ padding: "10px 14px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, backgroundColor: "#F1F5F9", color: COLORS.navy, fontWeight: "700", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <Lock size={15} color="#B45309" />
              <span>Wilaya {inspectorWilaya || "—"}</span>
            </div>
          </div>

        </div>

        {/* ACTION BAR */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", paddingTop: "16px", borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: "0.82rem", color: COLORS.muted, fontWeight: "700" }}>
            {filteredDoctors.length} praticien(s) trouvé(s)
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleResetFilters}
              style={{ backgroundColor: "white", border: `1px solid ${COLORS.border}`, padding: "8px 16px", borderRadius: "10px", fontSize: "0.85rem", fontWeight: "700", color: COLORS.navy, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <RotateCcw size={14} /> Réinitialiser
            </button>
            <button
              onClick={handleApplyFilters}
              style={{ backgroundColor: COLORS.navy, border: "none", padding: "8px 20px", borderRadius: "10px", fontSize: "0.85rem", fontWeight: "800", color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Filter size={14} /> Appliquer les filtres
            </button>
          </div>
        </div>
      </div>

      {/* DOCTORS GRID CARDS */}
      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: COLORS.navy }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 12px auto", color: COLORS.teal }} />
          <div style={{ fontWeight: "700" }}>Chargement de l'effectif médical...</div>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, textAlign: "center", color: COLORS.muted }}>
          <Stethoscope size={40} color={COLORS.muted} style={{ margin: "0 auto 12px auto" }} />
          <div style={{ fontSize: "1rem", fontWeight: "700", color: COLORS.navy }}>Aucun médecin trouvé</div>
          <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>Ajustez vos filtres de recherche.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "18px" }}>
          {filteredDoctors.map((doc) => {
            const firstName = doc.users?.first_name || "Praticien";
            const lastName = doc.users?.last_name || "";
            const facName = doc.facility?.name || "Non rattaché";

            return (
              <div
                key={doc.id}
                style={{
                  backgroundColor: "white",
                  borderRadius: "18px",
                  border: `1px solid ${COLORS.border}`,
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "16px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.02)",
                  transition: "all 0.2s ease"
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "12px" }}>
                    <span style={{ backgroundColor: COLORS.lightTeal, color: COLORS.teal, padding: "4px 10px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: "800" }}>
                      {doc.specialty || "Médecin Généraliste"}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "700" }}>
                      Wilaya {doc.facility?.wilaya || inspectorWilaya}
                    </span>
                  </div>

                  <h3 style={{ fontSize: "1.15rem", fontWeight: "900", color: COLORS.navy, margin: "0 0 4px 0" }}>
                    Dr. {firstName} {lastName}
                  </h3>

                  <div style={{ fontSize: "0.82rem", color: COLORS.muted, marginBottom: "10px" }}>
                    {doc.users?.email || "Email non renseigné"}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", backgroundColor: COLORS.bgLight, padding: "12px", borderRadius: "12px", border: `1px solid ${COLORS.border}`, fontSize: "0.82rem" }}>
                    <div>
                      <span style={{ color: COLORS.muted }}>Établissement: </span>
                      <strong style={{ color: COLORS.navy }}>{facName}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: "14px", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setSelectedDoctor(doc)}
                    style={{
                      backgroundColor: COLORS.navy,
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "10px",
                      fontSize: "0.8rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <Eye size={14} /> Voir profil
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DOCTOR DETAIL MODAL */}
      {selectedDoctor && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(6,44,84,0.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(4px)" }}>
          <div style={{ backgroundColor: "white", borderRadius: "20px", maxWidth: "600px", width: "100%", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "20px 24px", backgroundColor: COLORS.navy, color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: COLORS.teal, fontWeight: "800", textTransform: "uppercase" }}>
                  Fiche Praticien • Wilaya {inspectorWilaya}
                </div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: "900", margin: "4px 0 0 0", color: "white" }}>
                  Dr. {selectedDoctor.users?.first_name} {selectedDoctor.users?.last_name}
                </h2>
              </div>

              <button onClick={() => setSelectedDoctor(null)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px", fontSize: "0.9rem" }}>
              <div style={{ backgroundColor: COLORS.bgLight, padding: "14px", borderRadius: "12px", border: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", gap: "8px" }}>
                <div><strong>Spécialité:</strong> {selectedDoctor.specialty || "Médecine Générale"}</div>
                <div><strong>Établissement rattaché:</strong> {selectedDoctor.facility?.name || "Non spécifié"}</div>
                <div><strong>Téléphone:</strong> {selectedDoctor.phone || "—"}</div>
                <div><strong>Email Professionnel:</strong> {selectedDoctor.users?.email || "—"}</div>
              </div>

              <div style={{ fontSize: "0.8rem", color: COLORS.muted, display: "flex", alignItems: "center", gap: "6px" }}>
                <Lock size={14} color="#B45309" /> Les modifications de profil sont soumises à la réglementation sanitaire.
              </div>
            </div>

            <div style={{ padding: "14px 24px", borderTop: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bgLight, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setSelectedDoctor(null)} style={{ backgroundColor: COLORS.navy, color: "white", padding: "8px 18px", borderRadius: "10px", fontWeight: "700", border: "none", cursor: "pointer" }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
