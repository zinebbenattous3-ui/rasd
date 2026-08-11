import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ShieldCheck, HeartPulse, Lock, Eye, FileText, CheckCircle2, Mail, ArrowRight, Activity, Users, Building2 } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "À propos — Rased — Réseau National de Veille Sanitaire" },
      {
        name: "description",
        content:
          "Mission, gouvernance, traçabilité et engagement de confidentialité du réseau national de veille sanitaire Rased.",
      },
      { property: "og:title", content: "À propos — Rased — Réseau National de Veille Sanitaire" },
      {
        property: "og:description",
        content: "Mission, gouvernance et engagement de confidentialité de la plateforme Rased.",
      },
    ],
  }),
  component: AboutPage,
});

const COLORS = {
  navy: "#062C54",
  teal: "#0fa29b",
  lightTeal: "#e6f5f4",
  text: "#2d3748",
  muted: "#718096",
  border: "#e2e8f0",
};

const pillars = [
  {
    icon: Eye,
    title: "Clarté Opérationnelle",
    desc: "Une interface dépouillée et lisible permettant une prise de décision rapide, y compris lors des gardes de nuit ou en situation d'urgence.",
  },
  {
    icon: Lock,
    title: "Traçabilité Intégrale",
    desc: "Chaque statut, qualification ou validation laisse une empreinte vérifiable garantissant la transparence des décisions.",
  },
  {
    icon: HeartPulse,
    title: "Protection des Données",
    desc: "Identification basée sur le NIN national, cloisonnement strict des accès par rôle et accès sécurisé aux pièces justificatives.",
  },
];

const governancePoints = [
  "Canal unique et unifié pour les signalements sanitaires nationaux",
  "Agrégation dynamique par wilaya et par type d'établissement",
  "Gestion des accès basée sur la qualification médicale et institutionnelle",
  "Suivi tracé de l'évolution des signalements jusqu'à leur clôture",
];

function AboutPage() {
  return (
    <div style={{ width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#ffffff" }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        {/* HERO SECTION */}
        <section
          style={{
            backgroundColor: "#062C54",
            color: "white",
            padding: "5rem 1.5rem 5.5rem 1.5rem",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle Radial Background Glow */}
          <div
            style={{
              position: "absolute",
              top: "-30%",
              right: "-10%",
              width: "650px",
              height: "650px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(15, 162, 155, 0.15) 0%, rgba(6, 44, 84, 0) 70%)",
              pointerEvents: "none",
            }}
          />

          <div style={{ maxWidth: "1100px", margin: "0 auto", position: "relative", zIndex: 1 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 16px", borderRadius: "999px", backgroundColor: "rgba(15, 162, 155, 0.2)", color: "#38BDF8", fontSize: "0.78rem", fontWeight: "800", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "1.5rem" }}>
              <ShieldCheck size={16} /> INSTITUTION & ENGAGEMENT
            </div>

            <h1 style={{ fontSize: "2.75rem", fontWeight: "900", color: "white", lineHeight: "1.18", letterSpacing: "-0.025em", marginBottom: "1.25rem", maxWidth: "880px" }}>
              Une infrastructure publique au service de la veille sanitaire
            </h1>

            <p style={{ fontSize: "1.15rem", color: "#CBD5E1", lineHeight: "1.65", marginBottom: "3rem", maxWidth: "800px" }}>
              RASED a été conçu en concertation avec les professionnels de terrain : les médecins qui constatent au quotidien, les établissements de santé qui organisent la réponse et les autorités qui pilotent la santé publique. Notre mission est de réduire le délai entre le premier cas observé et la décision.
            </p>

            {/* Key Highlight Metric Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
              <div style={{ backgroundColor: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "18px", padding: "1.25rem 1.5rem" }}>
                <Activity size={22} color="#38BDF8" style={{ marginBottom: "8px" }} />
                <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "white" }}>Détection Précoce</div>
                <div style={{ fontSize: "0.85rem", color: "#94A3B8", marginTop: "2px" }}>Remontée immédiate des signalements</div>
              </div>

              <div style={{ backgroundColor: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "18px", padding: "1.25rem 1.5rem" }}>
                <Building2 size={22} color="#0fa29b" style={{ marginBottom: "8px" }} />
                <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "white" }}>Couverture Nationale</div>
                <div style={{ fontSize: "0.85rem", color: "#94A3B8", marginTop: "2px" }}>Maillage territorial par wilaya</div>
              </div>

              <div style={{ backgroundColor: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "18px", padding: "1.25rem 1.5rem" }}>
                <Lock size={22} color="#F59E0B" style={{ marginBottom: "8px" }} />
                <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "white" }}>Données Sécurisées</div>
                <div style={{ fontSize: "0.85rem", color: "#94A3B8", marginTop: "2px" }}>Contrôle d'accès strict par rôle</div>
              </div>
            </div>
          </div>
        </section>

        {/* MISSION & CONFIDENTIALITY SECTION */}
        <section style={{ padding: "5rem 1.5rem", backgroundColor: "#ffffff", borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "3rem" }}>
              {/* Mission */}
              <div style={{ backgroundColor: "#F8FAFC", borderRadius: "24px", padding: "2.25rem", border: `1.5px solid ${COLORS.border}` }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "14px", backgroundColor: COLORS.lightTeal, color: COLORS.teal, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
                  <HeartPulse size={24} />
                </div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: COLORS.navy, marginBottom: "1rem" }}>
                  Notre Mission
                </h2>
                <p style={{ fontSize: "0.98rem", color: COLORS.text, lineHeight: "1.65" }}>
                  Fournir un canal unique, fiable et traçable pour la remontée des événements sanitaires, afin que chaque signal faible soit visible avant qu'il ne devienne une crise.
                </p>
                <p style={{ fontSize: "0.95rem", color: COLORS.muted, lineHeight: "1.65", marginTop: "1rem" }}>
                  La plateforme ne remplace pas le jugement clinique du praticien : elle le valorise et le rend exploitable à l'échelle épidémiologique nationale.
                </p>
              </div>

              {/* Confidentiality */}
              <div style={{ backgroundColor: "#F8FAFC", borderRadius: "24px", padding: "2.25rem", border: `1.5px solid ${COLORS.border}` }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "14px", backgroundColor: "#E0F2FE", color: "#0284C7", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
                  <Lock size={24} />
                </div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: COLORS.navy, marginBottom: "1rem" }}>
                  Confidentialité des Données
                </h2>
                <p style={{ fontSize: "0.98rem", color: COLORS.text, lineHeight: "1.65" }}>
                  Les patients sont identifiés de façon sécurisée par leur Numéro d'Identification National (NIN), jamais exposé en clair dans les vues analytiques agrégées.
                </p>
                <p style={{ fontSize: "0.95rem", color: COLORS.muted, lineHeight: "1.65", marginTop: "1rem" }}>
                  Les pièces justificatives médicales sont stockées avec des droits d'accès strictement restreints. Chaque consultation ou mise à jour est journalisée dans l'historique d'audit.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* GUIDING VALUES SECTION */}
        <section style={{ padding: "5rem 1.5rem", backgroundColor: "#F8FAFC", borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 3.5rem auto" }}>
              <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: "999px", backgroundColor: COLORS.lightTeal, color: COLORS.teal, fontSize: "0.78rem", fontWeight: "800", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "1rem" }}>
                ENGAGEMENT TECHNIQUE & MÉDICAL
              </div>
              <h2 style={{ fontSize: "2.2rem", fontWeight: "800", color: COLORS.navy, marginBottom: "1rem", letterSpacing: "-0.02em" }}>
                Ce qui guide les choix de RASED
              </h2>
              <p style={{ fontSize: "1.05rem", color: COLORS.muted, lineHeight: "1.6" }}>
                Trois principes fondamentaux gouvernent le développement et l'évolution de la plateforme.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
              {pillars.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    style={{
                      backgroundColor: "white",
                      borderRadius: "20px",
                      padding: "2rem",
                      border: `1.5px solid ${COLORS.border}`,
                      boxShadow: "0 4px 14px rgba(0,0,0,0.02)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem"
                    }}
                  >
                    <div style={{ width: "48px", height: "48px", borderRadius: "14px", backgroundColor: COLORS.navy, color: COLORS.teal, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={24} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: COLORS.navy, marginBottom: "8px" }}>
                        {item.title}
                      </h3>
                      <p style={{ fontSize: "0.92rem", color: COLORS.text, lineHeight: "1.6", margin: 0 }}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* GOVERNANCE & CONTACT SECTION */}
        <section style={{ padding: "5.5rem 1.5rem", backgroundColor: "#ffffff" }}>
          <div style={{ maxWidth: "1000px", margin: "0 auto", backgroundColor: "#062C54", borderRadius: "28px", padding: "3rem 2.5rem", color: "white", boxShadow: "0 20px 45px rgba(6, 44, 84, 0.25)", position: "relative", overflow: "hidden" }}>
            <div style={{ maxWidth: "720px", position: "relative", zIndex: 1 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 14px", borderRadius: "999px", backgroundColor: "rgba(15, 162, 155, 0.2)", color: "#38BDF8", fontSize: "0.78rem", fontWeight: "800", marginBottom: "1.25rem" }}>
                <Mail size={16} /> CONTACT INSTITUTIONNEL
              </div>

              <h2 style={{ fontSize: "2.2rem", fontWeight: "900", color: "white", marginBottom: "1rem", letterSpacing: "-0.02em" }}>
                Rattachement & Demandes d'Accès
              </h2>

              <p style={{ fontSize: "1.05rem", color: "#CBD5E1", lineHeight: "1.65", marginBottom: "2rem" }}>
                Pour le rattachement d'un établissement de santé (CHU, EPH, EPSP) ou une demande d'habilitation autorité sanitaire, contactez notre équipe :
              </p>

              <div style={{ display: "inline-flex", alignItems: "center", gap: "12px", backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", padding: "12px 20px", borderRadius: "14px", fontSize: "1.1rem", fontWeight: "700", color: "white", marginBottom: "2.5rem" }}>
                <Mail size={20} color="#38BDF8" />
                <a href="mailto:contact@rased.dz" style={{ color: "white", textDecoration: "none" }}>contact@rased.dz</a>
              </div>

              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "2rem" }}>
                <Link
                  to="/signup"
                  style={{
                    backgroundColor: "#0fa29b",
                    color: "white",
                    padding: "0.9rem 1.75rem",
                    borderRadius: "12px",
                    fontWeight: "800",
                    fontSize: "0.95rem",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  <span>Créer un compte praticien</span>
                  <ArrowRight size={18} />
                </Link>

                <Link
                  to="/login"
                  style={{
                    backgroundColor: "transparent",
                    color: "white",
                    border: "1.5px solid rgba(255,255,255,0.3)",
                    padding: "0.9rem 1.5rem",
                    borderRadius: "12px",
                    fontWeight: "700",
                    fontSize: "0.95rem",
                    textDecoration: "none"
                  }}
                >
                  Accéder au portail
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
