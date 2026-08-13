import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { validateCurrentSession } from "@/lib/auth";
import { RefreshCw, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Redirection Rapports — Rased" },
    ],
  }),
  component: ReportsRedirectPage,
});

const COLORS = {
  navy: "#062C54",
  teal: "#0fa29b",
};

export function ReportsRedirectPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function redirectByRole() {
      const authResult = await validateCurrentSession(["INSPECTOR", "HEALTH_AUTHORITY", "SUPERADMIN"]);
      if (!authResult.authorized || !authResult.user) {
        navigate({ to: authResult.redirectTo || "/login" as any });
        return;
      }

      const role = authResult.user.role;
      if (role === "INSPECTOR") {
        navigate({ to: "/inspector/reports" as any });
      } else if (role === "HEALTH_AUTHORITY") {
        navigate({ to: "/health-authority/reports" as any });
      } else if (role === "SUPERADMIN") {
        navigate({ to: "/superadmin" as any });
      } else {
        setErrorMsg("Accès non autorisé au centre de rapports.");
        setChecking(false);
      }
    }

    redirectByRole();
  }, []);

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ textAlign: "center", padding: "2rem" }}>
        {checking ? (
          <>
            <RefreshCw size={36} className="animate-spin" style={{ margin: "0 auto 1rem auto", color: COLORS.teal }} />
            <div style={{ fontSize: "1.1rem", fontWeight: "700", color: COLORS.navy }}>
              Orientation vers votre espace de rapports dédié...
            </div>
          </>
        ) : (
          <div style={{ color: "#991B1B", backgroundColor: "#FEF2F2", padding: "1.5rem 2rem", borderRadius: "16px", border: "1px solid #FCA5A5" }}>
            <ShieldAlert size={36} style={{ margin: "0 auto 0.5rem auto", color: "#DC2626" }} />
            <div style={{ fontSize: "1.1rem", fontWeight: "800" }}>{errorMsg}</div>
          </div>
        )}
      </div>
    </div>
  );
}
