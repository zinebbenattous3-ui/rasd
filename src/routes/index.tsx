import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
import { Algeria69WilayaMap } from "@/components/Algeria69WilayaMap";
import { getPublicHealthMapData, PublicHealthMapResponse } from "@/lib/publicHealthMap";

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
  const [mapData, setMapData] = useState<PublicHealthMapResponse | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      const res = await getPublicHealthMapData();
      if (isMounted) {
        setMapData(res);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

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

          <div style={{ maxWidth: "1280px", margin: "0 auto", position: "relative", zIndex: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "3.5rem", alignItems: "center" }} className="lg:grid-cols-2">
              {/* Left Column: Core Value Proposition */}
              <div>
                {/* Security Trust Pill */}
                <div 
                  style={{ 
                    display: "inline-flex", 
                    alignItems: "center", 
                    gap: "8px", 
                    backgroundColor: "rgba(15, 162, 155, 0.15)", 
                    border: "1px solid rgba(15, 162, 155, 0.3)",
                    padding: "6px 14px", 
                    borderRadius: "999px", 
                    fontSize: "0.8rem", 
                    color: "#38BDF8", 
                    fontWeight: "700",
                    marginBottom: "1.5rem",
                    letterSpacing: "0.02em"
                  }}
                >
                  <ShieldCheck size={16} color="#38BDF8" />
                  <span>Surveillance épidémiologique nationale sécurisée</span>
                </div>

                <h1 
                  style={{ 
                    fontSize: "3.1rem", 
                    fontWeight: "900", 
                    lineHeight: "1.15", 
                    color: "white", 
                    marginBottom: "1.5rem",
                    letterSpacing: "-0.03em"
                  }}
                >
                  Réseau National de <br />
                  <span style={{ color: "#38BDF8", textShadow: "0 0 20px rgba(56, 189, 248, 0.3)" }}>
                    Veille & Surveillance Sanitaire
                  </span>
                </h1>

                <p 
                  style={{ 
                    fontSize: "1.15rem", 
                    lineHeight: "1.65", 
                    color: "#CBD5E1", 
                    marginBottom: "2.5rem",
                    maxWidth: "580px" 
                  }}
                >
                  Une plateforme institutionnelle unifiée interconnectant praticiens, établissements de santé et autorités de surveillance pour la signalisation rapide et la gestion efficace des alertes sanitaires.
                </p>

                {/* Primary Action Buttons */}
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                  <Link
                    to="/login"
                    style={{
                      backgroundColor: "#0fa29b",
                      color: "white",
                      padding: "0.95rem 1.75rem",
                      borderRadius: "14px",
                      fontWeight: "800",
                      fontSize: "0.98rem",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      boxShadow: "0 10px 25px rgba(15, 162, 155, 0.35)",
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
                borderRadius: "20px", 
                backgroundColor: "rgba(255, 255, 255, 0.04)", 
                border: "1px solid rgba(255, 255, 255, 0.08)",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "1.5rem",
                backdropFilter: "blur(10px)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ padding: "10px", borderRadius: "12px", backgroundColor: "rgba(56, 189, 248, 0.15)" }}>
                  <Activity size={20} color="#38BDF8" />
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "#94A3B8", fontWeight: "600" }}>Veille épidémiologique</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: "800", color: "white" }}>Déclarations en temps réel</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ padding: "10px", borderRadius: "12px", backgroundColor: "rgba(15, 162, 155, 0.15)" }}>
                  <Building2 size={20} color="#0fa29b" />
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "#94A3B8", fontWeight: "600" }}>Couverture nationale</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: "800", color: "white" }}>69 Wilayas administrées</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ padding: "10px", borderRadius: "12px", backgroundColor: "rgba(56, 189, 248, 0.15)" }}>
                  <Users size={20} color="#38BDF8" />
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "#94A3B8", fontWeight: "600" }}>Acteurs de santé</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: "800", color: "white" }}>Médecins & Inspecteurs</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ padding: "10px", borderRadius: "12px", backgroundColor: "rgba(15, 162, 155, 0.15)" }}>
                  <Lock size={20} color="#0fa29b" />
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "#94A3B8", fontWeight: "600" }}>Confidentialité</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: "800", color: "white" }}>Agrégation anonymisée</div>
                </div>
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

        {/* SECTION 6: INTERACTIVE ALGERIA 69 WILAYAS MAP */}
        <section style={{ padding: "5rem 1.5rem", backgroundColor: "#062C54", color: "white", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
            <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: "999px", backgroundColor: "rgba(15, 162, 155, 0.2)", color: "#38BDF8", fontSize: "0.78rem", fontWeight: "800", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "1rem" }}>
              COUVERTURE NATIONALE · 69 WILAYAS
            </div>
            <h2 style={{ fontSize: "2.25rem", fontWeight: "800", color: "white", marginBottom: "1rem" }}>
              Carte interactive des divisions administratives de l'Algérie
            </h2>
            <p style={{ fontSize: "1.05rem", color: "#94A3B8", maxWidth: "650px", margin: "0 auto 3rem auto" }}>
              Survolez les wilayas pour visualiser leurs codes officiels et les événements de santé agrégés en temps réel.
            </p>

            <div style={{ backgroundColor: "rgba(255, 255, 255, 0.03)", borderRadius: "24px", padding: "2rem", border: "1px solid rgba(255, 255, 255, 0.1)", backdropFilter: "blur(10px)" }}>
              <Algeria69WilayaMap stats={mapData?.stats} style={{ height: "480px" }} />
            </div>
          </div>
        </section>

        {/* SECTION 7: NATIONAL NETWORK HUB VISUAL */}
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
                  gap: "8px",
                  boxShadow: "0 10px 25px rgba(15, 162, 155, 0.4)"
                }}
              >
                <span>Accéder à l'espace sécurisé</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
