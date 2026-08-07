import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Login } from "@/components/Login";
import { Dashboard } from "@/components/Dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rased — Veille sanitaire nationale" },
      {
        name: "description",
        content:
          "Plateforme de surveillance de santé publique : alertes en direct, couverture par wilaya et suivi des événements sanitaires déclarés.",
      },
      { property: "og:title", content: "Rased — Veille sanitaire nationale" },
      {
        property: "og:description",
        content:
          "Plateforme de surveillance de santé publique : alertes en direct, couverture par wilaya et suivi des événements sanitaires déclarés.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [session, setSession] = useState<{ role: string; demo: boolean } | null>(null);

  if (!session) {
    return (
      <Login onAuthenticated={(role, demo = false) => setSession({ role, demo })} />
    );
  }

  return (
    <Dashboard role={session.role} demo={session.demo} onLogout={() => setSession(null)} />
  );
}
