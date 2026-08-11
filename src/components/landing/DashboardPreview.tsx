import React from "react";
import { Activity, AlertTriangle, Users, FileText, ChevronRight, TrendingUp } from "lucide-react";

const COLORS = {
  navy: "#062C54",
  teal: "#0fa29b",
  lightTeal: "#e6f5f4",
  text: "#2d3748",
  muted: "#718096",
  border: "#e2e8f0",
};

const pathologies = [
  { name: "COVID-19", count: 42, percent: 75, color: "#38BDF8" },
  { name: "Grippe Saisonnière", count: 28, percent: 55, color: "#0fa29b" },
  { name: "Tuberculose", count: 16, percent: 35, color: "#F59E0B" },
  { name: "Rougeole", count: 9, percent: 20, color: "#EF4444" },
];

export function DashboardPreview() {
  return (
    <section style={{ padding: "5rem 1.5rem", backgroundColor: "#F8FAFC", borderBottom: `1px solid ${COLORS.border}` }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Section Header */}
        <div style={{ textAlign: "center", maxWidth: "760px", margin: "0 auto 3.5rem auto" }}>
          <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: "999px", backgroundColor: COLORS.lightTeal, color: COLORS.teal, fontSize: "0.78rem", fontWeight: "800", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "1rem" }}>
            APERÇU DE L'INTERFACE
          </div>
          <h2 style={{ fontSize: "2.25rem", fontWeight: "800", color: COLORS.navy, marginBottom: "1rem", letterSpacing: "-0.02em" }}>
            Une vision claire de la situation sanitaire
          </h2>
          <p style={{ fontSize: "1.05rem", color: COLORS.muted, lineHeight: "1.6" }}>
            Visualisation synthétique à l'intention des décideurs de santé publique et des équipes d'intervention sur le terrain.
          </p>
        </div>

        {/* Dashboard Preview Mock Container */}
        <div 
          style={{ 
            backgroundColor: "#062C54", 
            borderRadius: "24px", 
            padding: "1.5rem", 
            boxShadow: "0 20px 50px rgba(6, 44, 84, 0.25)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "white"
          }}
        >
          {/* Top Bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#10B981", boxShadow: "0 0 8px #10B981" }} />
              <span style={{ fontSize: "0.9rem", fontWeight: "700", color: "#E2E8F0" }}>Poste de Commandement National · Live Feed</span>
            </div>
            <span style={{ fontSize: "0.78rem", color: "#94A3B8", backgroundColor: "rgba(255,255,255,0.06)", padding: "4px 10px", borderRadius: "6px" }}>
              Aperçu d'interface
            </span>
          </div>

          {/* Metric Cards Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "16px", padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#94A3B8", fontSize: "0.82rem", fontWeight: "700", marginBottom: "8px" }}>
                <span>SIGNALEMENTS</span>
                <FileText size={16} color="#38BDF8" />
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "white" }}>128</div>
              <div style={{ fontSize: "0.75rem", color: "#10B981", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                <TrendingUp size={12} /> +12% cette semaine
              </div>
            </div>

            <div style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "16px", padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#94A3B8", fontSize: "0.82rem", fontWeight: "700", marginBottom: "8px" }}>
                <span>PATIENTS INDEXÉS</span>
                <Users size={16} color="#0fa29b" />
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "white" }}>1 842</div>
              <div style={{ fontSize: "0.75rem", color: "#94A3B8", marginTop: "4px" }}>NIN vérifiés</div>
            </div>

            <div style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "16px", padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#94A3B8", fontSize: "0.82rem", fontWeight: "700", marginBottom: "8px" }}>
                <span>ALERTES DÉCLENCHÉES</span>
                <AlertTriangle size={16} color="#F59E0B" />
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "#F59E0B" }}>12</div>
              <div style={{ fontSize: "0.75rem", color: "#F59E0B", marginTop: "4px" }}>Urgence modérée / élevée</div>
            </div>
          </div>

          {/* Lower Chart & Stream */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem" }}>
            {/* Pathology Distribution Chart */}
            <div style={{ backgroundColor: "rgba(255,255,255,0.04)", borderRadius: "16px", padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: "700", color: "white", marginBottom: "1rem" }}>
                Répartition des pathologies signalées
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {pathologies.map((item) => (
                  <div key={item.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#CBD5E1", marginBottom: "4px" }}>
                      <span>{item.name}</span>
                      <span style={{ fontWeight: "700" }}>{item.count} cas</span>
                    </div>
                    <div style={{ width: "100%", height: "8px", borderRadius: "999px", backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                      <div style={{ width: `${item.percent}%`, height: "100%", backgroundColor: item.color, borderRadius: "999px" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Activity Stream */}
            <div style={{ backgroundColor: "rgba(255,255,255,0.04)", borderRadius: "16px", padding: "1.25rem", border: "1px solid rgba(255,255,255,0.08)" }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: "700", color: "white", marginBottom: "1rem" }}>
                Dernières notifications de santé
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: "10px", fontSize: "0.82rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#EF4444" }} />
                    <span style={{ color: "white", fontWeight: "600" }}>Signalement d'urgence</span>
                  </div>
                  <span style={{ color: "#94A3B8" }}>Wilaya d'Alger · Il y a 14 min</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: "10px", fontSize: "0.82rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#10B981" }} />
                    <span style={{ color: "white", fontWeight: "600" }}>Validation de dossier</span>
                  </div>
                  <span style={{ color: "#94A3B8" }}>CHU Oran · Il y a 32 min</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: "10px", fontSize: "0.82rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#38BDF8" }} />
                    <span style={{ color: "white", fontWeight: "600" }}>Mise à jour statut cas</span>
                  </div>
                  <span style={{ color: "#94A3B8" }}>DSP Constantine · Il y a 1h</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
