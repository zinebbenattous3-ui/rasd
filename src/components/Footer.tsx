import { Link } from "@tanstack/react-router";
import logo from "@/assets/rased-logo.png.asset.json";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <img src={logo.url} alt="Rased" className="footer-logo" />
          <p>Nous surveillons aujourd'hui pour protéger demain.</p>
        </div>

        <nav aria-label="Liens du pied de page" className="footer-cols">
          <div>
            <h2>Plateforme</h2>
            <ul>
              <li><Link to="/" hash="roles">Rôles</Link></li>
              <li><Link to="/" hash="fonctionnement">Fonctionnement</Link></li>
              <li><Link to="/login">Espace professionnel</Link></li>
            </ul>
          </div>
          <div>
            <h2>Organisation</h2>
            <ul>
              <li><Link to="/about">À propos</Link></li>
              <li><Link to="/about" hash="contact">Contact</Link></li>
              <li><Link to="/signup">Créer un compte</Link></li>
            </ul>
          </div>
        </nav>
      </div>
      <p className="footer-legal">
        © {new Date().getFullYear()} Rased — Réseau national de veille sanitaire. Données protégées et
        accès contrôlé.
      </p>
    </footer>
  );
}
