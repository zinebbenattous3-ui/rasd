import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <img src="/rased-logo.png" alt="Rased" className="footer-logo" />
          <p>{t("footer.tagline")}</p>
        </div>

        <nav aria-label={t("footer.platform")} className="footer-cols">
          <div>
            <h2>{t("footer.platform")}</h2>
            <ul>
              <li><Link to="/" hash="roles">{t("nav.roles")}</Link></li>
              <li><Link to="/" hash="fonctionnement">{t("nav.how")}</Link></li>
              <li><Link to="/login">{t("footer.workspace")}</Link></li>
            </ul>
          </div>
          <div>
            <h2>{t("footer.org")}</h2>
            <ul>
              <li><Link to="/about">{t("nav.about")}</Link></li>
              <li><Link to="/about" hash="contact">{t("footer.contact")}</Link></li>
              <li><Link to="/signup">{t("nav.signup")}</Link></li>
            </ul>
          </div>
        </nav>
      </div>
      <p className="footer-legal">
        © {new Date().getFullYear()} Rased — {t("footer.legal")}
      </p>
    </footer>
  );
}
