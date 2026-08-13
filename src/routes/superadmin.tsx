import { useState, useEffect } from "react";
import { Outlet, Link, createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { LayoutDashboard, Users, ShieldCheck, LogOut, User, Activity, Menu, X } from "lucide-react";
import { validateCurrentSession, clearSession } from "@/lib/auth";
import { AuthLoadingScreen } from "@/components/AuthLoadingScreen";

export const Route = createFileRoute("/superadmin")({
  beforeLoad: async () => {
    const authResult = await validateCurrentSession(["SUPERADMIN"]);
    if (!authResult.authorized) {
      throw redirect({ to: (authResult.redirectTo || "/login") as any });
    }
  },
  component: SuperadminLayout,
});

const COLORS = {
  navy: "#062C54",
  teal: "#0fa29b",
  lightTeal: "#e6f5f4",
  text: "#2d3748",
  muted: "#718096",
  border: "#e2e8f0"
};

function SuperadminLayout() {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authStatus, setAuthStatus] = useState<{ checking: boolean; authorized: boolean }>({
    checking: true,
    authorized: false,
  });

  useEffect(() => {
    let isMounted = true;
    const verifyAuth = async () => {
      const authResult = await validateCurrentSession(["SUPERADMIN"]);
      if (!authResult.authorized) {
        navigate({ to: (authResult.redirectTo || "/login") as any });
        if (isMounted) setAuthStatus({ checking: false, authorized: false });
        return;
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
    return () => {
      isMounted = false;
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const handleLogout = async () => {
    await clearSession();
    navigate({ to: "/login" });
  };

  if (authStatus.checking) {
    return <AuthLoadingScreen message="Vérification des accès Administrateur..." />;
  }

  if (!authStatus.authorized) {
    return null;
  }

  const linkStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.85rem 1rem',
    borderRadius: '8px',
    textDecoration: 'none',
    color: '#a0aec0',
    fontWeight: '500',
    transition: 'all 0.2s',
    marginBottom: '0.5rem'
  };

  const activeStyle = {
    background: 'rgba(15, 162, 155, 0.15)',
    color: 'white',
    fontWeight: '600'
  };

  const navItems = [
    { to: "/superadmin", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
    { to: "/superadmin/inspectors", label: "Inspecteurs", icon: Users, exact: false },
    { to: "/superadmin/health-authorities", label: "Autorités de Santé", icon: ShieldCheck, exact: false },
    { to: "/superadmin/reportable-diseases", label: "Maladies Déclarables", icon: Activity, exact: false },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex" style={{ width: '260px', backgroundColor: COLORS.navy, color: 'white', flexDirection: 'column', boxShadow: '4px 0 24px rgba(0,0,0,0.05)', zIndex: 10, borderTopRightRadius: '20px', borderBottomRightRadius: '20px' }}>
        <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none' }}>
            <img src="/rased-logo.png" alt="Rased" style={{ height: '36px', filter: 'brightness(0) invert(1)' }} />
            <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'white', letterSpacing: '0.02em' }}>Superadmin</span>
          </Link>
        </div>

        <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem', paddingLeft: '1rem' }}>Menu Principal</div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to as any}
                style={linkStyle}
                activeProps={{ style: activeStyle }}
                activeOptions={{ exact: item.exact }}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '1.5rem 1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={handleLogout}
            style={{ ...linkStyle, width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', marginBottom: 0 }}
          >
            <LogOut size={20} />
            <span>Se déconnecter</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(6, 44, 84, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 50,
            display: 'flex'
          }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            style={{
              width: '280px',
              maxWidth: '85vw',
              backgroundColor: COLORS.navy,
              color: 'white',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
              padding: '1.5rem 1rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <img src="/rased-logo.png" alt="Rased" style={{ height: '30px', filter: 'brightness(0) invert(1)' }} />
                <span style={{ fontWeight: '800', fontSize: '1.05rem', color: 'white' }}>Superadmin</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to as any}
                    onClick={() => setMobileMenuOpen(false)}
                    style={linkStyle}
                    activeProps={{ style: activeStyle }}
                    activeOptions={{ exact: item.exact }}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                color: '#f87171',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.9rem',
                width: '100%',
                marginTop: 'auto'
              }}
            >
              <LogOut size={18} />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Header */}
        <header style={{ height: '70px', backgroundColor: 'white', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem', zIndex: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.navy, padding: '4px' }} aria-label="Menu mobile">
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h1 style={{ fontSize: '1rem', fontWeight: '600', color: COLORS.navy, margin: 0 }}>Espace d'Administration</h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative' }}>
            <div className="hidden sm:block" style={{ padding: '0.4rem 0.8rem', backgroundColor: COLORS.lightTeal, color: COLORS.teal, borderRadius: '999px', fontSize: '0.8rem', fontWeight: '600' }}>
              Super Admin Connecté
            </div>

            <div
              style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: COLORS.navy, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              SA
            </div>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div style={{ position: 'absolute', top: '120%', right: 0, width: '220px', backgroundColor: 'white', borderRadius: '12px', border: `1px solid ${COLORS.border}`, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 50, padding: '0.5rem' }}>
                <Link
                  to="/superadmin/profile"
                  onClick={() => setShowProfileMenu(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', textDecoration: 'none', color: COLORS.text, fontWeight: '500', borderRadius: '8px' }}
                >
                  <User size={18} /> Mon Profil
                </Link>
                <button
                  onClick={handleLogout}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', textDecoration: 'none', color: '#DC2626', fontWeight: '500', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                >
                  <LogOut size={18} /> Se déconnecter
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: '1rem', overflowY: 'auto' }} className="md:p-8">
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

