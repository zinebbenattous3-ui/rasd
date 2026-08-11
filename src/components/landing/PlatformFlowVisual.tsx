import React from "react";
import { Stethoscope, CheckCircle, Search, AlertOctagon, FileCheck } from "lucide-react";

const COLORS = {
  navy: "#062C54",
  teal: "#0fa29b",
  lightTeal: "#e6f5f4",
  text: "#2d3748",
  muted: "#718096",
  border: "#e2e8f0",
};

const lifecycleSteps = [
  {
    step: "01",
    label: "SIGNALEMENT",
    title: "Saisie clinique",
    desc: "Le médecin saisit les symptômes, la date et le NIN du patient.",
    icon: Stethoscope,
    color: "#0284C7",
  },
  {
    step: "02",
    label: "VÉRIFICATION",
    title: "Contrôle d'unicité",
    desc: "Vérification NIN et consolidation au niveau de l'établissement.",
    icon: CheckCircle,
    color: "#0fa29b",
  },
  {
    step: "03",
    label: "ANALYSE",
    title: "Évaluation Wilaya",
    desc: "Cartographie et agrégation géographique par type de pathologie.",
    icon: Search,
    color: "#D97706",
  },
  {
    step: "04",
    label: "ALERTE",
    title: "Notification direct",
    desc: "Remontée instantanée aux autorités pour les cas graves ou critiques.",
    icon: AlertOctagon,
    color: "#DC2626",
  },
  {
    step: "05",
    label: "SUIVI & CLÔTURE",
    title: "Historique tracé",
    desc: "Mise à jour des interventions jusqu'à la résolution du signalement.",
    icon: FileCheck,
    color: "#062C54",
  },
];

export function PlatformFlowVisual() {
  return (
    <section style={{ padding: "5rem 1.5rem", backgroundColor: "#ffffff", borderBottom: `1px solid ${COLORS.border}` }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Section Header */}
        <div style={{ textAlign: "center", maxWidth: "760px", margin: "0 auto 4rem auto" }}>
          <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: "999px", backgroundColor: COLORS.lightTeal, color: COLORS.teal, fontSize: "0.78rem", fontWeight: "800", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "1rem" }}>
            CYCLE DE VIE D'UN ÉVÉNEMENT SANITAIRE
          </div>
          <h2 style={{ fontSize: "2.25rem", fontWeight: "800", color: COLORS.navy, marginBottom: "1rem", letterSpacing: "-0.02em" }}>
            Une traçabilité intégrale du signalement à la résolution
          </h2>
          <p style={{ fontSize: "1.05rem", color: COLORS.muted, lineHeight: "1.6" }}>
            Chaque déclaration enregistrée sur RASED traverse un processus rigoureux de vérification et d'analyse garantissant la fiabilité des décisions de santé publique.
          </p>
        </div>

        {/* Pipeline Container */}
        <div 
          style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
            gap: "1.25rem",
            position: "relative"
          }}
        >
          {lifecycleSteps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                style={{
                  backgroundColor: "#F8FAFC",
                  borderRadius: "18px",
                  padding: "1.5rem 1.25rem",
                  border: `1.5px solid ${COLORS.border}`,
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.02)",
                  transition: "all 0.2s ease"
                }}
              >
                {/* Step badge */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: "1rem" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "12px", backgroundColor: "white", border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={20} color={item.color} />
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "800", color: item.color, backgroundColor: `${item.color}12`, padding: "4px 8px", borderRadius: "6px" }}>
                    {item.label}
                  </span>
                </div>

                <h4 style={{ fontSize: "1rem", fontWeight: "800", color: COLORS.navy, marginBottom: "6px" }}>
                  {item.title}
                </h4>
                <p style={{ fontSize: "0.85rem", color: COLORS.text, lineHeight: "1.5", margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
