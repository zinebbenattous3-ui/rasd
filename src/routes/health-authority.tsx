import { useState, useEffect } from "react";
import { Outlet, Link, createFileRoute, useNavigate, useLocation, redirect } from "@tanstack/react-router";
import { LayoutDashboard, Building2, User, LogOut, Menu, X, ShieldAlert, Stethoscope, BarChart3 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { validateCurrentSession, clearSession } from "@/lib/auth";
import { AuthLoadingScreen } from "@/components/AuthLoadingScreen";

export const Route = createFileRoute("/health-authority")({
  beforeLoad: async () => {
    const authResult = await validateCurrentSession(["HEALTH_AUTHORITY"]);
    if (!authResult.authorized) {
      throw redirect({ to: (authResult.redirectTo || "/login") as any });
    }
  },
  component: HealthAuthorityLayout,
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

function HealthAuthorityLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [authStatus, setAuthStatus] = useState<{ checking: boolean; authorized: boolean }>({
    checking: true,
    authorized: false,
  });

  useEffect(() => {
    let isMounted = true;
    // 1. Guard check: Validate HEALTH_AUTHORITY role and active user session in database
    const verifyAuth = async () => {
      const authResult = await validateCurrentSession(["HEALTH_AUTHORITY"]);
      if (!authResult.authorized) {
        navigate({ to: (authResult.redirectTo || "/login") as any });
        if (isMounted) setAuthStatus({ checking: false, authorized: false });
        return;
      }
      if (isMounted) setAuthStatus({ checking: false, authorized: true });
    };

    verifyAuth();

    // 2. Listen to storage changes for single active session per browser sync
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "rased_auth_session" && !e.newValue) {
        navigate({ to: "/login" });
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // 3. Fetch currently logged in HEALTH_AUTHORITY user profile from users & health_authorities
    const loadProfile = async () => {
      try {
        const { data } = await supabase
          .from('health_authorities')
          .select(`
            *,
            users:user_id (
              id,
              email,
              first_name,
              last_name,
              role,
              is_active
            )
          `)
          .limit(1)
          .maybeSingle();

        if (data && data.users) {
          setCurrentUser({
            id: data.users.id,
            email: data.users.email,
            firstName: data.users.first_name,
            lastName: data.users.last_name,
            role: data.users.role,
            position: data.position,
            authorityType: data.authority_type
          });
        }
      } catch (err) {
        console.error("Error loading health authority layout profile:", err);
      }
    };

    loadProfile();

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
    return <AuthLoadingScreen message="Vérification des accès Autorité Sanitaire..." />;
  }

  if (!authStatus.authorized) {
    return null;
  }

  const navItems = [
    { to: "/health-authority", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
    { to: "/health-authority/facilities", label: "Établissements", icon: Building2, exact: false },
    { to: "/health-authority/doctors", label: "Médecins", icon: Stethoscope, exact: false },
    { to: "/health-authority/reports", label: " Rapports", icon: BarChart3, exact: false },
    { to: "/health-authority/profile", label: "Mon Profil", icon: User, exact: false }
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: COLORS.bgLight, fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex" style={{ width: '270px', backgroundColor: COLORS.navy, color: 'white', flexDirection: 'column', boxShadow: '4px 0 24px rgba(0,0,0,0.05)', zIndex: 20, borderTopRightRadius: '20px', borderBottomRightRadius: '20px' }}>
        <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', textDecoration: 'none' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: COLORS.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <span style={{ fontSize: '1.15rem', fontWeight: '800', color: 'white', letterSpacing: '0.02em', display: 'block' }}>Rased Health</span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Autorité de Santé</span>
            </div>
          </Link>
        </div>

        <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem', paddingLeft: '1rem' }}>Espace Sanitaire</div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.85rem 1.1rem',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  color: isActive ? 'white' : '#a0aec0',
                  fontWeight: isActive ? '600' : '500',
                  backgroundColor: isActive ? 'rgba(15, 162, 155, 0.2)' : 'transparent',
                  borderLeft: isActive ? `3px solid ${COLORS.teal}` : '3px solid transparent',
                  marginBottom: '0.4rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={20} color={isActive ? COLORS.teal : '#a0aec0'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Identity Pill at Bottom */}
        <div style={{ padding: '1.25rem 1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {currentUser && (
            <div style={{ padding: '10px 12px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: COLORS.teal, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem' }}>
                {currentUser.firstName?.[0] || 'A'}{currentUser.lastName?.[0] || 'S'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser.firstName} {currentUser.lastName}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser.position || 'Autorité de Santé'}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              color: '#f87171',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '0.9rem',
              width: '100%',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Navigation Overlay */}
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
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: COLORS.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <ShieldAlert size={18} />
                </div>
                <span style={{ fontWeight: '800', fontSize: '1.05rem', color: 'white' }}>Rased Health</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.exact
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to);

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                      padding: '0.85rem 1.1rem',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      color: isActive ? 'white' : '#a0aec0',
                      fontWeight: isActive ? '600' : '500',
                      backgroundColor: isActive ? 'rgba(15, 162, 155, 0.2)' : 'transparent',
                      borderLeft: isActive ? `3px solid ${COLORS.teal}` : '3px solid transparent'
                    }}
                  >
                    <Icon size={20} color={isActive ? COLORS.teal : '#a0aec0'} />
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

      {/* Main Content View */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Header */}
        <header style={{ height: '70px', backgroundColor: 'white', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.navy, padding: '4px' }} aria-label="Menu mobile">
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h1 style={{ fontSize: '1rem', fontWeight: '700', color: COLORS.navy, margin: 0 }}>
              Direction Sanitaire Régionale
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative' }}>
            <div className="hidden sm:flex" style={{ padding: '6px 14px', backgroundColor: COLORS.lightTeal, color: COLORS.teal, borderRadius: '999px', fontSize: '0.82rem', fontWeight: '600', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS.teal }} />
              Autorité Agréée
            </div>

            <div
              style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: COLORS.navy, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', cursor: 'pointer', userSelect: 'none', border: `2px solid ${COLORS.teal}` }}
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              {currentUser?.firstName?.[0] || 'A'}{currentUser?.lastName?.[0] || 'S'}
            </div>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div style={{ position: 'absolute', top: '120%', right: 0, width: '230px', backgroundColor: 'white', borderRadius: '14px', border: `1px solid ${COLORS.border}`, boxShadow: '0 10px 25px rgba(0,0,0,0.08)', zIndex: 50, padding: '0.5rem' }}>
                <div style={{ padding: '10px 12px', borderBottom: `1px solid ${COLORS.border}`, marginBottom: '6px' }}>
                  <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '0.9rem' }}>{currentUser?.firstName} {currentUser?.lastName}</div>
                  <div style={{ fontSize: '0.78rem', color: COLORS.muted, overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser?.email}</div>
                </div>
                <Link
                  to="/health-authority/profile"
                  onClick={() => setShowProfileMenu(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', textDecoration: 'none', color: COLORS.text, fontWeight: '500', borderRadius: '8px' }}
                >
                  <User size={18} color={COLORS.teal} /> Mon Profil
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

        {/* Page Content Rendered via Outlet */}
        <main style={{ flex: 1, padding: '1rem', overflowY: 'auto' }} className="md:p-8">
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
