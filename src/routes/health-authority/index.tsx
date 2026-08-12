import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Building2, 
  Activity, 
  Clock, 
  Plus, 
  ChevronRight, 
  RefreshCw, 
  Award,
  Calendar,
  UserCheck,
  FileText
} from "lucide-react";

export const Route = createFileRoute("/health-authority/")({
  component: HealthAuthorityDashboard,
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

function HealthAuthorityDashboard() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stats, setStats] = useState({
    total: 0,
    hopital: 0,
    eph: 0,
    epsp: 0,
    clinique: 0,
    autre: 0
  });
  const [recentFacilities, setRecentFacilities] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch current Health Authority profile from users (source of truth for identity)
      const { data: authData } = await supabase
        .from('health_authorities')
        .select(`
          position,
          authority_type,
          users:user_id (
            id,
            email,
            first_name,
            last_name
          )
        `)
        .limit(1)
        .maybeSingle();

      const userObj = Array.isArray(authData?.users) ? authData.users[0] : authData?.users;

      if (authData && userObj) {
        setCurrentUser({
          id: userObj.id,
          firstName: userObj.first_name,
          lastName: userObj.last_name,
          email: userObj.email,
          position: authData.position,
          authorityType: authData.authority_type
        });
      }

      // 2. Fetch facilities stats from facilities table
      const { data: facilitiesData, error: facError } = await supabase
        .from('facilities')
        .select(`
          *,
          creator:created_by (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (!facError && facilitiesData) {
        const total = facilitiesData.length;
        const hopital = facilitiesData.filter(f => f.facility_type === 'Hôpital').length;
        const eph = facilitiesData.filter(f => f.facility_type === 'EPH').length;
        const epsp = facilitiesData.filter(f => f.facility_type === 'EPSP').length;
        const clinique = facilitiesData.filter(f => f.facility_type === 'Clinique privée').length;
        const autre = facilitiesData.filter(f => f.facility_type === 'Autre').length;

        setStats({ total, hopital, eph, epsp, clinique, autre });
        setRecentFacilities(facilitiesData.slice(0, 5));

        // Create activity logs from recent facility creation events
        const logs = facilitiesData.slice(0, 6).map((fac) => {
          const creatorName = fac.creator?.first_name 
            ? `${fac.creator.first_name} ${fac.creator.last_name}`.trim()
            : "Autorité Sanitaire";
          return {
            id: fac.id,
            title: `Nouvel établissement enregistré : ${fac.name}`,
            subtitle: `Type: ${fac.facility_type} • Wilaya: ${fac.wilaya}`,
            creator: creatorName,
            timestamp: new Date(fac.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })
          };
        });
        setActivityLogs(logs);
      }
    } catch (err) {
      console.error("Error loading Health Authority dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Welcome Banner */}
      <div style={{
        backgroundColor: COLORS.navy,
        borderRadius: '20px',
        padding: '36px',
        color: 'white',
        background: `linear-gradient(135deg, ${COLORS.navy} 0%, #0d4680 100%)`,
        boxShadow: '0 12px 30px -5px rgba(6, 44, 84, 0.25)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(15, 162, 155, 0.2)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600', color: '#5eead4', marginBottom: '14px' }}>
            <Award size={16} /> Espace Officiel Direction de la Santé
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: '800', margin: '0 0 8px 0', letterSpacing: '-0.025em' }}>
            Bonjour, {currentUser?.firstName || 'Autorité'} {currentUser?.lastName || ''}
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '1rem', color: '#e2e8f0', maxWidth: '650px', lineHeight: '1.6' }}>
            Tableau de bord de pilotage des structures sanitaires, suivi des enregistrements d'établissements et gestion des accréditations régionales.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={loadDashboardData}
            disabled={loading}
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '12px 20px',
              borderRadius: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9rem',
              backdropFilter: 'blur(10px)'
            }}
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Actualiser
          </button>
          
          <Link
            to="/reports"
            style={{
              backgroundColor: "rgba(255,255,255,0.15)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.3)",
              padding: "12px 20px",
              borderRadius: "12px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.9rem",
              textDecoration: "none",
              backdropFilter: "blur(10px)",
            }}
          >
            <FileText size={18} />
            Centre de Rapports
          </Link>

          <Link
            to="/health-authority/facilities"
            style={{
              backgroundColor: COLORS.teal,
              color: 'white',
              border: 'none',
              padding: '12px 22px',
              borderRadius: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9rem',
              textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(15, 162, 155, 0.4)'
            }}
          >
            <Plus size={18} />
            Nouveau Établissement
          </Link>
        </div>
      </div>

      {/* Main Real Database Statistics Grid */}
      <div>
        <div style={{ fontSize: '1rem', fontWeight: '700', color: COLORS.navy, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={20} color={COLORS.teal} /> Statistiques Réelles du Réseau Sanitaire
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {/* Total Facilities */}
          <div style={{ backgroundColor: 'white', padding: '22px', borderRadius: '16px', border: `1px solid ${COLORS.border}`, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.8rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Établissements</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: COLORS.navy, marginTop: '8px' }}>{stats.total}</div>
            <div style={{ fontSize: '0.78rem', color: COLORS.teal, fontWeight: '600', marginTop: '6px' }}>Directement enregistrés</div>
          </div>

          {/* Hospitals */}
          <div style={{ backgroundColor: 'white', padding: '22px', borderRadius: '16px', border: `1px solid ${COLORS.border}`, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.8rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hôpitaux</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#1D4ED8', marginTop: '8px' }}>{stats.hopital}</div>
            <div style={{ fontSize: '0.78rem', color: COLORS.muted, marginTop: '6px' }}>Grands centres hospitaliers</div>
          </div>

          {/* EPH */}
          <div style={{ backgroundColor: 'white', padding: '22px', borderRadius: '16px', border: `1px solid ${COLORS.border}`, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.8rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>EPH</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#15803D', marginTop: '8px' }}>{stats.eph}</div>
            <div style={{ fontSize: '0.78rem', color: COLORS.muted, marginTop: '6px' }}>Publique hospitalier</div>
          </div>

          {/* EPSP */}
          <div style={{ backgroundColor: 'white', padding: '22px', borderRadius: '16px', border: `1px solid ${COLORS.border}`, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.8rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>EPSP</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#B45309', marginTop: '8px' }}>{stats.epsp}</div>
            <div style={{ fontSize: '0.78rem', color: COLORS.muted, marginTop: '6px' }}>Proximité santé publique</div>
          </div>

          {/* Cliniques Privées */}
          <div style={{ backgroundColor: 'white', padding: '22px', borderRadius: '16px', border: `1px solid ${COLORS.border}`, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.8rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cliniques Privées</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#7E22CE', marginTop: '8px' }}>{stats.clinique}</div>
            <div style={{ fontSize: '0.78rem', color: COLORS.muted, marginTop: '6px' }}>Secteur privé agréé</div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Facilities & Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '24px' }}>
        {/* Left Column: Recent Facilities */}
        <div style={{ backgroundColor: 'white', borderRadius: '18px', border: `1px solid ${COLORS.border}`, padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: COLORS.navy, margin: 0 }}>Établissements Récents</h3>
              <p style={{ fontSize: '0.82rem', color: COLORS.muted, margin: '2px 0 0 0' }}>Dernières structures ajoutées à la base de données</p>
            </div>
            <Link to="/health-authority/facilities" style={{ color: COLORS.teal, textDecoration: 'none', fontWeight: '600', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Voir tout <ChevronRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: COLORS.muted }}>Chargement des établissements...</div>
          ) : recentFacilities.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: COLORS.muted }}>Aucun établissement enregistré.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentFacilities.map((fac) => {
                const creatorName = fac.creator?.first_name 
                  ? `${fac.creator.first_name} ${fac.creator.last_name}`.trim()
                  : "Autorité Sanitaire";

                return (
                  <div key={fac.id} style={{ padding: '14px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '0.95rem' }}>{fac.name}</div>
                      <div style={{ fontSize: '0.8rem', color: COLORS.muted, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '600', color: COLORS.teal }}>{fac.facility_type}</span>
                        <span>•</span>
                        <span>Wilaya: {fac.wilaya}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: COLORS.muted, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <UserCheck size={13} color={COLORS.teal} /> Créé par: <strong>{creatorName}</strong>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: COLORS.muted, textAlign: 'right' }}>
                      <Calendar size={13} style={{ marginBottom: '2px' }} />
                      <div>{new Date(fac.created_at).toLocaleDateString('fr-FR')}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Recent Activity Feed */}
        <div style={{ backgroundColor: 'white', borderRadius: '18px', border: `1px solid ${COLORS.border}`, padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: COLORS.navy, margin: 0 }}>Journal d'Activité Récent</h3>
              <p style={{ fontSize: '0.82rem', color: COLORS.muted, margin: '2px 0 0 0' }}>Historique en direct extrait de la base de données</p>
            </div>
            <Activity size={20} color={COLORS.teal} />
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: COLORS.muted }}>Chargement de l'activité...</div>
          ) : activityLogs.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: COLORS.muted }}>Aucune activité enregistrée.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
              {activityLogs.map((log) => (
                <div key={log.id} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: COLORS.lightTeal, color: COLORS.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                    <Clock size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: '600', color: COLORS.navy }}>{log.title}</div>
                    <div style={{ fontSize: '0.78rem', color: COLORS.muted, marginTop: '2px' }}>{log.subtitle}</div>
                    <div style={{ fontSize: '0.74rem', color: COLORS.teal, fontWeight: '600', marginTop: '4px' }}>
                      Par {log.creator} • {log.timestamp}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
