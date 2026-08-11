import { useState } from "react";
import { Outlet, Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Users, ShieldAlert, Building2, LogOut, User, Activity } from "lucide-react";

export const Route = createFileRoute("/superadmin")({
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

import { useEffect } from "react";
import { validateCurrentSession, clearSession } from "@/lib/auth";

function SuperadminLayout() {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const verifyAuth = async () => {
      const authResult = await validateCurrentSession(["SUPERADMIN"]);
      if (!authResult.authorized) {
        navigate({ to: authResult.redirectTo || "/login" as any });
      }
    };
    verifyAuth();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "rased_auth_session" && !e.newValue) {
        navigate({ to: "/login" });
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleLogout = async () => {
    await clearSession();
    navigate({ to: "/login" });
  };

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

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: '260px', backgroundColor: COLORS.navy, color: 'white', display: 'flex', flexDirection: 'column', boxShadow: '4px 0 24px rgba(0,0,0,0.05)', zIndex: 10, borderTopRightRadius: '20px', borderBottomRightRadius: '20px', margin: '0 0.5rem 0 0' }}>
        <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none' }}>
            <img src="/rased-logo.png" alt="Rased" style={{ height: '36px', filter: 'brightness(0) invert(1)' }} />
            <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'white', letterSpacing: '0.02em' }}>Superadmin</span>
          </Link>
        </div>
        
        <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem', paddingLeft: '1rem' }}>Menu Principal</div>
          
          <Link to="/superadmin" style={linkStyle} activeProps={{ style: activeStyle }} activeOptions={{ exact: true }}>
            <LayoutDashboard size={20} />
            <span>Tableau de bord</span>
          </Link>
          <Link to="/superadmin/inspectors" style={linkStyle} activeProps={{ style: activeStyle }}>
            <Users size={20} />
            <span>Inspecteurs</span>
          </Link>
          <Link to="/superadmin/health-authorities" style={linkStyle} activeProps={{ style: activeStyle }}>
            <ShieldAlert size={20} />
            <span>Autorités de Santé</span>
          </Link>
          <Link to="/superadmin/facilities" style={linkStyle} activeProps={{ style: activeStyle }}>
            <Building2 size={20} />
            <span>Établissements</span>
          </Link>
          <Link to="/superadmin/reportable-diseases" style={linkStyle} activeProps={{ style: activeStyle }}>
            <Activity size={20} />
            <span>Maladies Déclarables</span>
          </Link>
        </nav>

        <div style={{ padding: '1.5rem 1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button 
            onClick={handleLogout} 
            style={{ ...linkStyle, width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', marginBottom: 0 }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#a0aec0'; }}
          >
            <LogOut size={20} />
            <span>Se déconnecter</span>
          </button>
        </div>
      </aside>
      
      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Header */}
        <header style={{ height: '70px', backgroundColor: 'white', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', zIndex: 5 }}>
          <h1 style={{ fontSize: '1.1rem', fontWeight: '600', color: COLORS.navy, margin: 0 }}>Espace d'Administration</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
            <div style={{ padding: '0.4rem 0.8rem', backgroundColor: COLORS.lightTeal, color: COLORS.teal, borderRadius: '999px', fontSize: '0.8rem', fontWeight: '600' }}>
              Super Admin Connecté
            </div>
            
            <div 
              style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: COLORS.navy, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', cursor: 'pointer', userSelect: 'none', transition: 'transform 0.1s' }}
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              SA
            </div>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div style={{ position: 'absolute', top: '120%', right: 0, width: '220px', backgroundColor: 'white', borderRadius: '12px', border: `1px solid ${COLORS.border}`, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 50, padding: '0.5rem', animation: 'fadeIn 0.2s' }}>
                <Link 
                  to="/superadmin/profile" 
                  onClick={() => setShowProfileMenu(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', textDecoration: 'none', color: COLORS.text, fontWeight: '500', borderRadius: '8px', transition: 'background 0.2s' }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = COLORS.lightTeal; e.currentTarget.style.color = COLORS.teal; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = COLORS.text; }}
                >
                  <User size={18} /> Mon Profil
                </Link>
                <button 
                  onClick={handleLogout}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', textDecoration: 'none', color: '#DC2626', fontWeight: '500', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#FEF2F2'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <LogOut size={18} /> Se déconnecter
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
