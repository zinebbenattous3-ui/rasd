import React from "react";
import { UserCheck, Building2, ShieldCheck, Check, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

const COLORS = {
  navy: "#062C54",
  teal: "#0fa29b",
  lightTeal: "#e6f5f4",
  text: "#2d3748",
  muted: "#718096",
  border: "#e2e8f0",
};

const roles = [
  {
    key: "doctor",
    title: "Médecin Déclarant",
    badge: "Praticien de Santé",
    tagline: "Signaler & Suivre au point de soin",
    description: "Le médecin saisit les événements sanitaires diagnostiqués, associe le Numéro d'Identification National (NIN) du patient et transmet les pièces justificatives de manière sécurisée.",
    icon: UserCheck,
    accentColor: "#0284C7",
    bgColor: "#F0F9FF",
    borderColor: "#BAE6FD",
    points: [
      "Formulaire de déclaration médicale guidé",
      "Contrôle d'unicité et de validité NIN",
      "Historique personnel et suivi du statut",
    ],
  },
  {
    key: "facility",
    title: "Établissement de Santé",
    badge: "CHU · EPH · EPSP · Polycliniques",
    tagline: "Centraliser la couverture locale",
    description: "Les structures de santé regroupent les signalements de leurs praticiens rattachés et disposent d'une vue consolidée et analytique par établissement et par wilaya.",
    icon: Building2,
    accentColor: "#0fa29b",
    bgColor: "#F0FDF4",
    borderColor: "#A7F3D0",
    points: [
      "Rattachement et gestion des praticiens",
      "Tableau de bord par établissement",
      "Suivi consolidé des pathologies signalées",
    ],
  },
  {
    key: "authority",
    title: "Autorité Sanitaire",
    badge: "Ministère · DSP Wilaya",
    tagline: "Piloter la réponse épidémiologique",
    description: "L'autorité consulte le fil d'alertes en temps réel, évalue la gravité des signalements, valide les événements et active la chaîne de décision publique.",
    icon: ShieldCheck,
    accentColor: "#062C54",
    bgColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    points: [
      "Fil d'alertes sanitaires en direct",
      "Validation et requalification des événements",
      "Cartographie de couverture par wilaya",
    ],
  },
];

export function RoleSection() {
  return (
    <section id="roles" style={{ padding: "5rem 1.5rem", backgroundColor: "#F8FAFC", borderBottom: `1px solid ${COLORS.border}` }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Section Header */}
        <div style={{ textAlign: "center", maxWidth: "760px", margin: "0 auto 4rem auto" }}>
          <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: "999px", backgroundColor: COLORS.lightTeal, color: COLORS.teal, fontSize: "0.78rem", fontWeight: "800", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "1rem" }}>
            ESPACES PROFESSIONNELS DÉDIÉS
          </div>
          <h2 style={{ fontSize: "2.25rem", fontWeight: "800", color: COLORS.navy, marginBottom: "1rem", letterSpacing: "-0.02em" }}>
            Trois rôles, une même chaîne d'information
          </h2>
          <p style={{ fontSize: "1.05rem", color: COLORS.muted, lineHeight: "1.6" }}>
            Chaque profil accède strictement aux fonctionnalités nécessaires à sa mission. Les autorisations sont portées par le compte utilisateur et sécurisent les accès.
          </p>
        </div>

        {/* 3 Distinct Role Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2rem" }}>
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <div
                key={role.key}
                style={{
                  backgroundColor: "white",
                  borderRadius: "24px",
                  padding: "2.25rem",
                  border: `1.5px solid ${COLORS.border}`,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.03)",
                  transition: "all 0.25s ease",
                  position: "relative"
                }}
              >
                <div>
                  {/* Top Badge & Icon */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                    <div style={{ width: "52px", height: "52px", borderRadius: "16px", backgroundColor: role.bgColor, border: `1px solid ${role.borderColor}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={26} color={role.accentColor} />
                    </div>
                    <span style={{ fontSize: "0.75rem", fontWeight: "800", color: COLORS.muted, backgroundColor: "#F1F5F9", padding: "5px 12px", borderRadius: "999px" }}>
                      {role.badge}
                    </span>
                  </div>

                  {/* Title & Tagline */}
                  <h3 style={{ fontSize: "1.35rem", fontWeight: "800", color: COLORS.navy, marginBottom: "4px" }}>
                    {role.title}
                  </h3>
                  <div style={{ fontSize: "0.85rem", fontWeight: "700", color: role.accentColor, marginBottom: "1rem" }}>
                    {role.tagline}
                  </div>

                  <p style={{ fontSize: "0.92rem", color: COLORS.text, lineHeight: "1.6", marginBottom: "1.5rem" }}>
                    {role.description}
                  </p>

                  {/* Feature Checklist */}
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", marginBottom: "2rem" }}>
                    {role.points.map((pt) => (
                      <li key={pt} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.88rem", color: COLORS.navy, fontWeight: "600" }}>
                        <div style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: COLORS.lightTeal, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Check size={13} color={COLORS.teal} />
                        </div>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bottom Action Link */}
                <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: "1.25rem" }}>
                  <Link
                    to="/login"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "0.9rem",
                      fontWeight: "700",
                      color: COLORS.navy,
                      textDecoration: "none"
                    }}
                  >
                    <span>Accéder à l'espace</span>
                    <ArrowRight size={16} color={COLORS.teal} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
