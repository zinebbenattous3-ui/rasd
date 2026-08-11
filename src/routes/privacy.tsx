import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ShieldCheck, FileText, ChevronRight, Lock, Mail } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Politique de Confidentialité — RASED" },
      {
        name: "description",
        content: "Politique de confidentialité et protection des données personnelles sur RASED.",
      },
    ],
  }),
  component: PrivacyPage,
});

const TOC = [
  { id: "collecte", title: "1. Données collectées" },
  { id: "identification", title: "2. Données d'identification" },
  { id: "sante", title: "3. Données de santé" },
  { id: "finalites", title: "4. Finalités du traitement" },
  { id: "partage", title: "5. Accès et partage restreint" },
  { id: "securite", title: "6. Sécurité des données" },
  { id: "conservation", title: "7. Durée de conservation" },
  { id: "droits", title: "8. Droits de l'utilisateur" },
  { id: "contact", title: "9. Contact & DPD" },
];

function PrivacyPage() {
  const [activeSection, setActiveSection] = useState("collecte");

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
            <Lock size={14} color="#0fa29b" />
            <span>PROTECTION DES DONNÉES</span>
          </div>
          <h1 style={{ fontSize: "2.25rem", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.02em" }}>
            Politique de Confidentialité
          </h1>
          <p style={{ color: "#94A3B8", fontSize: "0.95rem", marginTop: "0.5rem" }}>
            Engagement relatif à la gestion des informations de santé • Dernière mise à jour : 11 Août 2026
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
          <section id="collecte" style={{ scrollMarginTop: "100px", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#062C54", marginBottom: "0.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              1. Données collectées
            </h2>
            <p style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem" }}>
              Dans le cadre de l'exploitation de la plateforme <strong>RASED</strong>, nous collectons les informations strictement nécessaires à la gestion des comptes utilisateurs, à la vérification des accréditations médicales et au traitement des données épidémiologiques.
            </p>
          </section>

          <section id="identification" style={{ scrollMarginTop: "100px", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#062C54", marginBottom: "0.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              2. Données d'identification et de compte
            </h2>
            <ul style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem", paddingLeft: "1.25rem" }}>
              <li><strong>Informations personnelles :</strong> Nom, Prénom, adresse e-mail professionnelle.</li>
              <li><strong>Numéro d'Identification Nationale (NIN) :</strong> Collecté pour la validation d'identité des médecins et patients.</li>
              <li><strong>Identifiants professionnels :</strong> Spécialité médicale, établissement de rattachement, numéro de téléphone.</li>
            </ul>
          </section>

          <section id="sante" style={{ scrollMarginTop: "100px", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#062C54", marginBottom: "0.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              3. Données de santé & événements
            </h2>
            <p style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem" }}>
              Les événements de santé déclarés contiennent des catégories de pathologies, des indicateurs de gravité et la localisation wilaya de survenue. Ces données sont enregistrées de manière structurée pour l'analyse épidémiologique.
            </p>
          </section>

          <section id="finalites" style={{ scrollMarginTop: "100px", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#062C54", marginBottom: "0.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              4. Finalités du traitement
            </h2>
            <ul style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem", paddingLeft: "1.25rem" }}>
              <li>Veille sanitaire et alerte épidémiologique en temps réel.</li>
              <li>Vérification administrative des praticiens déclarants.</li>
              <li>Consolidation des statistiques régionales et nationales de santé.</li>
            </ul>
          </section>

          <section id="partage" style={{ scrollMarginTop: "100px", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#062C54", marginBottom: "0.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              5. Accès et partage restreint
            </h2>
            <p style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem" }}>
              L'accès aux données est strictement partitionné selon le rôle (RBAC). Les données individuelles sont accessibles aux praticiens traitants autorisés et aux autorités habilitées selon leur périmètre territorial.
            </p>
          </section>

          <section id="securite" style={{ scrollMarginTop: "100px", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#062C54", marginBottom: "0.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              6. Sécurité des données
            </h2>
            <p style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem" }}>
              Toutes les communications entre le navigateur et la plateforme sont chiffrées (HTTPS / SSL/TLS). La base de données applique des politiques de sécurité au niveau des lignes (RLS) pour garantir que chaque utilisateur ne puisse accéder qu'aux données autorisées par son rôle.
            </p>
          </section>

          <section id="conservation" style={{ scrollMarginTop: "100px", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#062C54", marginBottom: "0.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              7. Durée de conservation
            </h2>
            <p style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem" }}>
              Les comptes d'utilisateurs et données associées sont conservés tant que le compte est actif ou pour les durées réglementaires prévues par les directives de santé publique.
            </p>
          </section>

          <section id="droits" style={{ scrollMarginTop: "100px", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#062C54", marginBottom: "0.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              8. Droits de l'utilisateur
            </h2>
            <p style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem" }}>
              Conformément à la réglementation sur la protection des données, vous disposez d'un droit d'accès, de rectification et d'opposition concernant vos informations personnelles enregistrées.
            </p>
          </section>

          <section id="contact" style={{ scrollMarginTop: "100px" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#062C54", marginBottom: "0.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              9. Contact & Délégué à la protection des données
            </h2>
            <p style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem", marginBottom: "1rem" }}>
              Pour exercer vos droits ou poser une question sur le traitement de vos données :
            </p>
            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1rem 1.25rem", display: "inline-flex", alignItems: "center", gap: "10px", color: "#062C54", fontWeight: "600", fontSize: "0.9rem" }}>
              <Mail size={18} color="#0fa29b" />
              <span>dpd@rased.sante.gov.dz</span>
            </div>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
