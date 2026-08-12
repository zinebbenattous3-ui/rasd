import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Algeria69WilayaMap } from "@/components/Algeria69WilayaMap";
import { ALGERIA_WILAYAS_69, getWilayaByCode, Wilaya } from "@/lib/wilayas";
import { getPublicHealthMapData, PublicHealthMapResponse, PublicWilayaStats } from "@/lib/publicHealthMap";
import { MapPin, Search, CheckCircle2, Info, ArrowLeft, RefreshCw, ShieldCheck, Activity, Building2, AlertTriangle, FileText } from "lucide-react";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Carte Observatoire 69 Wilayas — Rased — Réseau National de Veille Sanitaire" },
      {
        name: "description",
        content:
          "Carte interactive observatoire des 69 wilayas d'Algérie basées sur les événements de santé enregistrés Rased.",
      },
      { property: "og:title", content: "Carte Observatoire des 69 Wilayas — Rased" },
      {
        property: "og:description",
        content: "Visualisation en temps réel des statistiques sanitaires agrégées sur la carte des 69 wilayas d'Algérie.",
      },
    ],
  }),
  component: MapPage,
});

export function MapPage() {
  const [selectedWilayaCode, setSelectedWilayaCode] = useState<string>("16"); // Default to 16 Alger
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [mapData, setMapData] = useState<PublicHealthMapResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      const res = await getPublicHealthMapData();
      if (isMounted) {
        setMapData(res);
        setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedWilaya: Wilaya | undefined = getWilayaByCode(selectedWilayaCode);
  const selectedStats: PublicWilayaStats | undefined = mapData?.stats ? mapData.stats[selectedWilayaCode] : undefined;

  const filteredWilayas = ALGERIA_WILAYAS_69.filter((w) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      w.code.includes(query) ||
      w.name.toLowerCase().includes(query) ||
      w.nameAr.includes(query)
    );
  });

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#f8fafc", fontFamily: "sans-serif" }}>
      <Navbar />

      <main style={{ flex: 1, padding: "2.5rem 1rem", maxWidth: "1280px", margin: "0 auto", width: "100%" }}>
        {/* HEADER BREADCRUMB & TITLE */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.75rem" }}>
            <Link
              to="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.85rem",
                color: "#64748B",
                textDecoration: "none",
                fontWeight: "600",
              }}
            >
              <ArrowLeft size={14} /> Accueil
            </Link>
            <span style={{ color: "#CBD5E1" }}>/</span>
            <span style={{ fontSize: "0.85rem", color: "#0fa29b", fontWeight: "700" }}>Observatoire 69 Wilayas</span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#E0F2FE", color: "#0369A1", padding: "4px 12px", borderRadius: "999px", fontSize: "0.78rem", fontWeight: "800", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                <MapPin size={14} /> Données Réelles de Santé Publique RASED
              </div>
              <h1 style={{ fontSize: "2.2rem", fontWeight: "900", color: "#062C54", letterSpacing: "-0.02em", margin: 0 }}>
                Carte Observatoire des 69 Wilayas d'Algérie
              </h1>
              <p style={{ color: "#64748B", fontSize: "1rem", marginTop: "0.4rem", maxWidth: "700px" }}>
                Visualisez les événements de santé agrégés enregistrés par les établissements sanitaires à travers le territoire national.
              </p>
            </div>

            {/* LIVE DB METRICS SUMMARY CARDS */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: "#FFFFFF", padding: "10px 16px", borderRadius: "14px", border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <Activity size={22} color="#10B981" />
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#64748B", fontWeight: "700", textTransform: "uppercase" }}>Événements Enregistrés</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: "900", color: "#062C54" }}>
                    {isLoading ? "..." : mapData?.totalEvents || 0}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: "#FFFFFF", padding: "10px 16px", borderRadius: "14px", border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <Building2 size={22} color="#0fa29b" />
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#64748B", fontWeight: "700", textTransform: "uppercase" }}>Établissements</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: "900", color: "#062C54" }}>
                    {isLoading ? "..." : mapData?.totalFacilities || 0}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: "#FFFFFF", padding: "10px 16px", borderRadius: "14px", border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <ShieldCheck size={22} color="#0369A1" />
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#64748B", fontWeight: "700", textTransform: "uppercase" }}>Structure</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: "900", color: "#062C54" }}>69 Wilayas</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN INTERACTIVE WORKSPACE */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }} className="lg:grid-cols-3">
          {/* MAP DISPLAY PANEL (2 COLS ON LARGE) */}
          <div
            className="lg:col-span-2"
            style={{
              backgroundColor: "#062C54",
              borderRadius: "24px",
              padding: "1.5rem",
              boxShadow: "0 20px 40px rgba(6, 44, 84, 0.15)",
              border: "1px solid rgba(15, 162, 155, 0.3)",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              minHeight: "540px",
            }}
          >
            {/* Map Header Legend & Actions */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", color: "white", gap: "10px" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#38BDF8", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#38BDF8", boxShadow: "0 0 10px #38BDF8" }} />
                Cliquez ou survolez une wilaya pour explorer ses statistiques
              </div>

              {/* Dynamic Map Legend */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.75rem", background: "rgba(255,255,255,0.08)", padding: "4px 12px", borderRadius: "999px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: "#10B981" }} />
                  <span>Cas Déclarés</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: "rgba(6, 44, 84, 0.75)", border: "1px solid rgba(255,255,255,0.3)" }} />
                  <span>0 Événement</span>
                </div>
              </div>
            </div>

            {/* Interactive SVG Map */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", minHeight: "440px" }}>
              <Algeria69WilayaMap
                selectedWilaya={selectedWilayaCode}
                onWilayaSelect={(w) => setSelectedWilayaCode(w.code)}
                stats={mapData?.stats}
                style={{ height: "100%", width: "100%", maxHeight: "550px" }}
              />
            </div>
          </div>

          {/* DETAILS & WILAYA SELECTOR PANEL (1 COL ON LARGE) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* SELECTED WILAYA CARD */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "20px",
                padding: "1.5rem",
                border: "1.5px solid #E2E8F0",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ fontSize: "0.75rem", fontWeight: "800", color: "#0fa29b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                Statistiques Wilaya Sélectionnée
              </div>

              {selectedWilaya ? (
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                      <span
                        style={{
                          backgroundColor: "#062C54",
                          color: "#38BDF8",
                          fontWeight: "900",
                          fontSize: "1.1rem",
                          padding: "4px 10px",
                          borderRadius: "8px",
                        }}
                      >
                        {selectedWilaya.code}
                      </span>
                      <h2 style={{ fontSize: "1.5rem", fontWeight: "900", color: "#062C54", margin: 0 }}>
                        {selectedWilaya.name}
                      </h2>
                    </div>

                    <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0fa29b", fontFamily: "system-ui, sans-serif" }}>
                      {selectedWilaya.nameAr}
                    </div>
                  </div>

                  <div style={{ fontSize: "0.8rem", color: "#64748B", marginBottom: "1rem" }}>
                    {selectedWilaya.number <= 48 ? "Wilaya Principale" : "Nouvelle Wilaya Administrée"}
                  </div>

                  {/* TOTAL WILAYA EVENT COUNT BADGE */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backgroundColor: selectedStats && selectedStats.totalEvents > 0 ? "#ECFDF5" : "#F8FAFC",
                      border: "1.5px solid",
                      borderColor: selectedStats && selectedStats.totalEvents > 0 ? "#A7F3D0" : "#E2E8F0",
                      padding: "0.85rem 1rem",
                      borderRadius: "14px",
                      marginBottom: "1rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Activity size={18} color={selectedStats && selectedStats.totalEvents > 0 ? "#059669" : "#64748B"} />
                      <span style={{ fontSize: "0.88rem", fontWeight: "700", color: "#062C54" }}>Total Événements</span>
                    </div>

                    <span
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: "900",
                        color: selectedStats && selectedStats.totalEvents > 0 ? "#059669" : "#64748B",
                      }}
                    >
                      {selectedStats?.totalEvents || 0}
                    </span>
                  </div>

                  {/* AGGREGATED DISEASE BREAKDOWN LIST */}
                  <div style={{ fontSize: "0.82rem", fontWeight: "800", color: "#062C54", marginBottom: "0.5rem" }}>
                    Répartition par Pathologie / Événement :
                  </div>

                  {selectedStats && selectedStats.diseases.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {selectedStats.diseases.map((d) => (
                        <div
                          key={d.name}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            borderRadius: "10px",
                            backgroundColor: "#F1F5F9",
                            fontSize: "0.85rem",
                          }}
                        >
                          <span style={{ fontWeight: "700", color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
                            <FileText size={14} color="#0fa29b" />
                            {d.name}
                          </span>
                          <span
                            style={{
                              backgroundColor: "#062C54",
                              color: "#FFFFFF",
                              fontSize: "0.78rem",
                              fontWeight: "800",
                              padding: "2px 8px",
                              borderRadius: "999px",
                            }}
                          >
                            {d.count} {d.count > 1 ? "cas" : "cas"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: "1rem", textAlign: "center", backgroundColor: "#F8FAFC", borderRadius: "12px", border: "1px dashed #CBD5E1" }}>
                      <CheckCircle2 size={20} color="#10B981" style={{ margin: "0 auto 4px auto", display: "block" }} />
                      <div style={{ fontSize: "0.82rem", fontWeight: "700", color: "#475569" }}>
                        Aucun événement de santé enregistré
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#94A3B8" }}>
                        Aucune déclaration active dans la base de données.
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: "2rem 1rem", textAlign: "center", color: "#94A3B8" }}>
                  <Info size={28} style={{ margin: "0 auto 8px auto", display: "block" }} />
                  <p style={{ margin: 0, fontSize: "0.9rem" }}>Cliquez sur une wilaya pour afficher ses détails.</p>
                </div>
              )}
            </div>

            {/* WILAYA SELECTOR LIST WITH LIVE EVENT BADGES */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "20px",
                padding: "1.5rem",
                border: "1.5px solid #E2E8F0",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                flex: 1,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ fontSize: "0.85rem", fontWeight: "800", color: "#062C54", marginBottom: "0.75rem" }}>
                Rechercher une Wilaya ({ALGERIA_WILAYAS_69.length})
              </div>

              {/* Search Input */}
              <div style={{ position: "relative", marginBottom: "1rem" }}>
                <Search size={16} color="#94A3B8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="text"
                  placeholder="Nom ou code (ex: 16, Oran, مسعد)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px 10px 36px",
                    borderRadius: "10px",
                    border: "1px solid #CBD5E1",
                    fontSize: "0.88rem",
                    outline: "none",
                  }}
                />
              </div>

              {/* Scrollable Wilaya List */}
              <div style={{ flex: 1, maxHeight: "240px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px", paddingRight: "4px" }}>
                {filteredWilayas.map((w) => {
                  const isSelected = selectedWilayaCode === w.code;
                  const wStat = mapData?.stats ? mapData.stats[w.code] : undefined;
                  const hasEvents = wStat && wStat.totalEvents > 0;

                  return (
                    <button
                      key={w.code}
                      onClick={() => setSelectedWilayaCode(w.code)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: "10px",
                        border: "1px solid",
                        borderColor: isSelected ? "#0fa29b" : "#F1F5F9",
                        backgroundColor: isSelected ? "#F0FDF4" : "#FFFFFF",
                        color: isSelected ? "#062C54" : "#334155",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        textAlign: "left",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            fontWeight: "800",
                            fontSize: "0.75rem",
                            backgroundColor: isSelected ? "#0fa29b" : "#E2E8F0",
                            color: isSelected ? "white" : "#475569",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            minWidth: "24px",
                            textAlign: "center",
                          }}
                        >
                          {w.code}
                        </span>
                        <span style={{ fontWeight: isSelected ? "800" : "600" }}>{w.name}</span>

                        {hasEvents && (
                          <span
                            style={{
                              backgroundColor: "#10B981",
                              color: "#FFFFFF",
                              fontWeight: "900",
                              fontSize: "0.7rem",
                              padding: "1px 6px",
                              borderRadius: "999px",
                            }}
                          >
                            {wStat.totalEvents}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: "0.8rem", color: isSelected ? "#0fa29b" : "#94A3B8", fontFamily: "system-ui, sans-serif" }}>
                        {w.nameAr}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
