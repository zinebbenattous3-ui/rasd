import React from "react";
import { FileEdit, Layers, Activity, ShieldCheck } from "lucide-react";

const COLORS = {
  navy: "#062C54",
  teal: "#0fa29b",
  lightTeal: "#e6f5f4",
  text: "#2d3748",
  muted: "#718096",
  border: "#e2e8f0",
};

const steps = [
  {
    number: "01",
    icon: FileEdit,
    title: "DÉCLARER",
    subtitle: "Signalement au point de soin",
    description: "Le médecin praticien saisit l'événement sanitaire au moment du diagnostic avec le NIN du patient et un justificatif médical.",
  },
  {
    number: "02",
    icon: Layers,
    title: "STRUCTURER",
    subtitle: "Agrégation par établissement",
    description: "La plateforme regroupe et catégorise automatiquement les cas par wilaya, établissement de rattachement et niveau d'urgence.",
  },
  {
    number: "03",
    icon: Activity,
    title: "ANALYSER",
    subtitle: "Évaluation épidémiologique",
    description: "L'autorité sanitaire consulte les cartes de prévalence, valide les événements signalés et qualifie l'intensité du risque.",
  },
  {
    number: "04",
    icon: ShieldCheck,
    title: "AGIR",
    subtitle: "Réponse & suivi tracé",
    description: "Les mesures conservatoires sont déclenchées, le suivi est mis à jour en direct et chaque action est archivée jusqu'à la clôture.",
  },
];

export function ProcessTimeline() {
  return (
    <section id="fonctionnement" style={{ padding: "5rem 1.5rem", backgroundColor: "#ffffff", borderBottom: `1px solid ${COLORS.border}` }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Section Header */}
        <div style={{ textAlign: "center", maxWidth: "720px", margin: "0 auto 4rem auto" }}>
          <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: "999px", backgroundColor: COLORS.lightTeal, color: COLORS.teal, fontSize: "0.78rem", fontWeight: "800", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "1rem" }}>
            PARCOURS DE L'INFORMATION SANITAIRE
          </div>
          <h2 style={{ fontSize: "2.25rem", fontWeight: "800", color: COLORS.navy, marginBottom: "1rem", letterSpacing: "-0.02em" }}>
            Une seule chaîne. De la déclaration à la décision.
          </h2>
          <p style={{ fontSize: "1.05rem", color: COLORS.muted, lineHeight: "1.6" }}>
            RASED structure le parcours d'un événement sanitaire depuis son premier signalement clinique jusqu'à son analyse épidémiologique et son suivi national.
          </p>
        </div>

        {/* 4-Step Process Horizontal Grid */}
        <div 
          style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", 
            gap: "2rem",
            position: "relative"
          }}
        >
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div 
                key={step.number}
                style={{
                  backgroundColor: "#F8FAFC",
                  borderRadius: "20px",
                  padding: "2rem 1.5rem",
                  border: `1px solid ${COLORS.border}`,
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  transition: "all 0.25s ease",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.02)"
                }}
              >
                {/* Step Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "14px", backgroundColor: COLORS.navy, color: COLORS.teal, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={24} />
                  </div>
                  <span style={{ fontSize: "2rem", fontWeight: "900", color: "rgba(6, 44, 84, 0.15)" }}>
                    {step.number}
                  </span>
                </div>

                {/* Step Content */}
                <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: COLORS.navy, marginBottom: "4px" }}>
                  {step.title}
                </h3>
                <div style={{ fontSize: "0.82rem", fontWeight: "700", color: COLORS.teal, marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {step.subtitle}
                </div>
                <p style={{ fontSize: "0.92rem", color: COLORS.text, lineHeight: "1.55", margin: 0 }}>
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
