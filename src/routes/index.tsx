import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { ArrowRight, ShieldCheck, Activity, CheckCircle2, Building2, Users, Layers, Lock } from "lucide-react";
import { HeroNetworkVisual } from "@/components/landing/HeroNetworkVisual";
import { ProcessTimeline } from "@/components/landing/ProcessTimeline";
import { RoleSection } from "@/components/landing/RoleSection";
import { PlatformFlowVisual } from "@/components/landing/PlatformFlowVisual";
import { SecuritySection } from "@/components/landing/SecuritySection";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { NationalNetworkVisual } from "@/components/landing/NationalNetworkVisual";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rased — Réseau national de veille sanitaire" },
      {
        name: "description",
        content:
          "Rased relie médecins, établissements de santé et autorités sanitaires pour déclarer, analyser et suivre les événements sanitaires en temps réel.",
      },
      { property: "og:title", content: "Rased — Réseau national de veille sanitaire" },
      {
        property: "og:description",
        content:
          "Déclarer, analyser et suivre les événements sanitaires en temps réel, du cabinet médical à l'autorité de santé.",
      },
    ],
  }),
  component: Landing,
});

const COLORS = {
  navy: "#062C54",
  teal: "#0fa29b",
  lightTeal: "#e6f5f4",
  text: "#2d3748",
  muted: "#718096",
  border: "#e2e8f0",
};

function Landing() {
  const { t } = useI18n();

  return (
    <div style={{ width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#ffffff" }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        {/* HERO SECTION */}
        <section 
          style={{ 
            backgroundColor: "#062C54", 
            color: "white", 
            padding: "5rem 1.5rem 6rem 1.5rem", 
            position: "relative", 
            overflow: "hidden" 
          }}
        >
          {/* Subtle Background Radial Glow */}
          <div 
            style={{ 
              position: "absolute", 
              top: "-20%", 
              left: "-10%", 
              width: "700px", 
              height: "700px", 
              borderRadius: "50%", 
              background: "radial-gradient(circle, rgba(15, 162, 155, 0.18) 0%, rgba(6, 44, 84, 0) 70%)",
              pointerEvents: "none"
            }} 
          />

          <div style={{ maxWidth: "1280px", margin: "0 auto", position: "relative", zIndex: 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "3.5rem", alignItems: "center" }}>
              {/* Left Column: Content */}
              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 16px", borderRadius: "999px", backgroundColor: "rgba(15, 162, 155, 0.2)", color: "#38BDF8", fontSize: "0.8rem", fontWeight: "800", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "1.5rem" }}>
                  <ShieldCheck size={16} /> {t("hero.eyebrow")}
                </div>

                <h1 style={{ fontSize: "2.8rem", fontWeight: "900", color: "white", lineHeight: "1.15", letterSpacing: "-0.025em", marginBottom: "1.25rem" }}>
                  La surveillance sanitaire, pensée pour agir plus vite.
                </h1>

                <p style={{ fontSize: "1.1rem", color: "#CBD5E1", lineHeight: "1.65", marginBottom: "2.25rem", maxWidth: "560px" }}>
                  RASED connecte les professionnels de santé, établissements et autorités pour transformer les déclarations cliniques en décisions épidémiologiques immédiates.
                </p>

                {/* Primary & Secondary Action CTAs */}
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                  <Link
                    to="/login"
                    style={{
                      backgroundColor: "#0fa29b",
                      color: "white",
                      padding: "0.95rem 1.75rem",
                      borderRadius: "14px",
                      fontWeight: "800",
                      fontSize: "0.95rem",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "10px",
                      boxShadow: "0 8px 24px rgba(15, 162, 155, 0.35)",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <span>Accéder à la plateforme</span>
                    <ArrowRight size={18} />
                  </Link>

                  <Link
                    to="/signup"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                      color: "white",
                      border: "1.5px solid rgba(255, 255, 255, 0.2)",
                      padding: "0.95rem 1.5rem",
                      borderRadius: "14px",
                      fontWeight: "700",
                      fontSize: "0.95rem",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <span>Créer un compte praticien</span>
                  </Link>

                  <a
                    href="#fonctionnement"
                    style={{
                      color: "#94A3B8",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      textDecoration: "underline",
                      padding: "0.5rem 0.75rem"
                    }}
                  >
                    Découvrir le fonctionnement
                  </a>
                </div>
              </div>

              {/* Right Column: Hero Network Radar Visual */}
              <div style={{ width: "100%", height: "100%", minHeight: "440px" }}>
                <HeroNetworkVisual />
              </div>
            </div>

            {/* Conceptual Coverage Indicators Bar */}
            <div 
              style={{ 
                marginTop: "4.5rem", 
                padding: "1.75rem 2rem", 
                backgroundColor: "rgba(255, 255, 255, 0.04)", 
                border: "1px solid rgba(255, 255, 255, 0.1)", 
                borderRadius: "20px", 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                gap: "1.5rem" 
              }}
            >
              <div>
                <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "#38BDF8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                  Couverture Nationale
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "white" }}>69 Wilayas</div>
                <div style={{ fontSize: "0.82rem", color: "#94A3B8", marginTop: "2px" }}>Maillage territorial complet</div>
              </div>

              <div>
                <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "#0fa29b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                  Structures de Santé
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "white" }}>CHU · EPH · EPSP</div>
                <div style={{ fontSize: "0.82rem", color: "#94A3B8", marginTop: "2px" }}>Établissements interconnectés</div>
              </div>

              <div>
                <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "#F59E0B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                  Transmission
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "white" }}>Temps Réel</div>
                <div style={{ fontSize: "0.82rem", color: "#94A3B8", marginTop: "2px" }}>Remontée directe des cas graves</div>
              </div>

              <div>
                <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "#10B981", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                  Sécurité des Données
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "white" }}>Authentifié & Tracé</div>
                <div style={{ fontSize: "0.82rem", color: "#94A3B8", marginTop: "2px" }}>Contrôle d'accès par rôle</div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 1: PROCESS TIMELINE (De la déclaration à la décision) */}
        <ProcessTimeline />

        {/* SECTION 2: ROLES (Trois rôles, une même chaîne d'information) */}
        <RoleSection />

        {/* SECTION 3: HEALTH EVENT LIFECYCLE PIPELINE */}
        <PlatformFlowVisual />

        {/* SECTION 4: DASHBOARD INTERFACE PREVIEW */}
        <DashboardPreview />

        {/* SECTION 5: DATA SECURITY & CONFIDENTIALITY */}
        <SecuritySection />

        {/* SECTION 6: NATIONAL NETWORK HUB VISUAL */}
        <NationalNetworkVisual />

        {/* SECTION 7: CLOSING CALL TO ACTION BAND */}
        <section style={{ padding: "5rem 1.5rem", backgroundColor: "#062C54", color: "white", textAlign: "center" }}>
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: "999px", backgroundColor: "rgba(15, 162, 155, 0.2)", color: "#38BDF8", fontSize: "0.78rem", fontWeight: "800", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "1.25rem" }}>
              ENGAGEMENT POUR LA SANTÉ PUBLIQUE
            </div>
            <h2 style={{ fontSize: "2.4rem", fontWeight: "900", color: "white", marginBottom: "1rem", letterSpacing: "-0.02em" }}>
              Prêt à rejoindre le réseau national de veille ?
            </h2>
            <p style={{ fontSize: "1.1rem", color: "#CBD5E1", lineHeight: "1.65", marginBottom: "2.5rem" }}>
              Accédez à votre espace professionnel et participez activement à une surveillance sanitaire plus réactive et coordonnée.
            </p>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link
                to="/login"
                style={{
                  backgroundColor: "#0fa29b",
                  color: "white",
                  padding: "1rem 2rem",
                  borderRadius: "14px",
                  fontWeight: "800",
                  fontSize: "1rem",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  boxShadow: "0 8px 24px rgba(15, 162, 155, 0.4)"
                }}
              >
                <span>Accéder à RASED</span>
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/signup"
                style={{
                  backgroundColor: "rgba(255,255,255,0.08)",
                  color: "white",
                  border: "1.5px solid rgba(255,255,255,0.2)",
                  padding: "1rem 1.75rem",
                  borderRadius: "14px",
                  fontWeight: "700",
                  fontSize: "1rem",
                  textDecoration: "none"
                }}
              >
                Inscrire mon établissement / cabinet
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
