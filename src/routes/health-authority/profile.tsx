import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/utils";
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Briefcase, 
  Award, 
  Calendar, 
  CheckCircle2, 
  RefreshCw,
  Building2,
  Lock
} from "lucide-react";

export const Route = createFileRoute("/health-authority/profile")({
  component: HealthAuthorityProfilePage,
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

function HealthAuthorityProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      // Fetch Health Authority record joined with users (users is the single source of truth for identity)
      const { data, error } = await supabase
        .from('health_authorities')
        .select(`
          id,
          position,
          authority_type,
          created_at,
          updated_at,
          users:user_id (
            id,
            email,
            first_name,
            last_name,
            role,
            is_active,
            created_at
          )
        `)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
      }
    } catch (err) {
      console.error("Error fetching health authority profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: COLORS.muted, gap: '12px' }}>
        <RefreshCw size={24} className="animate-spin" color={COLORS.teal} />
        <span>Chargement du profil...</span>
      </div>
    );
  }

  const user = profile?.users;
  const fullName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : "Autorité Sanitaire";

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '960px', margin: '0 auto' }}>
      {/* Profile Header Banner */}
      <div style={{
        backgroundColor: COLORS.navy,
        borderRadius: '20px',
        padding: '36px',
        color: 'white',
        background: `linear-gradient(135deg, ${COLORS.navy} 0%, #0d4680 100%)`,
        boxShadow: '0 12px 30px -5px rgba(6, 44, 84, 0.25)',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        flexWrap: 'wrap'
      }}>
        <div style={{
          width: '84px',
          height: '84px',
          borderRadius: '50%',
          backgroundColor: COLORS.teal,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.2rem',
          fontWeight: '800',
          boxShadow: '0 8px 20px rgba(15, 162, 155, 0.4)',
          border: '3px solid white'
        }}>
          {user?.first_name?.[0] || 'A'}{user?.last_name?.[0] || 'S'}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(15, 162, 155, 0.25)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', color: '#5eead4', marginBottom: '8px' }}>
            <ShieldCheck size={15} /> Compte Officiel Verifié
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: '0 0 6px 0', letterSpacing: '-0.025em' }}>
            {fullName}
          </h1>
          <div style={{ opacity: 0.9, fontSize: '0.95rem', color: '#e2e8f0' }}>
            {profile?.position || "Direction de la Santé Publique"}
          </div>
        </div>

        <button
          onClick={fetchProfile}
          style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '10px 18px',
            borderRadius: '10px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.88rem'
          }}
        >
          <RefreshCw size={16} /> Actualiser
        </button>
      </div>

      {/* Main Profile Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Identity & Account Card */}
        <div style={{ backgroundColor: 'white', borderRadius: '18px', border: `1px solid ${COLORS.border}`, padding: '28px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '14px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
              <User size={20} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: COLORS.navy, margin: 0 }}>
              Informations Personnelles
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: COLORS.muted, fontWeight: '600', textTransform: 'uppercase' }}>Prénom</div>
              <div style={{ fontSize: '1.05rem', fontWeight: '700', color: COLORS.navy, marginTop: '2px' }}>
                {user?.first_name || '—'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', color: COLORS.muted, fontWeight: '600', textTransform: 'uppercase' }}>Nom de famille</div>
              <div style={{ fontSize: '1.05rem', fontWeight: '700', color: COLORS.navy, marginTop: '2px' }}>
                {user?.last_name || '—'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', color: COLORS.muted, fontWeight: '600', textTransform: 'uppercase' }}>Adresse Email</div>
              <div style={{ fontSize: '1rem', fontWeight: '600', color: COLORS.teal, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={16} color={COLORS.teal} />
                <span>{user?.email || '—'}</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', color: COLORS.muted, fontWeight: '600', textTransform: 'uppercase' }}>Rôle Système</div>
              <div style={{ marginTop: '4px' }}>
                <span style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '4px 12px', borderRadius: '999px', fontSize: '0.82rem', fontWeight: '700' }}>
                  {user?.role || 'HEALTH_AUTHORITY'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Professional & Authority Card */}
        <div style={{ backgroundColor: 'white', borderRadius: '18px', border: `1px solid ${COLORS.border}`, padding: '28px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '14px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#FAF5FF', color: '#7E22CE' }}>
              <Briefcase size={20} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: COLORS.navy, margin: 0 }}>
              Attribution & Poste Sanitaire
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: COLORS.muted, fontWeight: '600', textTransform: 'uppercase' }}>Position / Poste Officiel</div>
              <div style={{ fontSize: '1.05rem', fontWeight: '700', color: COLORS.navy, marginTop: '2px' }}>
                {profile?.position || '—'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', color: COLORS.muted, fontWeight: '600', textTransform: 'uppercase' }}>Type d'Autorité</div>
              <div style={{ marginTop: '6px' }}>
                <span style={{ 
                  backgroundColor: profile?.authority_type === 'DSP' ? '#EFF6FF' : profile?.authority_type === 'DSS' ? '#F0FDF4' : profile?.authority_type === 'CLINIQUE_PRIVEE' ? '#FAF5FF' : '#F3F4F6',
                  color: profile?.authority_type === 'DSP' ? '#1D4ED8' : profile?.authority_type === 'DSS' ? '#15803D' : profile?.authority_type === 'CLINIQUE_PRIVEE' ? '#7E22CE' : '#374151',
                  border: `1px solid ${profile?.authority_type === 'DSP' ? '#BFDBFE' : profile?.authority_type === 'DSS' ? '#BBF7D0' : profile?.authority_type === 'CLINIQUE_PRIVEE' ? '#E9D5FF' : '#E5E7EB'}`,
                  padding: '6px 14px', 
                  borderRadius: '999px', 
                  fontSize: '0.88rem', 
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
                  {profile?.authority_type || 'OTHER'}
                </span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', color: COLORS.muted, fontWeight: '600', textTransform: 'uppercase' }}>Statut du Compte</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '600', color: user?.is_active !== false ? '#15803D' : '#DC2626', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} />
                <span>{user?.is_active !== false ? 'Actif & Autorisé' : 'Compte Inactif'}</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', color: COLORS.muted, fontWeight: '600', textTransform: 'uppercase' }}>Date d'Enregistrement</div>
              <div style={{ fontSize: '0.9rem', color: COLORS.text, fontWeight: '500', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={15} color={COLORS.muted} />
                <span>{user?.created_at ? formatDateTime(user.created_at) : '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
