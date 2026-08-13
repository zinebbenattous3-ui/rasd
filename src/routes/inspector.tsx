import { useState, useEffect } from "react";
import { Outlet, Link, createFileRoute, useNavigate, useLocation, redirect } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  Stethoscope,
  Activity,
  BarChart3,
  FileCheck,
  History,
  User,
  LogOut,
  Menu,
  X,
  Shield,
  MapPin,
  Lock
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { validateCurrentSession, clearSession } from "@/lib/auth";
import { AuthLoadingScreen } from "@/components/AuthLoadingScreen";

export const Route = createFileRoute("/inspector")({
  beforeLoad: async ({ location }) => {
    const authResult = await validateCurrentSession(["INSPECTOR"], location.href || location.pathname);
    if (!authResult.authorized) {
      throw redirect({ to: (authResult.redirectTo || "/login") as any });
    }
  },
  component: InspectorLayout,
});

const COLORS = {
  navy: "#062C54",
  teal: "#0fa29b",
  lightTeal: "#e6f5f4",
  text: "#2d3748",
  muted: "#718096",
  border: "#e2e8f0",
  bgLight: "#f8fafc"
};

function InspectorLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [inspectorProfile, setInspectorProfile] = useState<any>(null);
  const [authStatus, setAuthStatus] = useState<{ checking: boolean; authorized: boolean }>({
    checking: true,
    authorized: false,
  });

  useEffect(() => {
    let isMounted = true;
    const verifyAuth = async () => {
      const authResult = await validateCurrentSession(["INSPECTOR"]);
      if (!authResult.authorized) {
        navigate({ to: (authResult.redirectTo || "/login") as any });
        if (isMounted) setAuthStatus({ checking: false, authorized: false });
        return;
      }
      if (authResult.user && isMounted) {
        setCurrentUser(authResult.user);
      }
      if (isMounted) setAuthStatus({ checking: false, authorized: true });
    };

    verifyAuth();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "rased_auth_session" && !e.newValue) {
        navigate({ to: "/login" });
      }
    };
    window.addEventListener("storage", handleStorageChange);

    const loadInspector = async () => {
      try {
        const authResult = await validateCurrentSession(["INSPECTOR"]);
        if (authResult?.user?.id) {
          const { data } = await supabase
            .from("inspectors")
            .select("*")
            .eq("user_id", authResult.user.id)
            .maybeSingle();

          if (data) {
            setInspectorProfile(data);
          }
        }
      } catch (err) {
        console.error("Error loading inspector profile:", err);
      }
    };

    loadInspector();

    return () => {
      isMounted = false;
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [location.pathname]);

  const handleLogout = async () => {
    await clearSession();
    navigate({ to: "/login" });
  };

  if (authStatus.checking) {
    return <AuthLoadingScreen message="Vérification des accès Inspecteur..." />;
  }

  if (!authStatus.authorized) {
    return null;
  }

  const navItems = [
    { to: "/inspector", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
    { to: "/inspector/facilities", label: "Établissements", icon: Building2, exact: false },
    { to: "/inspector/doctors", label: "Médecins", icon: Stethoscope, exact: false },
    { to: "/inspector/health-events", label: "Événements de santé", icon: Activity, exact: false },
    { to: "/inspector/reports", label: "Rapports", icon: BarChart3, exact: false },
    { to: "/inspector/history", label: "Historique", icon: History, exact: false },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: COLORS.bgLight, fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex" style={{ width: "270px", backgroundColor: COLORS.navy, color: "white", flexDirection: "column", boxShadow: "4px 0 24px rgba(0,0,0,0.05)", zIndex: 20, borderTopRightRadius: "20px", borderBottomRightRadius: "20px" }}>
        <div style={{ padding: "1.8rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: "0.85rem", textDecoration: "none" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "10px", backgroundColor: COLORS.teal, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
              <Shield size={22} />
            </div>
            <div>
              <span style={{ fontSize: "1.15rem", fontWeight: "800", color: "white", letterSpacing: "0.02em", display: "block" }}>Rased Inspector</span>
              <span style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Inspection Wilayale
              </span>
            </div>
          </Link>

          {/* WILAYA SCOPE BADGE IN SIDEBAR */}
          <div style={{ marginTop: "14px", backgroundColor: "rgba(255,255,255,0.07)", padding: "10px 12px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", gap: "8px" }}>
            <MapPin size={16} color={COLORS.teal} />
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: "0.68rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Périmètre de Juridiction</div>
              <div style={{ fontSize: "0.85rem", fontWeight: "800", color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Wilaya {inspectorProfile?.wilaya || "—"}
              </div>
            </div>
            <Lock size={12} color="#f59e0b" />
          </div>
        </div>

        <nav style={{ flex: 1, padding: "1.2rem 1rem", display: "flex", flexDirection: "column", overflowY: "auto" }}>
          <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: "0.8rem", paddingLeft: "0.8rem" }}>
            Inspection Territoriale
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);

            return (
              <Link
                key={item.to}
                to={item.to as any}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.85rem",
                  padding: "0.75rem 1.1rem",
                  borderRadius: "10px",
                  textDecoration: "none",
                  color: isActive ? "white" : "#a0aec0",
                  fontWeight: isActive ? "700" : "500",
                  backgroundColor: isActive ? "rgba(15, 162, 155, 0.2)" : "transparent",
                  borderLeft: isActive ? `3px solid ${COLORS.teal}` : "3px solid transparent",
                  transition: "all 0.2s ease",
                  marginBottom: "0.35rem",
                  fontSize: "0.88rem"
                }}
              >
                <Icon size={18} color={isActive ? COLORS.teal : "#a0aec0"} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "1.2rem 1rem", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.85rem",
              padding: "0.75rem 1.1rem",
              borderRadius: "10px",
              color: "#f87171",
              fontWeight: "600",
              width: "100%",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: "0.88rem"
            }}
          >
            <LogOut size={18} />
            <span>Se déconnecter</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        {/* Top Header Bar */}
        <header style={{ height: "70px", backgroundColor: "white", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2rem", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.navy }}>
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: "800", color: COLORS.navy, margin: 0 }}>
                Contrôle Sanitaire
              </h2>
              <span style={{ backgroundColor: COLORS.lightTeal, color: COLORS.teal, padding: "3px 10px", borderRadius: "999px", fontSize: "0.78rem", fontWeight: "800", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <MapPin size={12} /> Wilaya {inspectorProfile?.wilaya || "—"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.88rem", fontWeight: "700", color: COLORS.navy }}>
                {currentUser?.first_name || "Inspecteur"} {currentUser?.last_name || ""}
              </div>
              <div style={{ fontSize: "0.75rem", color: COLORS.teal, fontWeight: "600" }}>
                Inspecteur Régional
              </div>
            </div>
          </div>
        </header>

        {/* Viewport content */}
        <main style={{ flex: 1, overflowY: "auto", padding: "2rem" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
