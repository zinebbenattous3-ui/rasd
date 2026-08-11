import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/superadmin/inspectors")({
  component: InspectorsPage,
});

const COLORS = {
  navy: "#062C54",
  teal: "#0fa29b",
  lightTeal: "#e6f5f4",
  text: "#2d3748",
  muted: "#718096",
  border: "#e2e8f0"
};

function InspectorsPage() {
  const [inspectors, setInspectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchInspectors = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('inspectors').select('*');
    if (!error && data) {
      setInspectors(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInspectors();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: COLORS.navy, marginBottom: '0.5rem' }}>Inspecteurs</h2>
          <p style={{ color: COLORS.muted, fontSize: '0.95rem' }}>Gérez les inspecteurs de la santé publique enregistrés sur la plateforme.</p>
        </div>
        <button onClick={fetchInspectors} style={{
          backgroundColor: COLORS.teal, color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(15,162,155,0.2)'
        }}>
          Actualiser
        </button>
      </div>
      
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: COLORS.muted }}>Chargement...</div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: `1px solid ${COLORS.border}`, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: `1px solid ${COLORS.border}` }}>
              <tr>
                <th style={{ padding: '1rem', color: COLORS.navy, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID</th>
                <th style={{ padding: '1rem', color: COLORS.navy, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nom Complet</th>
                <th style={{ padding: '1rem', color: COLORS.navy, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fonction</th>
                <th style={{ padding: '1rem', color: COLORS.navy, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Wilaya</th>
              </tr>
            </thead>
            <tbody>
              {inspectors.map((inspector, idx) => (
                <tr key={inspector.id} style={{ borderBottom: idx !== inspectors.length - 1 ? `1px solid ${COLORS.border}` : 'none' }}>
                  <td style={{ padding: '1rem', color: COLORS.muted, fontSize: '0.85rem', fontFamily: 'monospace' }}>{inspector.id}</td>
                  <td style={{ padding: '1rem', color: COLORS.text, fontWeight: '500' }}>{inspector.first_name} {inspector.last_name}</td>
                  <td style={{ padding: '1rem', color: COLORS.muted }}>{inspector.job_function}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ backgroundColor: COLORS.lightTeal, color: COLORS.teal, padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: '500' }}>
                      {inspector.wilaya}
                    </span>
                  </td>
                </tr>
              ))}
              {inspectors.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: COLORS.muted }}>Aucun inspecteur trouvé.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
