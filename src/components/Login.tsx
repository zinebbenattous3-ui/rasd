import { useState, type FormEvent } from "react";
import logo from "@/assets/rased-logo.png.asset.json";
import { supabase } from "@/lib/supabase";

interface LoginProps {
  onAuthenticated: (role: string, demo?: boolean) => void;
}

export function Login({ onAuthenticated }: LoginProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!identifier.trim()) next.identifier = "Saisissez votre email ou identifiant.";
    else if (identifier.includes("@") && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(identifier))
      next.identifier = "Format d'email invalide.";
    if (!password) next.password = "Saisissez votre mot de passe.";
    else if (password.length < 6) next.password = "Au moins 6 caractères.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: identifier.trim(),
      password,
    });
    setLoading(false);
    if (error || !data.session) {
      setErrors({ form: error?.message ?? "Connexion impossible. Réessayez." });
      return;
    }
    onAuthenticated(data.session.user.role);
  }

  return (
    <main className="auth">
      <section className="auth-panel" aria-labelledby="auth-title">
        <img src={logo.url} alt="Rased — plateforme de veille sanitaire" className="auth-logo" />
        <h1 id="auth-title" className="auth-title">
          Veille sanitaire nationale
        </h1>
        <p className="auth-tagline">Nous surveillons aujourd'hui pour protéger demain.</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {errors.form ? (
            <p className="form-error form-error-block" role="alert">
              {errors.form}
            </p>
          ) : null}

          <div className="field">
            <label htmlFor="identifier">Email ou identifiant</label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              aria-invalid={errors.identifier ? true : undefined}
              aria-describedby={errors.identifier ? "identifier-error" : undefined}
            />
            {errors.identifier ? (
              <p id="identifier-error" className="form-error" role="alert">
                {errors.identifier}
              </p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? "password-error" : undefined}
            />
            {errors.password ? (
              <p id="password-error" className="form-error" role="alert">
                {errors.password}
              </p>
            ) : null}
          </div>

          <div className="field-inline">
            <input
              id="remember"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <label htmlFor="remember">Rester connecté sur cet appareil</label>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </button>
          <p aria-live="polite" className="sr-only">
            {loading ? "Vérification des identifiants en cours" : ""}
          </p>
        </form>

        <p className="auth-demo">
          Pas encore de compte ?{" "}
          <button type="button" className="link-button" onClick={() => onAuthenticated("demo", true)}>
            Découvrir la plateforme
          </button>
        </p>
      </section>

      <aside className="auth-aside" aria-label="À propos de la plateforme">
        <blockquote>
          <p>
            Une déclaration rapide d'un cas suspect réduit de plusieurs jours le délai de réponse
            d'une équipe d'intervention.
          </p>
          <footer>Direction de la prévention — réseau de surveillance</footer>
        </blockquote>
        <ul className="auth-points">
          <li>Déclaration structurée des événements sanitaires</li>
          <li>Alertes en temps réel par wilaya et gravité</li>
          <li>Traçabilité complète des changements de statut</li>
        </ul>
      </aside>
    </main>
  );
}
