import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ShieldCheck, FileText, ChevronRight, Scale, Mail } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Conditions d'Utilisation — RASED" },
      {
        name: "description",
        content: "Conditions générales d'utilisation de la plateforme nationale de surveillance sanitaire RASED.",
      },
    ],
  }),
  component: TermsPage,
});

const TOC = [
  { id: "objet", title: "1. Objet de la plateforme" },
  { id: "acces", title: "2. Conditions d'accès" },
  { id: "compte", title: "3. Création et gestion du compte" },
  { id: "responsabilites", title: "4. Responsabilités de l'utilisateur" },
  { id: "donnees", title: "5. Utilisation des données" },
  { id: "regles", title: "6. Règles d'utilisation" },
  { id: "roles", title: "7. Accès selon le rôle" },
  { id: "verification", title: "8. Vérification des professionnels" },
  { id: "suspension", title: "9. Suspension et désactivation" },
  { id: "modifications", title: "10. Modification des conditions" },
  { id: "contact", title: "11. Contact" },
];

function TermsPage() {
  const [activeSection, setActiveSection] = useState("objet");

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
            <Scale size={14} color="#0fa29b" />
            <span>DOCUMENT OFFICIEL</span>
          </div>
          <h1 style={{ fontSize: "2.25rem", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.02em" }}>
            Conditions d'Utilisation
          </h1>
          <p style={{ color: "#94A3B8", fontSize: "0.95rem", marginTop: "0.5rem" }}>
            Plateforme Nationale de Surveillance Sanitaire RASED • Dernière mise à jour : 11 Août 2026
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
          <section id="objet" style={{ scrollMarginTop: "100px", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#062C54", marginBottom: "0.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              1. Objet de la plateforme
            </h2>
            <p style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem" }}>
              La plateforme <strong>RASED</strong> (Surveillance Sanitaire) est un système d'information national destiné au suivi, à la déclaration et à la centralisation des événements de santé publique. Elle permet d'interconnecter les professionnels de santé, les établissements médicaux, les inspecteurs et les autorités sanitaires afin d'assurer une veille épidémiologique réactive.
            </p>
          </section>

          <section id="acces" style={{ scrollMarginTop: "100px", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#062C54", marginBottom: "0.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              2. Conditions d'accès
            </h2>
            <p style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem", marginBottom: "0.75rem" }}>
              L'accès à la plateforme RASED est strictement réservé aux utilisateurs disposant d'un compte validé ou en cours de vérification. L'utilisation des services implique l'acceptation pleine et entière des présentes conditions d'utilisation.
            </p>
            <ul style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem", paddingLeft: "1.25rem" }}>
              <li>Professionnels de santé agréés (médecins déclarants).</li>
              <li>Patients consultant leurs informations de santé.</li>
              <li>Inspecteurs et contrôleurs régionaux de santé publique.</li>
              <li>Autorités sanitaires de régulation et d'analyse.</li>
            </ul>
          </section>

          <section id="compte" style={{ scrollMarginTop: "100px", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#062C54", marginBottom: "0.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              3. Création et gestion du compte
            </h2>
            <p style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem" }}>
              L'utilisateur s'engage à fournir des informations exactes, complètes et à jour lors de son inscription. Les identifiants de connexion (adresse email et mot de passe) sont strictement personnels et confidentiels. L'utilisateur est responsable de la protection de ses identifiants.
            </p>
          </section>

          <section id="responsabilites" style={{ scrollMarginTop: "100px", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#062C54", marginBottom: "0.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              4. Responsabilités de l'utilisateur
            </h2>
            <p style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem" }}>
              Les professionnels de santé utilisant la plateforme sont seuls responsables de la véracité et de la précision des signalements médicaux et événements de santé saisis. Tout usage abusif, tentative d'usurpation d'identité ou altération intentionnelle de données est strictement prohibé.
            </p>
          </section>

          <section id="donnees" style={{ scrollMarginTop: "100px", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#062C54", marginBottom: "0.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              5. Utilisation des données
            </h2>
            <p style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem" }}>
              Les données collectées au sein de RASED sont traitées conformément aux directives de protection des données de santé. Elles sont strictement destinées aux finalités de surveillance épidémiologique et de coordination des soins.
            </p>
          </section>

          <section id="regles" style={{ scrollMarginTop: "100px", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#062C54", marginBottom: "0.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              6. Règles d'utilisation
            </h2>
            <p style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem" }}>
              Il est interdit d'introduire des programmes malveillants, de contourner le contrôle d'accès basé sur les rôles (RBAC), ou de tenter d'accéder sans autorisation aux espaces réservés d'autres catégories d'utilisateurs.
            </p>
          </section>

          <section id="roles" style={{ scrollMarginTop: "100px", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#062C54", marginBottom: "0.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              7. Accès selon le rôle
            </h2>
            <p style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem" }}>
              Chaque utilisateur dispose d'un espace de travail cloisonné défini par son rôle (Médecin, Patient, Inspecteur, Autorité Sanitaire). Le système vérifie automatiquement les privilèges d'accès lors de chaque requête.
            </p>
          </section>

          <section id="verification" style={{ scrollMarginTop: "100px", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#062C54", marginBottom: "0.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              8. Vérification des professionnels de santé
            </h2>
            <p style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem" }}>
              Tout compte médecin nouvellement inscrit est placé par défaut en statut <strong>En attente (PENDING)</strong> jusqu'à la vérification formelle de son affiliation par l'établissement de santé partenaire ou l'autorité compétente.
            </p>
          </section>

          <section id="suspension" style={{ scrollMarginTop: "100px", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#062C54", marginBottom: "0.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              9. Suspension et désactivation
            </h2>
            <p style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem" }}>
              La plateforme se réserve le droit de suspendre ou désactiver tout compte présentant des anomalies de sécurité, des signalements frauduleux ou en cas de non-respect manifeste des présentes conditions.
            </p>
          </section>

          <section id="modifications" style={{ scrollMarginTop: "100px", marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#062C54", marginBottom: "0.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              10. Modification des conditions
            </h2>
            <p style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem" }}>
              Les présentes conditions d'utilisation peuvent être adaptées afin d'intégrer des évolutions réglementaires ou techniques. Les utilisateurs seront informés des modifications majeures via la plateforme.
            </p>
          </section>

          <section id="contact" style={{ scrollMarginTop: "100px" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#062C54", marginBottom: "0.75rem", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>
              11. Contact
            </h2>
            <p style={{ color: "#4a5568", lineHeight: "1.7", fontSize: "0.95rem", marginBottom: "1rem" }}>
              Pour toute question relative aux conditions d'utilisation de la plateforme RASED :
            </p>
            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1rem 1.25rem", display: "inline-flex", alignItems: "center", gap: "10px", color: "#062C54", fontWeight: "600", fontSize: "0.9rem" }}>
              <Mail size={18} color="#0fa29b" />
              <span>contact@rased.sante.gov.dz</span>
            </div>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
