import { Link } from "@tanstack/react-router";
import { useState } from "react";
import logo from "@/assets/rased-logo.png.asset.json";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="brand" aria-label="Rased">
          <img src={logo.url} alt="Rased" className="brand-logo" />
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{t("nav.menu")}</span>
          <span aria-hidden="true">{open ? "✕" : "☰"}</span>
        </button>

        <nav id="site-nav" className={`site-nav${open ? " open" : ""}`} aria-label={t("nav.main")}>
          <ul className="nav-links">
            <li>
              <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "active" }} onClick={() => setOpen(false)}>
                {t("nav.home")}
              </Link>
            </li>
            <li>
              <Link to="/" hash="roles" onClick={() => setOpen(false)}>
                {t("nav.roles")}
              </Link>
            </li>
            <li>
              <Link to="/" hash="fonctionnement" onClick={() => setOpen(false)}>
                {t("nav.how")}
              </Link>
            </li>
            <li>
              <Link to="/about" activeProps={{ className: "active" }} onClick={() => setOpen(false)}>
                {t("nav.about")}
              </Link>
            </li>
          </ul>
          <div className="nav-actions">
            <LanguageSwitcher />
            <Link to="/login" className="btn-ghost" onClick={() => setOpen(false)}>
              {t("nav.login")}
            </Link>
            <Link to="/signup" className="btn-primary btn-inline" onClick={() => setOpen(false)}>
              {t("nav.signup")}
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
