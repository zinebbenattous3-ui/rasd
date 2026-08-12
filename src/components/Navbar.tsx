import { Link, useLocation } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import { getStoredSession, getRoleDashboardPath } from "@/lib/auth";
import { ArrowRight, ShieldCheck, LayoutDashboard } from "lucide-react";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [sessionRole, setSessionRole] = useState<string | null>(null);
  const { t } = useI18n();
  const location = useLocation();

  useEffect(() => {
    const session = getStoredSession();
    if (session?.role) {
      setSessionRole(session.role);
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const dashboardPath = sessionRole ? getRoleDashboardPath(sessionRole) : null;

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: isScrolled ? "1px solid rgba(15, 162, 155, 0.2)" : "1px solid #e2e8f0",
        boxShadow: isScrolled ? "0 4px 20px rgba(6, 44, 84, 0.06)" : "none",
        transition: "all 0.25s ease-in-out",
        height: "70px",
        display: "flex",
        alignItems: "center"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1.5rem"
        }}
      >
        {/* Brand Area */}
        <Link to="/" className="brand" aria-label="Rased" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
          <img src="/rased-logo.png" alt="Rased" style={{ height: "48px", width: "auto", display: "block" }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "1.25rem", fontWeight: "900", color: "#062C54", letterSpacing: "0.02em", lineHeight: 1 }}>
              RASED
            </span>
            <span style={{ fontSize: "0.7rem", fontWeight: "600", color: "#718096", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: "3px" }}>
              Surveillance Sanitaire
            </span>
          </div>
        </Link>

        {/* Security Indicator Badge (Desktop Only) */}
        <div className="hidden lg:flex" style={{ alignItems: "center", gap: "6px", backgroundColor: "#f0fdfa", border: "1px solid #ccfbf1", borderRadius: "999px", padding: "4px 12px", fontSize: "0.72rem", color: "#0f766e", fontWeight: "700", letterSpacing: "0.04em" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#0fa29b", boxShadow: "0 0 8px #0fa29b", display: "inline-block" }} />
          <span>RÉSEAU SÉCURISÉ</span>
        </div>

        {/* Navigation Toggle for Mobile */}
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((v) => !v)}
          style={{
            background: "transparent",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "0.4rem 0.75rem",
            color: "#062C54",
            fontSize: "1.1rem",
            cursor: "pointer"
          }}
        >
          <span className="sr-only">{t("nav.menu")}</span>
          <span aria-hidden="true">{open ? "✕" : "☰"}</span>
        </button>

        {/* Main Desktop & Mobile Nav Menu */}
        <nav id="site-nav" className={`site-nav${open ? " open" : ""}`} aria-label={t("nav.main")}>
          <ul className="nav-links" style={{ display: "flex", alignItems: "center", gap: "1.75rem", listStyle: "none", margin: 0, padding: 0 }}>
            <li>
              <Link
                to="/"
                activeOptions={{ exact: true }}
                onClick={() => setOpen(false)}
                style={{
                  textDecoration: "none",
                  fontSize: "0.92rem",
                  fontWeight: location.pathname === "/" ? "700" : "550",
                  color: location.pathname === "/" ? "#062C54" : "#4a5568",
                  position: "relative",
                  padding: "0.4rem 0",
                  transition: "color 0.2s ease"
                }}
              >
                {t("nav.home")}
                {location.pathname === "/" && (
                  <span style={{ position: "absolute", bottom: "-2px", left: 0, right: 0, height: "2px", backgroundColor: "#0fa29b", borderRadius: "2px" }} />
                )}
              </Link>
            </li>
            <li>
              <Link
                to="/"
                hash="roles"
                onClick={() => setOpen(false)}
                style={{
                  textDecoration: "none",
                  fontSize: "0.92rem",
                  fontWeight: "550",
                  color: "#4a5568",
                  padding: "0.4rem 0",
                  transition: "color 0.2s ease"
                }}
              >
                {t("nav.roles")}
              </Link>
            </li>
            <li>
              <Link
                to="/"
                hash="fonctionnement"
                onClick={() => setOpen(false)}
                style={{
                  textDecoration: "none",
                  fontSize: "0.92rem",
                  fontWeight: "550",
                  color: "#4a5568",
                  padding: "0.4rem 0",
                  transition: "color 0.2s ease"
                }}
              >
                {t("nav.how")}
              </Link>
            </li>
            <li>
              <Link
                to="/about"
                onClick={() => setOpen(false)}
                style={{
                  textDecoration: "none",
                  fontSize: "0.92rem",
                  fontWeight: location.pathname === "/about" ? "700" : "550",
                  color: location.pathname === "/about" ? "#062C54" : "#4a5568",
                  position: "relative",
                  padding: "0.4rem 0",
                  transition: "color 0.2s ease"
                }}
              >
                {t("nav.about")}
                {location.pathname === "/about" && (
                  <span style={{ position: "absolute", bottom: "-2px", left: 0, right: 0, height: "2px", backgroundColor: "#0fa29b", borderRadius: "2px" }} />
                )}
              </Link>
            </li>
            <li>
              <Link
                to="/map"
                onClick={() => setOpen(false)}
                style={{
                  textDecoration: "none",
                  fontSize: "0.92rem",
                  fontWeight: location.pathname === "/map" ? "700" : "550",
                  color: location.pathname === "/map" ? "#062C54" : "#4a5568",
                  position: "relative",
                  padding: "0.4rem 0",
                  transition: "color 0.2s ease"
                }}
              >
                Carte 69 Wilayas
                {location.pathname === "/map" && (
                  <span style={{ position: "absolute", bottom: "-2px", left: 0, right: 0, height: "2px", backgroundColor: "#0fa29b", borderRadius: "2px" }} />
                )}
              </Link>
            </li>
          </ul>

          {/* Action Buttons & Language Switcher */}
          <div className="nav-actions" style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <LanguageSwitcher />

            {dashboardPath ? (
              <Link
                to={dashboardPath as any}
                onClick={() => setOpen(false)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "#0fa29b",
                  color: "white",
                  padding: "0.55rem 1.1rem",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "0.88rem",
                  textDecoration: "none",
                  boxShadow: "0 4px 12px rgba(15, 162, 155, 0.25)",
                  transition: "all 0.2s ease"
                }}
              >
                <LayoutDashboard size={16} />
                <span>Mon Espace</span>
              </Link>
            ) : (
              <>
                {/* Secondary CTA: Créer un compte */}
                <Link
                  to="/signup"
                  onClick={() => setOpen(false)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "0.55rem 1rem",
                    borderRadius: "10px",
                    border: "1.5px solid #cbd5e1",
                    backgroundColor: "transparent",
                    color: "#062C54",
                    fontWeight: "600",
                    fontSize: "0.88rem",
                    textDecoration: "none",
                    transition: "all 0.2s ease"
                  }}
                >
                  {t("nav.signup")}
                </Link>

                {/* Primary CTA: Se connecter */}
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: "#062C54",
                    color: "white",
                    padding: "0.55rem 1.15rem",
                    borderRadius: "10px",
                    fontWeight: "700",
                    fontSize: "0.88rem",
                    textDecoration: "none",
                    boxShadow: "0 4px 14px rgba(6, 44, 84, 0.2)",
                    transition: "all 0.2s ease"
                  }}
                >
                  <span>{t("nav.login")}</span>
                  <ArrowRight size={15} />
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
