import { useState, useEffect } from "react";
import { Outlet, Link, createFileRoute, useNavigate, useLocation } from "@tanstack/react-router";
import { 
  LayoutDashboard, 
  Users, 
  Activity, 
  User, 
  LogOut, 
  Menu, 
  X, 
  Stethoscope, 
  Building2,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/doctor")({
  component: DoctorLayout,
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

function DoctorLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentDoctor, setCurrentDoctor] = useState<any>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    // Load logged in doctor identity and facility scope
    const loadDoctorProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('doctors')
          .select(`
            *,
            users:user_id (
              id,
              email,
              first_name,
              last_name,
              role,
              is_active
            ),
            facility:facility_id (
              id,
              name,
              facility_type,
              wilaya
            )
          `)
          .limit(1)
          .maybeSingle();

        if (data && data.users) {
          const userObj = Array.isArray(data.users) ? data.users[0] : data.users;
          const facObj = Array.isArray(data.facility) ? data.facility[0] : data.facility;

          setCurrentDoctor({
            id: data.id,
            userId: userObj?.id,
            email: userObj?.email,
            firstName: userObj?.first_name,
            lastName: userObj?.last_name,
            specialty: data.specialty,
            nin: data.nin,
            status: data.status,
            facilityId: data.facility_id,
            facilityName: facObj?.name,
            facilityWilaya: facObj?.wilaya
          });
        }
      } catch (err) {
        console.error("Error loading doctor layout profile:", err);
      }
    };

    loadDoctorProfile();
  }, []);

  const handleLogout = () => {
    navigate({ to: "/login" });
  };

  const navItems = [
    { to: "/doctor", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
    { to: "/doctor/patients", label: "Patients", icon: Users, exact: false },
    { to: "/doctor/health-events", label: "Événements de Santé", icon: Activity, exact: false },
    { to: "/doctor/profile", label: "Mon Profil", icon: User, exact: false }
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: COLORS.bgLight, fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex" style={{ width: '270px', backgroundColor: COLORS.navy, color: 'white', flexDirection: 'column', boxShadow: '4px 0 24px rgba(0,0,0,0.05)', zIndex: 20, borderTopRightRadius: '20px', borderBottomRightRadius: '20px' }}>
        <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', textDecoration: 'none' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: COLORS.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Stethoscope size={22} />
            </div>
            <div>
              <span style={{ fontSize: '1.15rem', fontWeight: '800', color: 'white', letterSpacing: '0.02em', display: 'block' }}>Rased Medical</span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Espace Médecin</span>
            </div>
          </Link>
        </div>
        
        <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem', paddingLeft: '1rem' }}>Espace Praticien</div>
          
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
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  color: isActive ? 'white' : '#94a3b8',
                  backgroundColor: isActive ? COLORS.teal : 'transparent',
                  fontWeight: isActive ? '700' : '500',
                  textDecoration: 'none',
                  marginBottom: '0.5rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={20} color={isActive ? 'white' : '#94a3b8'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Doctor Facility Info Box */}
        {currentDoctor && (
          <div style={{ margin: '1rem', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '0.72rem', color: COLORS.teal, textTransform: 'uppercase', fontWeight: '700' }}>Établissement</div>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'white', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentDoctor.facilityName || 'CHU'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Wilaya : {currentDoctor.facilityWilaya || 'Alger'}</div>
          </div>
        )}

        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              color: '#f87171',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* Top Header */}
        <header style={{ height: '70px', backgroundColor: 'white', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden"
              style={{ background: 'none', border: 'none', color: COLORS.navy, cursor: 'pointer', padding: '4px' }}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <span style={{ fontSize: '1.1rem', fontWeight: '700', color: COLORS.navy }}>
              Portail Médical Déclarant
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#DCFCE7', color: '#15803D', padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700' }}>
              <CheckCircle2 size={14} /> Médecin Agréé
            </div>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: COLORS.navy, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.95rem' }}>
                  Dr
                </div>
                <div style={{ textAlign: 'left' }} className="hidden sm:block">
                  <div style={{ fontSize: '0.9rem', fontWeight: '700', color: COLORS.navy }}>
                    Dr. {currentDoctor?.firstName || ''} {currentDoctor?.lastName || ''}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: COLORS.muted }}>
                    {currentDoctor?.specialty || 'Médecin'}
                  </div>
                </div>
              </button>

              {showProfileMenu && (
                <div style={{ position: 'absolute', right: 0, top: '50px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: `1px solid ${COLORS.border}`, width: '220px', padding: '8px', zIndex: 30 }}>
                  <Link
                    to="/doctor/profile"
                    onClick={() => setShowProfileMenu(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', borderRadius: '8px', color: COLORS.navy, textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600' }}
                  >
                    <User size={16} color={COLORS.teal} /> Mon Profil
                  </Link>
                  <button
                    onClick={handleLogout}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', borderRadius: '8px', color: '#DC2626', background: 'none', border: 'none', width: '100%', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' }}
                  >
                    <LogOut size={16} /> Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '2rem', backgroundColor: COLORS.bgLight }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
