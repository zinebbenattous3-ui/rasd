import React from "react";
import { Network, MapPin, Building2, Stethoscope, ShieldCheck } from "lucide-react";

const COLORS = {
  navy: "#062C54",
  teal: "#0fa29b",
  lightTeal: "#e6f5f4",
  text: "#2d3748",
  muted: "#718096",
  border: "#e2e8f0",
};

const networkNodes = [
  { id: "1", title: "Médecins Déclarants", desc: "Cabinets, polycliniques, urgences", count: "Praticiens connectés", icon: Stethoscope, color: "#0284C7" },
  { id: "2", title: "Établissements de Santé", desc: "CHU, EPH, EPSP, Cliniques", count: "Structures rattachées", icon: Building2, color: "#0fa29b" },
  { id: "3", title: "Autorités Sanitaires", desc: "Ministère, DSP de Wilayas", count: "Postes de pilotage", icon: ShieldCheck, color: "#062C54" },
];

export function NationalNetworkVisual() {
  return (
    <section style={{ padding: "5rem 1.5rem", backgroundColor: "#ffffff", borderBottom: `1px solid ${COLORS.border}` }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Section Header */}
        <div style={{ textAlign: "center", maxWidth: "760px", margin: "0 auto 4rem auto" }}>
          <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: "999px", backgroundColor: COLORS.lightTeal, color: COLORS.teal, fontSize: "0.78rem", fontWeight: "800", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "1rem" }}>
            MAILLAGE TERRITORIAL SÉCURISÉ
          </div>
          <h2 style={{ fontSize: "2.25rem", fontWeight: "800", color: COLORS.navy, marginBottom: "1rem", letterSpacing: "-0.02em" }}>
            Du cabinet médical à l'autorité sanitaire nationale
          </h2>
          <p style={{ fontSize: "1.05rem", color: COLORS.muted, lineHeight: "1.6" }}>
            Une infrastructure interconnectée assurant la continuité des flux de données entre les différents niveaux de prise en charge et de décision publique.
          </p>
        </div>

        {/* 3 Network Hub Panels */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
          {networkNodes.map((hub) => {
            const Icon = hub.icon;
            return (
              <div
                key={hub.id}
                style={{
                  backgroundColor: "#F8FAFC",
                  borderRadius: "24px",
                  padding: "2rem",
                  border: `1.5px solid ${COLORS.border}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  transition: "all 0.25s ease",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.02)"
                }}
              >
                <div style={{ width: "64px", height: "64px", borderRadius: "20px", backgroundColor: "white", border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem", boxShadow: "0 8px 20px rgba(0,0,0,0.04)" }}>
                  <Icon size={32} color={hub.color} />
                </div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "800", color: COLORS.navy, marginBottom: "6px" }}>
                  {hub.title}
                </h3>
                <p style={{ fontSize: "0.9rem", color: COLORS.muted, marginBottom: "1.25rem", lineHeight: "1.5" }}>
                  {hub.desc}
                </p>
                <span style={{ fontSize: "0.8rem", fontWeight: "700", color: hub.color, backgroundColor: "white", border: `1px solid ${COLORS.border}`, padding: "6px 14px", borderRadius: "999px" }}>
                  {hub.count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
