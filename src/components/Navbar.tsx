import { Link } from "@tanstack/react-router";
import { useState } from "react";
import logo from "@/assets/rased-logo.png.asset.json";

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="brand" aria-label="Rased — accueil">
          <img src={logo.url} alt="Rased" className="brand-logo" />
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Menu</span>
          <span aria-hidden="true">{open ? "✕" : "☰"}</span>
        </button>

        <nav id="site-nav" className={`site-nav${open ? " open" : ""}`} aria-label="Navigation principale">
          <ul className="nav-links">
            <li>
              <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "active" }} onClick={() => setOpen(false)}>
                Accueil
              </Link>
            </li>
            <li>
              <Link to="/" hash="roles" onClick={() => setOpen(false)}>
                Rôles
              </Link>
            </li>
            <li>
              <Link to="/" hash="fonctionnement" onClick={() => setOpen(false)}>
                Fonctionnement
              </Link>
            </li>
            <li>
              <Link to="/about" activeProps={{ className: "active" }} onClick={() => setOpen(false)}>
                À propos
              </Link>
            </li>
          </ul>
          <div className="nav-actions">
            <Link to="/login" className="btn-ghost" onClick={() => setOpen(false)}>
              Se connecter
            </Link>
            <Link to="/signup" className="btn-primary btn-inline" onClick={() => setOpen(false)}>
              Créer un compte
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
