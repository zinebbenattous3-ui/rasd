import { createFileRoute } from "@tanstack/react-router";
import { Users, Stethoscope, Building2, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/superadmin/")({
  component: SuperadminDashboard,
});

const COLORS = {
  navy: "#062C54",
  teal: "#0fa29b",
  lightTeal: "#e6f5f4",
  text: "#2d3748",
  muted: "#718096",
  border: "#e2e8f0"
};

function StatCard({ title, count, icon: Icon, color }: { title: string, count: string, icon: any, color: string }) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '1.5rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
      border: `1px solid ${COLORS.border}`,
      display: 'flex',
      alignItems: 'center',
      gap: '1.25rem',
      transition: 'transform 0.2s, box-shadow 0.2s'
    }}
      onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)'; }}
      onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)'; }}
    >
      <div style={{ backgroundColor: color + '15', color: color, padding: '1rem', borderRadius: '12px', display: 'flex' }}>
        <Icon size={28} strokeWidth={2.5} />
      </div>
      <div>
        <p style={{ color: COLORS.muted, fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{title}</p>
        <h3 style={{ color: COLORS.navy, fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>{count}</h3>
      </div>
    </div>
  );
}

function SuperadminDashboard() {
  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: COLORS.navy, marginBottom: '0.5rem' }}>Vue d'ensemble</h2>
        <p style={{ color: COLORS.muted, fontSize: '0.95rem' }}>Gérez les acteurs et établissements de la plateforme Rased en temps réel.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <StatCard title="Médecins Actifs" count="1,245" icon={Stethoscope} color={COLORS.teal} />
        <StatCard title="Établissements" count="312" icon={Building2} color="#3B82F6" />
        <StatCard title="Autorités de Santé" count="48" icon={ShieldAlert} color="#F59E0B" />
        <StatCard title="Inspecteurs" count="156" icon={Users} color="#8B5CF6" />
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: COLORS.navy, marginBottom: '1.5rem' }}>Activité Récente</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1rem', borderBottom: i < 3 ? `1px solid ${COLORS.border}` : 'none' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS.teal }} />
              <div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: COLORS.text, fontWeight: '500' }}>Nouvelle inscription en attente de validation : <span style={{ color: COLORS.navy }}>Dr. Amina B.</span> (Cardiologie)</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: COLORS.muted, marginTop: '0.2rem' }}>Il y a {i * 15} minutes</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
