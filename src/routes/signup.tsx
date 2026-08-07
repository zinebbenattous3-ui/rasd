import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Créer un compte — Rased" },
      {
        name: "description",
        content:
          "Demandez un accès professionnel à Rased : médecin déclarant, établissement de santé ou autorité sanitaire.",
      },
      { property: "og:title", content: "Créer un compte — Rased" },
      {
        property: "og:description",
        content: "Demandez un accès professionnel au réseau national de veille sanitaire.",
      },
    ],
  }),
  component: SignupPage,
});

type Errors = Partial<Record<"first_name" | "last_name" | "email" | "nin" | "password" | "role", string>>;

function SignupPage() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    professional_email: "",
    nin: "",
    password: "",
    role: "doctor",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (!form.first_name.trim()) next.first_name = "Prénom requis.";
    if (!form.last_name.trim()) next.last_name = "Nom requis.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.professional_email)) next.email = "Email professionnel invalide.";
    if (!/^\d{8,18}$/.test(form.nin)) next.nin = "Le NIN doit contenir entre 8 et 18 chiffres.";
    if (form.password.length < 8) next.password = "Au moins 8 caractères.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    setDone(true);
  }

  return (
    <div className="site">
      <Navbar />
      <main className="site-main">
        <section className="section-block">
          <div className="block-inner form-page">
            <h1>Demander un accès professionnel</h1>
            <p className="block-lead">
              Votre demande est vérifiée par l'établissement de rattachement avant activation du
              compte.
            </p>

            {done ? (
              <div className="notice" role="status">
                <h2>Demande enregistrée</h2>
                <p>
                  Un email de confirmation sera envoyé à <strong>{form.professional_email}</strong>{" "}
                  après validation par votre établissement.
                </p>
                <Link to="/login" className="btn-primary btn-inline">Aller à la connexion</Link>
              </div>
            ) : (
              <form className="auth-form signup-form" onSubmit={handleSubmit} noValidate>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="first_name">Prénom</label>
                    <input
                      id="first_name" value={form.first_name}
                      onChange={(e) => update("first_name", e.target.value)}
                      aria-invalid={errors.first_name ? true : undefined}
                      aria-describedby={errors.first_name ? "first_name-error" : undefined}
                    />
                    {errors.first_name ? <p id="first_name-error" className="form-error" role="alert">{errors.first_name}</p> : null}
                  </div>
                  <div className="field">
                    <label htmlFor="last_name">Nom</label>
                    <input
                      id="last_name" value={form.last_name}
                      onChange={(e) => update("last_name", e.target.value)}
                      aria-invalid={errors.last_name ? true : undefined}
                      aria-describedby={errors.last_name ? "last_name-error" : undefined}
                    />
                    {errors.last_name ? <p id="last_name-error" className="form-error" role="alert">{errors.last_name}</p> : null}
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="role">Rôle</label>
                  <select id="role" value={form.role} onChange={(e) => update("role", e.target.value)}>
                    <option value="doctor">Médecin déclarant</option>
                    <option value="facility">Référent d'établissement</option>
                    <option value="health_authority">Autorité sanitaire</option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="professional_email">Email professionnel</label>
                  <input
                    id="professional_email" type="email" autoComplete="email"
                    value={form.professional_email}
                    onChange={(e) => update("professional_email", e.target.value)}
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={errors.email ? "email-error" : undefined}
                  />
                  {errors.email ? <p id="email-error" className="form-error" role="alert">{errors.email}</p> : null}
                </div>

                <div className="field">
                  <label htmlFor="nin">NIN</label>
                  <input
                    id="nin" inputMode="numeric" value={form.nin}
                    onChange={(e) => update("nin", e.target.value)}
                    aria-invalid={errors.nin ? true : undefined}
                    aria-describedby={errors.nin ? "nin-error" : "nin-hint"}
                  />
                  {errors.nin ? (
                    <p id="nin-error" className="form-error" role="alert">{errors.nin}</p>
                  ) : (
                    <p id="nin-hint" className="field-hint">Numéro d'identification national, chiffres uniquement.</p>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="new-password">Mot de passe</label>
                  <input
                    id="new-password" type="password" autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    aria-invalid={errors.password ? true : undefined}
                    aria-describedby={errors.password ? "password-error" : undefined}
                  />
                  {errors.password ? <p id="password-error" className="form-error" role="alert">{errors.password}</p> : null}
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Envoi…" : "Envoyer la demande"}
                </button>
                <p className="auth-demo">
                  Vous avez déjà un compte ? <Link to="/login" className="link">Se connecter</Link>
                </p>
              </form>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
