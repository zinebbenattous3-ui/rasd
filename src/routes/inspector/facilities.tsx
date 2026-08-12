import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { validateCurrentSession } from "@/lib/auth";
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
  ChevronRight, 
  ArrowLeft, 
  Clock, 
  Layers, 
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

export const Route = createFileRoute("/inspector/facilities")({
  head: () => ({
    meta: [
      { title: "Annuaire des Établissements — Inspectorat Rased" },
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
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

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

        // 2. Fetch Facilities strictly matching Inspector's Wilaya
        const { data: facsData } = await supabase
          .from("facilities")
          .select("*")
          .eq("wilaya", inspRec.wilaya)
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

  // Open Facility Detail View
  const handleOpenDetails = async (fac: any) => {
    setSelectedFacility(fac);
    setLoadingDetails(true);
    try {
      // Load doctors in this facility
      const { data: docs } = await supabase
        .from("doctors")
        .select(`
          *,
          users:user_id (first_name, last_name, email)
        `)
        .eq("facility_id", fac.id);

      setFacilityDoctors(docs || []);

      // Load events in this facility
      const { data: evs } = await supabase
        .from("health_events")
        .select(`
          *,
          reportable_diseases:reportable_disease_id(name)
        `)
        .eq("facility_id", fac.id)
        .order("created_at", { ascending: false });

      setFacilityEvents(evs || []);
    } catch (err) {
      console.error("Error loading facility details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Filter facilities
  const filteredFacilities = facilities.filter((fac) => {
    const matchesSearch = 
      fac.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fac.address && fac.address.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === "ALL" || fac.facility_type === typeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: "900", color: COLORS.navy, letterSpacing: "-0.02em", margin: 0 }}>
            🏥 Annuaire des Établissements
          </h1>
          <p style={{ color: COLORS.muted, fontSize: "0.92rem", marginTop: "4px" }}>
            Consultation et surveillance des structures de santé enregistrées dans votre territoire.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ backgroundColor: "white", padding: "10px 16px", borderRadius: "14px", border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: "8px" }}>
            <MapPin size={16} color={COLORS.teal} />
            <span style={{ fontSize: "0.88rem", fontWeight: "800", color: COLORS.navy }}>Wilaya {inspectorWilaya || "—"}</span>
            <span style={{ fontSize: "0.72rem", backgroundColor: "#FEF3C7", color: "#B45309", padding: "2px 6px", borderRadius: "6px", fontWeight: "700", display: "flex", alignItems: "center", gap: "2px" }}>
              <Lock size={10} /> Restreint
            </span>
          </div>

          <button onClick={loadFacilities} disabled={loading} style={{ background: "white", border: `1px solid ${COLORS.border}`, padding: "10px", borderRadius: "14px", cursor: "pointer", color: COLORS.navy }}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div style={{ backgroundColor: "white", padding: "18px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
        
        {/* Search */}
        <div style={{ flex: 1, minWidth: "240px", position: "relative" }}>
          <Search size={16} color={COLORS.muted} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Rechercher par nom d'établissement, adresse..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px 10px 40px",
              borderRadius: "12px",
              border: `1px solid ${COLORS.border}`,
              fontSize: "0.88rem",
              outline: "none",
              backgroundColor: COLORS.bgLight
            }}
          />
        </div>

        {/* Facility Type Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Filter size={16} color={COLORS.teal} />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: "12px",
              border: `1px solid ${COLORS.border}`,
              fontSize: "0.88rem",
              outline: "none",
              backgroundColor: COLORS.bgLight,
              color: COLORS.navy,
              fontWeight: "600"
            }}
          >
            <option value="ALL">Tous les types d'établissements</option>
            <option value="HOSPITAL">Hôpital / CHU</option>
            <option value="CLINIC">Clinique privée</option>
            <option value="POLYCLINIC">Polyclinique / EPH</option>
            <option value="HEALTH_CENTER">Centre de Santé</option>
          </select>
        </div>

        <div style={{ fontSize: "0.82rem", color: COLORS.muted, fontWeight: "700", marginLeft: "auto" }}>
          {filteredFacilities.length} structure(s) trouvée(s)
        </div>
      </div>

      {/* FACILITIES GRID */}
      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: COLORS.navy }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 12px auto", color: COLORS.teal }} />
          <div style={{ fontWeight: "700" }}>Chargement des établissements de la Wilaya {inspectorWilaya}...</div>
        </div>
      ) : filteredFacilities.length === 0 ? (
        <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, textAlign: "center", color: COLORS.muted }}>
          <Building2 size={40} color={COLORS.muted} style={{ margin: "0 auto 12px auto" }} />
          <div style={{ fontSize: "1rem", fontWeight: "700", color: COLORS.navy }}>Aucun établissement trouvé</div>
          <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>Ajustez vos filtres ou effectuez une autre recherche.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
          {filteredFacilities.map((fac) => (
            <div
              key={fac.id}
              style={{
                backgroundColor: "white",
                borderRadius: "18px",
                border: `1px solid ${COLORS.border}`,
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "16px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                transition: "all 0.15s ease"
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ padding: "10px", borderRadius: "12px", backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "1.05rem", fontWeight: "800", color: COLORS.navy, margin: 0 }}>
                        {fac.name}
                      </h3>
                      <span style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "600" }}>
                        Type: {fac.facility_type || "Hôpital"}
                      </span>
                    </div>
                  </div>

                  <span style={{ backgroundColor: "#ECFDF5", color: "#047857", fontSize: "0.72rem", fontWeight: "800", padding: "3px 8px", borderRadius: "999px" }}>
                    Actif
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: COLORS.muted, marginBottom: "14px" }}>
                  <MapPin size={14} color={COLORS.teal} />
                  <span>Wilaya {fac.wilaya || inspectorWilaya}</span>
                  {fac.address && <span>• {fac.address}</span>}
                </div>

                {/* COUNTERS */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", backgroundColor: COLORS.bgLight, padding: "12px", borderRadius: "12px", border: `1px solid ${COLORS.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Stethoscope size={16} color="#0284C7" />
                    <div>
                      <div style={{ fontSize: "0.7rem", color: COLORS.muted, fontWeight: "700" }}>MÉDECINS</div>
                      <div style={{ fontSize: "0.95rem", fontWeight: "800", color: COLORS.navy }}>{fac.doctorCount}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Activity size={16} color="#DC2626" />
                    <div>
                      <div style={{ fontSize: "0.7rem", color: COLORS.muted, fontWeight: "700" }}>ÉVÉNEMENTS</div>
                      <div style={{ fontSize: "0.95rem", fontWeight: "800", color: COLORS.navy }}>{fac.eventCount}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${COLORS.border}`, paddingTop: "12px" }}>
                <span style={{ fontSize: "0.75rem", color: COLORS.muted, display: "flex", alignItems: "center", gap: "4px" }}>
                  <Lock size={12} /> Lecture seule
                </span>

                <button
                  onClick={() => handleOpenDetails(fac)}
                  style={{
                    backgroundColor: COLORS.navy,
                    color: "white",
                    border: "none",
                    padding: "8px 14px",
                    borderRadius: "10px",
                    fontWeight: "700",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <Eye size={14} /> Voir détails
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FACILITY DETAIL MODAL */}
      {selectedFacility && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(6,44,84,0.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(4px)" }}>
          <div style={{ backgroundColor: "white", borderRadius: "20px", maxWidth: "800px", width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            
            {/* MODAL HEADER */}
            <div style={{ padding: "20px 24px", backgroundColor: COLORS.navy, color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: COLORS.teal, fontWeight: "800", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Building2 size={14} /> Fiche Établissement de Santé • Wilaya {selectedFacility.wilaya}
                </div>
                <h2 style={{ fontSize: "1.4rem", fontWeight: "900", margin: "4px 0 0 0", color: "white" }}>
                  {selectedFacility.name}
                </h2>
              </div>

              <button onClick={() => setSelectedFacility(null)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>
                <X size={24} />
              </button>
            </div>

            {/* MODAL CONTENT */}
            <div style={{ padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
              
              {/* READ-ONLY BANNER */}
              <div style={{ backgroundColor: "#F1F5F9", border: `1px solid ${COLORS.border}`, padding: "10px 14px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.82rem" }}>
                <span style={{ fontWeight: "700", color: COLORS.navy, display: "flex", alignItems: "center", gap: "6px" }}>
                  <Lock size={14} color="#B45309" /> Document de consultation d'inspection régionale (Lecture Seule)
                </span>
                <span style={{ color: COLORS.muted }}>ID: #{selectedFacility.id.substring(0, 8)}</span>
              </div>

              {/* STATS OVERVIEW */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                <div style={{ backgroundColor: COLORS.bgLight, padding: "14px", borderRadius: "12px", border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "700" }}>TYPE D'ÉTABLISSEMENT</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: "800", color: COLORS.navy, marginTop: "2px" }}>{selectedFacility.facility_type || "Hôpital"}</div>
                </div>

                <div style={{ backgroundColor: COLORS.bgLight, padding: "14px", borderRadius: "12px", border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "700" }}>EFFECTIF MÉDECINS</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: "800", color: COLORS.teal, marginTop: "2px" }}>{facilityDoctors.length} rattaché(s)</div>
                </div>

                <div style={{ backgroundColor: COLORS.bgLight, padding: "14px", borderRadius: "12px", border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "700" }}>HISTORIQUE ÉVÉNEMENTS</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#DC2626", marginTop: "2px" }}>{facilityEvents.length} signalement(s)</div>
                </div>
              </div>

              {/* DOCTORS IN FACILITY */}
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: "800", color: COLORS.navy, marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Stethoscope size={16} color={COLORS.teal} /> Médecins rattachés à cet établissement
                </h3>

                {facilityDoctors.length === 0 ? (
                  <div style={{ fontSize: "0.85rem", color: COLORS.muted, fontStyle: "italic" }}>
                    Aucun médecin répertorié dans cette structure.
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
                    {facilityDoctors.map((doc) => (
                      <div key={doc.id} style={{ padding: "10px 14px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, backgroundColor: "white" }}>
                        <div style={{ fontWeight: "800", fontSize: "0.88rem", color: COLORS.navy }}>
                          Dr. {doc.users?.first_name || ""} {doc.users?.last_name || "Anonyme"}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: COLORS.teal, fontWeight: "600" }}>
                          Spécialité: {doc.specialty || "Médecine Générale"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* HEALTH EVENTS IN FACILITY */}
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: "800", color: COLORS.navy, marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Activity size={16} color="#DC2626" /> Historique des événements de santé signalés
                </h3>

                {facilityEvents.length === 0 ? (
                  <div style={{ fontSize: "0.85rem", color: COLORS.muted, fontStyle: "italic" }}>
                    Aucun événement de santé enregistré pour cet établissement.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {facilityEvents.slice(0, 5).map((ev) => (
                      <div key={ev.id} style={{ padding: "10px 14px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bgLight, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: "800", fontSize: "0.85rem", color: COLORS.navy }}>
                            {ev.reportable_diseases?.name || "Événement de santé"}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: COLORS.muted }}>
                            Déclaré le {new Date(ev.created_at).toLocaleDateString("fr-FR")}
                          </div>
                        </div>

                        <span style={{ backgroundColor: ev.severity === "CRITICAL" ? "#FEE2E2" : COLORS.lightTeal, color: ev.severity === "CRITICAL" ? "#DC2626" : COLORS.teal, padding: "2px 8px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: "800" }}>
                          {ev.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* MODAL FOOTER */}
            <div style={{ padding: "14px 24px", borderTop: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bgLight, display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setSelectedFacility(null)}
                style={{ backgroundColor: COLORS.navy, color: "white", padding: "8px 18px", borderRadius: "10px", fontWeight: "700", border: "none", cursor: "pointer", fontSize: "0.85rem" }}
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
