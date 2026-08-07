import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "À propos — Rased" },
      {
        name: "description",
        content:
          "Mission, gouvernance et engagement de confidentialité du réseau national de veille sanitaire Rased.",
      },
      { property: "og:title", content: "À propos — Rased" },
      {
        property: "og:description",
        content: "Mission, gouvernance et engagement de confidentialité de la plateforme Rased.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="site">
      <Navbar />
      <main className="site-main">
        <section className="page-hero">
          <div className="block-inner">
            <p className="eyebrow">À propos</p>
            <h1>Une infrastructure publique au service de la veille sanitaire</h1>
            <p className="hero-lead">
              Rased a été conçu avec les professionnels de terrain : les médecins qui constatent,
              les établissements qui organisent, les autorités qui décident. Notre objectif est de
              réduire le délai entre le premier cas observé et la première mesure prise.
            </p>
          </div>
        </section>

        <section className="section-block" aria-labelledby="mission-title">
          <div className="block-inner prose-cols">
            <div>
              <h2 id="mission-title">Notre mission</h2>
              <p>
                Fournir un canal unique, fiable et traçable pour la remontée des événements
                sanitaires, afin que chaque signal faible soit visible avant qu'il ne devienne une
                crise. La plateforme ne remplace pas le jugement clinique : elle le rend visible à
                l'échelle nationale.
              </p>
            </div>
            <div>
              <h2>Confidentialité des données</h2>
              <p>
                Les patients sont identifiés par leur NIN, jamais exposé en clair dans les vues
                agrégées. Les justificatifs sont stockés en accès restreint et chaque consultation
                ou changement de statut est journalisé.
              </p>
            </div>
          </div>
        </section>

        <section className="section-block alt" aria-labelledby="values-title">
          <div className="block-inner">
            <h2 id="values-title">Ce qui guide nos choix</h2>
            <div className="role-grid">
              <article className="role-card">
                <h3>Clarté avant tout</h3>
                <p className="role-body">Une information utile en un coup d'œil, y compris en garde de nuit.</p>
              </article>
              <article className="role-card">
                <h3>Traçabilité</h3>
                <p className="role-body">Chaque statut, chaque validation, chaque alerte laisse une trace vérifiable.</p>
              </article>
              <article className="role-card">
                <h3>Accessibilité</h3>
                <p className="role-body">Utilisable au clavier, lisible sur mobile, contrastes conformes.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section-block" id="contact" aria-labelledby="contact-title">
          <div className="block-inner">
            <h2 id="contact-title">Nous contacter</h2>
            <p className="block-lead">
              Pour un rattachement d'établissement ou une demande d'accès autorité sanitaire, écrivez
              à <a className="link" href="mailto:contact@rased.dz">contact@rased.dz</a>.
            </p>
            <Link to="/signup" className="btn-primary btn-inline">Créer un compte</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
