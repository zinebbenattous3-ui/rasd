import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { getStoredSession, getRoleDashboardPath } from "@/lib/auth";
import { ShieldCheck, Cpu, Lock, Activity } from "lucide-react";

export function Footer() {
  const { t } = useI18n();
  const session = getStoredSession();
  const workspaceTarget = session?.role ? getRoleDashboardPath(session.role) : "/login";

  return (
    <footer
      style={{
        backgroundColor: "#062C54",
        color: "#ffffff",
        borderTop: "1px solid rgba(15, 162, 155, 0.25)",
        paddingTop: "3.5rem",
        paddingBottom: "1.75rem",
        fontFamily: "'Inter', sans-serif",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Background Subtle Gradient Grid Lines */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: "radial-gradient(circle at 10% 20%, rgba(15, 162, 155, 0.06) 0%, transparent 40%)",
          pointerEvents: "none"
        }}
      />

      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 1.25rem",
          position: "relative",
          zIndex: 1
        }}
      >
        {/* Top Footer Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "2.5rem",
            paddingBottom: "3rem",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
          }}
        >
          {/* Brand & Mission Column */}
          <div style={{ gridColumn: "span 1 / span 2" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ backgroundColor: "white", padding: "6px", borderRadius: "10px", display: "inline-flex" }}>
                <img src="/rased-logo.png" alt="Rased" style={{ height: "42px", width: "auto" }} />
              </div>
              <div>
                <div style={{ fontSize: "1.35rem", fontWeight: "900", color: "white", letterSpacing: "0.03em", lineHeight: 1 }}>
                  RASED
                </div>
                <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#0fa29b", letterSpacing: "0.04em", marginTop: "4px" }}>
                  Réseau National de Surveillance Épidémiologique
                </div>
              </div>
            </div>

            <p style={{ color: "#94A3B8", fontSize: "0.92rem", lineHeight: "1.65", maxWidth: "420px", marginBottom: "1.25rem" }}>
              Plateforme nationale hautement sécurisée interconnectant les médecins praticiens, établissements de santé et autorités pour le suivi et la réponse épidémiologique en temps réel.
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "rgba(15, 162, 155, 0.15)", border: "1px solid rgba(15, 162, 155, 0.3)", borderRadius: "999px", padding: "4px 12px", fontSize: "0.75rem", color: "#38BDF8", fontWeight: "700" }}>
                <Activity size={14} color="#0fa29b" />
                <span>SURVEILLANCE EN CONTINU</span>
              </div>
            </div>
          </div>

          {/* Column 1: Plateforme */}
          <div>
            <h3 style={{ fontSize: "0.82rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.08em", color: "white", marginBottom: "1.2rem" }}>
              Plateforme
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <li>
                <Link to="/" style={{ color: "#CBD5E1", fontSize: "0.9rem", textDecoration: "none", transition: "color 0.2s" }}>
                  {t("nav.home")}
                </Link>
              </li>
              <li>
                <Link to="/" hash="roles" style={{ color: "#CBD5E1", fontSize: "0.9rem", textDecoration: "none", transition: "color 0.2s" }}>
                  {t("nav.roles")}
                </Link>
              </li>
              <li>
                <Link to="/map" style={{ color: "#CBD5E1", fontSize: "0.9rem", textDecoration: "none", transition: "color 0.2s" }}>
                  Carte 69 Wilayas
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Informations & Légal */}
          <div>
            <h3 style={{ fontSize: "0.82rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.08em", color: "white", marginBottom: "1.2rem" }}>
              Légal & Securité
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <li>
                <Link to="/terms" style={{ color: "#CBD5E1", fontSize: "0.9rem", textDecoration: "none", transition: "color 0.2s" }}>
                  Conditions d'utilisation
                </Link>
              </li>
              <li>
                <Link to="/privacy" style={{ color: "#CBD5E1", fontSize: "0.9rem", textDecoration: "none", transition: "color 0.2s" }}>
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <Link to="/security" style={{ color: "#CBD5E1", fontSize: "0.9rem", textDecoration: "none", transition: "color 0.2s" }}>
                  Sécurité & Protocoles
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Accès & Espaces */}
          <div>
            <h3 style={{ fontSize: "0.82rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.08em", color: "white", marginBottom: "1.2rem" }}>
              Espaces & Accès
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <li>
                <Link to={workspaceTarget as any} style={{ color: "#38BDF8", fontSize: "0.9rem", fontWeight: "600", textDecoration: "none" }}>
                  {t("footer.workspace")}
                </Link>
              </li>
              <li>
                <Link to="/login" style={{ color: "#CBD5E1", fontSize: "0.9rem", textDecoration: "none" }}>
                  {t("nav.login")}
                </Link>
              </li>
              <li>
                <Link to="/signup" style={{ color: "#CBD5E1", fontSize: "0.9rem", textDecoration: "none" }}>
                  {t("nav.signup")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Technical Security Trust Row */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            padding: "1.25rem 0",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            fontSize: "0.78rem",
            color: "#94A3B8"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10b981", boxShadow: "0 0 10px #10b981" }} />
            <span style={{ fontWeight: "700", color: "white", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              SYSTEME OPERATIONAL • VEILLE ACTIVE
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Lock size={14} color="#0fa29b" /> CONNEXION SÉCURISÉE SHA-256
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Cpu size={14} color="#38BDF8" /> ALGERIA HEALTH INTELLIGENCE
            </span>
          </div>
        </div>

        {/* Copyright & Legal Bar */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            paddingTop: "1.25rem",
            fontSize: "0.8rem",
            color: "#64748B"
          }}
        >
          <div>
            © {new Date().getFullYear()} RASED — {t("footer.legal")}
          </div>

          <div style={{ display: "flex", gap: "1.25rem" }}>
            <Link to="/terms" style={{ color: "#64748B", textDecoration: "none" }}>
              Conditions
            </Link>
            <Link to="/privacy" style={{ color: "#64748B", textDecoration: "none" }}>
              Confidentialité
            </Link>
            <Link to="/security" style={{ color: "#64748B", textDecoration: "none" }}>
              Sécurité
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
