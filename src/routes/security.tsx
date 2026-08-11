import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ShieldCheck, FileText, ChevronRight, KeyRound, Server, UserCheck, AlertTriangle, Mail } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Sécurité & Infrastructure — RASED" },
      {
        name: "description",
        content: "Mesures et principes de sécurité régissant la plateforme RASED.",
      },
    ],
  }),
  component: SecurityPage,
});

const TOC = [
  { id: "principes", title: "1. Principes de sécurité" },
  { id: "auth", title: "2. Authentification et sessions" },
  { id: "rbac", title: "3. Contrôle d'accès par rôle (RBAC)" },
  { id: "rls", title: "4. Isolation des données (RLS)" },
  { id: "verification", title: "5. Vérification des professionnels" },
  { id: "signalement", title: "6. Signalement d'incidents" },
];

function SecurityPage() {
  const [activeSection, setActiveSection] = useState("principes");

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="site" style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <Navbar />

      {/* Header Banner */}
      <div style={{ backgroundColor: "#062C54", color: "white", padding: "3rem 1.5rem 2.5rem 1.5rem", borderBottom: "3px solid #0fa29b" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "rgba(15, 162, 155, 0.15)", border: "1px solid rgba(15, 162, 155, 0.3)", borderRadius: "999px", padding: "4px 14px", fontSize: "0.75rem", color: "#38BDF8", fontWeight: "700", marginBottom: "1rem" }}>
            <ShieldCheck size={14} color="#0fa29b" />
            <span>INFRASTRUCTURE SÉCURISÉE</span>
          </div>
          <h1 style={{ fontSize: "2.25rem", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.02em" }}>
            Sécurité & Conformité
          </h1>
          <p style={{ color: "#94A3B8", fontSize: "0.95rem", marginTop: "0.5rem" }}>
            Architecture de sécurité et protection de la plateforme RASED • Dernière mise à jour : 11 Août 2026
          </p>
        </div>
      </div>

      {/* Main Content Layout */}
      <main style={{ maxWidth: "1100px", margin: "2rem auto", padding: "0 1.5rem", display: "flex", gap: "2.5rem" }}>
        {/* Table of Contents - Sticky Sidebar */}
        <aside
          className="hidden md:block"
          style={{
            flex: "0 0 280px",
            position: "sticky",
            top: "90px",
            alignSelf: "flex-start",
            backgroundColor: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "1.25rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.03)"
          }}
        >
          <h3 style={{ fontSize: "0.85rem", fontWeight: "800", color: "#062C54", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <FileText size={16} color="#0fa29b" />
            <span>Sommaire</span>
          </h3>
          <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {TOC.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                style={{
                  textAlign: "left",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: activeSection === item.id ? "700" : "500",
                  color: activeSection === item.id ? "#0fa29b" : "#4a5568",
                  backgroundColor: activeSection === item.id ? "#f0fdfa" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <span>{item.title}</span>
                {activeSection === item.id && <ChevronRight size={14} color="#0fa29b" />}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content Body */}
        <article style={{ flex: 1, backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "2.5rem", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
          <section id="principes" style={{ scrollMarginTop: "100px", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#062C54", marginBottom: "0.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              1. Principes de sécurité
            </h2>
            <p style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem" }}>
              La sécurité de la plateforme <strong>RASED</strong> repose sur le principe de défense en profondeur. Le système d'information garantit l'intégrité des déclarations sanitaires, la confidentialité des comptes et la disponibilité continue du réseau national de surveillance.
            </p>
          </section>

          <section id="auth" style={{ scrollMarginTop: "100px", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#062C54", marginBottom: "0.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              2. Authentification et sessions
            </h2>
            <p style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem", marginBottom: "0.75rem" }}>
              L'accès aux espaces applicatifs requiert une authentification sécurisée.
            </p>
            <ul style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem", paddingLeft: "1.25rem" }}>
              <li>Politique de mots de passe renforcée (longueur minimale, complexité).</li>
              <li>Gestion stricte des sessions utilisateur pour prévenir les sessions multiples simultanées.</li>
              <li>Redirection automatique selon le rôle validé lors de l'authentification.</li>
            </ul>
          </section>

          <section id="rbac" style={{ scrollMarginTop: "100px", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#062C54", marginBottom: "0.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              3. Contrôle d'accès par rôle (RBAC)
            </h2>
            <p style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem" }}>
              Toutes les routes applicatives (`/doctor`, `/patient`, `/inspector`, `/health-authority`, `/superadmin`) sont protégées côté serveur et côté client. Un utilisateur ne peut pas accéder aux espaces d'autres rôles en modifiant l'URL.
            </p>
          </section>

          <section id="rls" style={{ scrollMarginTop: "100px", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#062C54", marginBottom: "0.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              4. Isolation des données (RLS)
            </h2>
            <p style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem" }}>
              La base de données PostgreSQL/Supabase applique des règles de sécurité au niveau des lignes (Row-Level Security - RLS). Les requêtes sont directement filtrées en fonction de l'identifiant et du rôle de l'utilisateur authentifié.
            </p>
          </section>

          <section id="verification" style={{ scrollMarginTop: "100px", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#062C54", marginBottom: "0.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              5. Vérification des professionnels de santé
            </h2>
            <p style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem" }}>
              Les inscriptions de professionnels de santé font l'objet d'un statut temporaire <code>PENDING</code>. Le raccordement final aux établissements médicaux s'effectue après validation administrative par les autorités compétentes.
            </p>
          </section>

          <section id="signalement" style={{ scrollMarginTop: "100px" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#062C54", marginBottom: "0.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              6. Signalement d'incidents de sécurité
            </h2>
            <p style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem", marginBottom: "1rem" }}>
              Si vous découvrez un dysfonctionnement ou une vulnérabilité potentielle :
            </p>
            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1rem 1.25rem", display: "inline-flex", alignItems: "center", gap: "10px", color: "#062C54", fontWeight: "600", fontSize: "0.9rem" }}>
              <Mail size={18} color="#0fa29b" />
              <span>security@rased.sante.gov.dz</span>
            </div>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
