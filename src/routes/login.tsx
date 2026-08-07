import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Login } from "@/components/Login";
import { Dashboard } from "@/components/Dashboard";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Connexion — Rased" },
      {
        name: "description",
        content:
          "Accédez à l'espace professionnel Rased : alertes en direct, couverture par wilaya et suivi des événements sanitaires déclarés.",
      },
      { property: "og:title", content: "Connexion — Rased" },
      {
        property: "og:description",
        content: "Espace professionnel du réseau national de veille sanitaire.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [session, setSession] = useState<{ role: string; demo: boolean } | null>(null);

  if (!session) {
    return <Login onAuthenticated={(role, demo = false) => setSession({ role, demo })} />;
  }

  return (
    <Dashboard role={session.role} demo={session.demo} onLogout={() => setSession(null)} />
  );
}
