import React from "react";
import { ShieldCheck, Lock, Key, FileCheck, Server, EyeOff } from "lucide-react";

const COLORS = {
  navy: "#062C54",
  teal: "#0fa29b",
  lightTeal: "#e6f5f4",
  text: "#2d3748",
  muted: "#718096",
  border: "#e2e8f0",
};

const securityFeatures = [
  {
    icon: Lock,
    title: "Contrôle d'Accès par Rôle (RBAC)",
    desc: "Chaque utilisateur accède exclusivement aux données strictement requises par ses prérogatives réglementaires.",
  },
  {
    icon: FileCheck,
    title: "Traçabilité & Historique d'Audit",
    desc: "L'ensemble des déclarations, modifications et validations sont enregistrées de façon immuable pour audit.",
  },
  {
    icon: Key,
    title: "Session Unique & Authentification",
    desc: "Gestion rigoureuse des sessions d'authentification pour éviter les connexions simultanées non autorisées.",
  },
  {
    icon: Server,
    title: "Cloisonnement des Espaces",
    desc: "Isolation stricte entre les interfaces des praticiens, des établissements et des autorités de santé.",
  },
  {
    icon: EyeOff,
    title: "Protection des Identifiants Patients",
    desc: "Recherche et indexation basées sur le NIN national avec accès restreint aux praticiens habilités.",
  },
  {
    icon: ShieldCheck,
    title: "Conformité Santé Publique",
    desc: "Architecture conçue selon les exigences de sécurité et de confidentialité du Ministère de la Santé.",
  },
];

export function SecuritySection() {
  return (
    <section id="securite" style={{ padding: "5rem 1.5rem", backgroundColor: "#062C54", color: "white", position: "relative", overflow: "hidden" }}>
      {/* Background Radial Glow */}
      <div 
        style={{ 
          position: "absolute", 
          top: "-50%", 
          right: "-10%", 
          width: "600px", 
          height: "600px", 
          borderRadius: "50%", 
          background: "radial-gradient(circle, rgba(15, 162, 155, 0.15) 0%, rgba(6, 44, 84, 0) 70%)",
          pointerEvents: "none"
        }} 
      />

      <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 1 }}>
        {/* Section Header */}
        <div style={{ textAlign: "center", maxWidth: "780px", margin: "0 auto 4rem auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 16px", borderRadius: "999px", backgroundColor: "rgba(15, 162, 155, 0.2)", color: "#38BDF8", fontSize: "0.78rem", fontWeight: "800", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "1rem" }}>
            <ShieldCheck size={16} /> SÉCURITÉ & CONFIDENTIALITÉ
          </div>
          <h2 style={{ fontSize: "2.25rem", fontWeight: "800", color: "white", marginBottom: "1rem", letterSpacing: "-0.02em" }}>
            Une plateforme pensée pour les données sensibles
          </h2>
          <p style={{ fontSize: "1.05rem", color: "#94A3B8", lineHeight: "1.6" }}>
            RASED est conçue autour de contrôles d'accès stricts et de principes de sécurité adaptés aux exigences de la santé publique nationale.
          </p>
        </div>

        {/* Security Features Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.75rem" }}>
          {securityFeatures.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "20px",
                  padding: "1.75rem",
                  backdropFilter: "blur(10px)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem"
                }}
              >
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", backgroundColor: "rgba(15, 162, 155, 0.2)", color: "#38BDF8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "white", marginBottom: "6px" }}>
                    {feat.title}
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: "#94A3B8", lineHeight: "1.55", margin: 0 }}>
                    {feat.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
