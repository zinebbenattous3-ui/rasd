import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/superadmin/facilities")({
  component: FacilitiesPage,
});

const COLORS = {
  navy: "#062C54",
  teal: "#0fa29b",
  lightTeal: "#e6f5f4",
  text: "#2d3748",
  muted: "#718096",
  border: "#e2e8f0"
};

function FacilitiesPage() {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchFacilities = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('facilities').select('*, users(email)');
    if (!error && data) {
      setFacilities(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFacilities();
  }, []);

  const handleRemoveUser = async (facilityId: string) => {
    if (!confirm("Voulez-vous vraiment retirer l'utilisateur de cet établissement ?")) return;
    
    const { error } = await supabase
      .from('facilities')
      .update({ user_id: null })
      .eq('id', facilityId);
      
    if (!error) {
      fetchFacilities();
    } else {
      alert("Erreur lors de la mise à jour");
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: COLORS.navy, marginBottom: '0.5rem' }}>Établissements</h2>
          <p style={{ color: COLORS.muted, fontSize: '0.95rem' }}>Gérez les établissements et leurs administrateurs (responsables).</p>
        </div>
        <button onClick={fetchFacilities} style={{
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
                <th style={{ padding: '1rem', color: COLORS.navy, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nom</th>
                <th style={{ padding: '1rem', color: COLORS.navy, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                <th style={{ padding: '1rem', color: COLORS.navy, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Wilaya</th>
                <th style={{ padding: '1rem', color: COLORS.navy, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Compte Associé</th>
                <th style={{ padding: '1rem', color: COLORS.navy, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {facilities.map((fac, idx) => (
                <tr key={fac.id} style={{ borderBottom: idx !== facilities.length - 1 ? `1px solid ${COLORS.border}` : 'none' }}>
                  <td style={{ padding: '1rem', color: COLORS.text, fontWeight: '500' }}>{fac.name}</td>
                  <td style={{ padding: '1rem', color: COLORS.muted }}>{fac.facility_type}</td>
                  <td style={{ padding: '1rem', color: COLORS.muted }}>{fac.wilaya}</td>
                  <td style={{ padding: '1rem' }}>
                    {fac.users?.email ? (
                      <span style={{ backgroundColor: COLORS.lightTeal, color: COLORS.teal, padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: '500' }}>
                        {fac.users.email}
                      </span>
                    ) : (
                      <span style={{ color: COLORS.muted, fontSize: '0.85rem', fontStyle: 'italic' }}>Aucun</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {fac.user_id ? (
                      <button 
                        style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '500', cursor: 'pointer' }}
                        onClick={() => handleRemoveUser(fac.id)}
                      >
                        Dissocier
                      </button>
                    ) : (
                      <button 
                        style={{ backgroundColor: 'white', color: COLORS.navy, border: `1px solid ${COLORS.border}`, padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '500', cursor: 'pointer' }}
                        onClick={() => alert("Pour associer un utilisateur, vous devez sélectionner un ID ou utiliser un formulaire d'édition.")}
                      >
                        Associer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {facilities.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: COLORS.muted }}>Aucun établissement trouvé.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
