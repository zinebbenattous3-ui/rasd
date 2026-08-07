import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/lib/i18n";

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

const roles = [
  {
    title: "Médecin déclarant",
    table: "doctors",
    body: "Déclare un événement sanitaire en quelques champs : type d'incident, gravité, description et justificatif du patient. Il suit ensuite l'avancement de ses propres déclarations.",
    points: ["Déclaration guidée", "Justificatif sécurisé", "Historique personnel"],
  },
  {
    title: "Établissement de santé",
    table: "facilities",
    body: "CHU, EPH, polycliniques et EPSP regroupent les déclarations de leurs praticiens et disposent d'une vue consolidée par wilaya.",
    points: ["Vue par établissement", "Rattachement des praticiens", "Suivi des statuts"],
  },
  {
    title: "Autorité sanitaire",
    table: "health_authorities",
    body: "Consulte le tableau de bord national, valide ou requalifie les événements, déclenche les alertes et pilote la réponse épidémiologique.",
    points: ["Alertes en direct", "Validation des cas", "Couverture nationale"],
  },
];

const steps = [
  { n: "01", title: "Déclarer", body: "Le praticien saisit l'événement au moment du diagnostic, avec le NIN patient et un justificatif optionnel." },
  { n: "02", title: "Analyser", body: "La plateforme agrège les déclarations par wilaya, type d'incident et gravité." },
  { n: "03", title: "Alerter", body: "Les cas de gravité élevée ou critique remontent immédiatement dans le fil d'alertes des autorités." },
  { n: "04", title: "Protéger", body: "Chaque changement de statut est tracé jusqu'à la clôture de l'événement." },
];

function Landing() {
  const { t } = useI18n();
  return (
    <div className="site">
      <Navbar />
      <main className="site-main">
        <section className="hero">
          <div className="hero-inner">
            <p className="eyebrow">{t("hero.eyebrow")}</p>
            <h1>{t("hero.title")}</h1>
            <p className="hero-lead">{t("hero.lead")}</p>
            <div className="hero-cta">
              <Link to="/login" className="btn-primary btn-inline">{t("hero.cta")}</Link>
            </div>
            <dl className="hero-stats">
              <div><dt>{t("hero.stat.wilayas")}</dt><dd>14</dd></div>
              <div><dt>{t("hero.stat.facilities")}</dt><dd>68</dd></div>
              <div><dt>{t("hero.stat.delay")}</dt><dd>&lt; 2 h</dd></div>
            </dl>
          </div>
        </section>


        <section className="section-block" id="roles" aria-labelledby="roles-title">
          <div className="block-inner">
            <h2 id="roles-title">Trois rôles, une même chaîne d'information</h2>
            <p className="block-lead">
              Chaque profil accède strictement aux données nécessaires à sa mission. Les rôles sont
              portés par le compte utilisateur et déterminent les écrans disponibles.
            </p>
            <div className="role-grid">
              {roles.map((role) => (
                <article key={role.title} className="role-card">
                  <h3>{role.title}</h3>
                  <p className="role-body">{role.body}</p>
                  <ul className="role-points">
                    {role.points.map((p) => <li key={p}>{p}</li>)}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-block alt" id="fonctionnement" aria-labelledby="steps-title">
          <div className="block-inner">
            <h2 id="steps-title">Comment fonctionne la plateforme</h2>
            <ol className="steps">
              {steps.map((s) => (
                <li key={s.n} className="step">
                  <span className="step-n" aria-hidden="true">{s.n}</span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="cta-band" aria-labelledby="cta-title">
          <div className="block-inner cta-inner">
            <div>
              <h2 id="cta-title">Vous êtes praticien ou autorité sanitaire ?</h2>
              <p>Rejoignez le réseau ou explorez le tableau de bord en mode démonstration.</p>
            </div>
            <div className="hero-cta">
              <Link to="/signup" className="btn-primary btn-inline">Créer un compte</Link>
              <Link to="/login" className="btn-ghost">Découvrir la plateforme</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
