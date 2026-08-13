import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/utils";
import { 
  Activity, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  RefreshCw, 
  X, 
  CheckCircle2, 
  AlertTriangle,
  FileSpreadsheet
} from "lucide-react";

export const Route = createFileRoute("/superadmin/reportable-diseases")({
  component: SuperadminReportableDiseasesPage,
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

function SuperadminReportableDiseasesPage() {
  const [diseases, setDiseases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState<any>(null);

  // Form states
  const [nameInput, setNameInput] = useState("");
  const [editNameInput, setEditNameInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Auto dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Global ESC key listener for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        setShowAddModal(false);
        setShowEditModal(false);
        setShowDeleteModal(false);
        setSelectedDisease(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch reportable diseases
  const fetchDiseases = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reportable_diseases')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      if (data) {
        setDiseases(data);
      }
    } catch (err: any) {
      console.error("Error fetching reportable diseases:", err);
      setToast({ message: "Erreur lors du chargement des maladies", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiseases();
  }, []);

  // Handle Add Disease
  const handleAddDisease = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmed = nameInput.trim();
    if (!trimmed) {
      setFormError("Veuillez saisir le nom de la maladie.");
      return;
    }

    // Check duplicate locally
    if (diseases.some(d => d.name.toLowerCase() === trimmed.toLowerCase())) {
      setFormError("Cette maladie existe déjà dans la liste.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('reportable_diseases')
        .insert([{ name: trimmed }])
        .select()
        .single();

      if (error) throw error;

      setShowAddModal(false);
      setNameInput("");
      setToast({ message: `✓ "${trimmed}" ajoutée avec succès.`, type: 'success' });
      fetchDiseases();
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de la création de la maladie.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Open Edit Modal
  const handleOpenEdit = (disease: any) => {
    setSelectedDisease(disease);
    setEditNameInput(disease.name);
    setFormError(null);
    setShowEditModal(true);
  };

  // Handle Update Disease
  const handleUpdateDisease = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedDisease) return;
    const trimmed = editNameInput.trim();

    if (!trimmed) {
      setFormError("Le nom de la maladie ne peut pas être vide.");
      return;
    }

    // Check duplicate (excluding current)
    if (diseases.some(d => d.id !== selectedDisease.id && d.name.toLowerCase() === trimmed.toLowerCase())) {
      setFormError("Une autre maladie porte déjà ce nom.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('reportable_diseases')
        .update({ name: trimmed })
        .eq('id', selectedDisease.id);

      if (error) throw error;

      setShowEditModal(false);
      setSelectedDisease(null);
      setToast({ message: `✓ Maladie mise à jour avec succès.`, type: 'success' });
      fetchDiseases();
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de la modification de la maladie.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Open Delete Modal
  const handleOpenDelete = (disease: any) => {
    setSelectedDisease(disease);
    setShowDeleteModal(true);
  };

  // Handle Confirm Delete
  const handleDeleteDisease = async () => {
    if (!selectedDisease) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('reportable_diseases')
        .delete()
        .eq('id', selectedDisease.id);

      if (error) {
        if (error.code === '23503') {
          throw new Error("Impossible de supprimer cette maladie car elle est référencée dans des événements de santé existants.");
        }
        throw error;
      }

      setShowDeleteModal(false);
      setSelectedDisease(null);
      setToast({ message: `✓ Maladie supprimée avec succès.`, type: 'success' });
      fetchDiseases();
    } catch (err: any) {
      setToast({ message: err.message || "Erreur lors de la suppression.", type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered diseases list
  const filteredDiseases = diseases.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 200,
          backgroundColor: toast.type === 'success' ? '#064E3B' : '#7F1D1D',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          fontSize: '0.92rem',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} color="#34D399" />
          ) : (
            <AlertTriangle size={18} color="#FCA5A5" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
              <Activity size={24} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: COLORS.navy, margin: 0 }}>
              Maladies Déclarables
            </h2>
          </div>
          <p style={{ color: COLORS.muted, fontSize: '0.95rem', margin: 0 }}>
            Nomenclature officielle des maladies et événements de santé soumis à déclaration obligatoire.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={fetchDiseases}
            disabled={loading}
            style={{
              backgroundColor: 'white',
              color: COLORS.navy,
              border: `1px solid ${COLORS.border}`,
              padding: '10px 16px',
              borderRadius: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.88rem'
            }}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Actualiser
          </button>

          <button
            onClick={() => {
              setFormError(null);
              setNameInput("");
              setShowAddModal(true);
            }}
            style={{
              backgroundColor: COLORS.teal,
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(15, 162, 155, 0.3)'
            }}
          >
            <Plus size={18} /> + Ajouter une maladie
          </button>
        </div>
      </div>

      {/* Toolbar & Search */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: `1px solid ${COLORS.border}`, padding: '16px 20px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
          <Search size={18} color={COLORS.muted} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Rechercher une maladie par nom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 42px',
              borderRadius: '12px',
              border: `1px solid ${COLORS.border}`,
              fontSize: '0.9rem',
              outline: 'none',
              backgroundColor: COLORS.bgLight,
              color: COLORS.navy
            }}
          />
        </div>

        <div style={{ fontSize: '0.88rem', fontWeight: '700', color: COLORS.navy, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileSpreadsheet size={18} color={COLORS.teal} />
          <span>Total : {filteredDiseases.length} maladies répertoriées</span>
        </div>
      </div>

      {/* Table Section */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: `1px solid ${COLORS.border}`, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: COLORS.muted }}>Chargement des maladies déclarables...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: `1px solid ${COLORS.border}` }}>
              <tr>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', width: '60px' }}>N°</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nom de la Maladie / Événement</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date d'Ajout</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDiseases.map((disease, idx) => (
                <tr key={disease.id} style={{ borderBottom: idx !== filteredDiseases.length - 1 ? `1px solid ${COLORS.border}` : 'none' }}>
                  <td style={{ padding: '16px 20px', fontWeight: '700', color: COLORS.muted, fontSize: '0.85rem' }}>
                    {idx + 1}
                  </td>

                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: '800', color: COLORS.navy, fontSize: '0.98rem' }}>{disease.name}</div>
                  </td>

                  <td style={{ padding: '16px 20px', color: COLORS.muted, fontSize: '0.85rem' }}>
                    {disease.created_at ? formatDateTime(disease.created_at) : '—'}
                  </td>

                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        onClick={() => handleOpenEdit(disease)}
                        style={{ padding: '7px 12px', border: `1px solid ${COLORS.border}`, borderRadius: '8px', background: 'white', color: COLORS.navy, fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        <Edit size={14} color={COLORS.teal} /> Modifier
                      </button>

                      <button
                        onClick={() => handleOpenDelete(disease)}
                        style={{ padding: '7px 12px', border: '1px solid #FECACA', borderRadius: '8px', background: '#FEF2F2', color: '#DC2626', fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        <Trash2 size={14} /> Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredDiseases.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '3.5rem', color: COLORS.muted }}>
                    Aucune maladie déclarable trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal 1: Add Disease */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6, 44, 84, 0.5)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative' }}>
            <div style={{ padding: '20px 24px', backgroundColor: COLORS.navy, color: 'white', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: '800', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={20} color={COLORS.teal} /> Ajouter une Maladie Déclarable
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddDisease} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {formError && (
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.85rem' }}>
                  {formError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>
                  Nom de la maladie / épidémie *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="ex. Épidémie de Rougeole, Cas suspect de Choléra..."
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '0.95rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px', borderTop: `1px solid ${COLORS.border}`, paddingTop: '16px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '10px 18px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, background: 'white', color: COLORS.text, fontWeight: '600', cursor: 'pointer' }}>
                  Annuler (ESC)
                </button>
                <button type="submit" disabled={submitting} style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', background: COLORS.teal, color: 'white', fontWeight: '700', cursor: 'pointer' }}>
                  {submitting ? "Enregistrement..." : "Ajouter la maladie"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Disease */}
      {showEditModal && selectedDisease && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6, 44, 84, 0.5)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative' }}>
            <div style={{ padding: '20px 24px', backgroundColor: COLORS.navy, color: 'white', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: '800', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit size={20} color={COLORS.teal} /> Modifier la Maladie
              </div>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateDisease} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {formError && (
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.85rem' }}>
                  {formError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>
                  Nom de la maladie / épidémie *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editNameInput}
                  onChange={(e) => setEditNameInput(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '0.95rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px', borderTop: `1px solid ${COLORS.border}`, paddingTop: '16px' }}>
                <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '10px 18px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, background: 'white', color: COLORS.text, fontWeight: '600', cursor: 'pointer' }}>
                  Annuler (ESC)
                </button>
                <button type="submit" disabled={submitting} style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', background: COLORS.navy, color: 'white', fontWeight: '700', cursor: 'pointer' }}>
                  {submitting ? "Enregistrement..." : "Enregistrer les modifications"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Delete Confirmation */}
      {showDeleteModal && selectedDisease && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6, 44, 84, 0.5)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '100%', maxWidth: '460px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative' }}>
            <div style={{ padding: '20px 24px', backgroundColor: '#7F1D1D', color: 'white', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: '800', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} color="#FCA5A5" /> Confirmation de suppression
              </div>
              <button onClick={() => setShowDeleteModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ color: COLORS.text, fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>
                Êtes-vous sûr de vouloir supprimer la maladie <strong style={{ color: COLORS.navy }}>"{selectedDisease.name}"</strong> de la nomenclature officielle ?
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: `1px solid ${COLORS.border}`, paddingTop: '16px' }}>
                <button type="button" onClick={() => setShowDeleteModal(false)} style={{ padding: '10px 18px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, background: 'white', color: COLORS.text, fontWeight: '600', cursor: 'pointer' }}>
                  Annuler (ESC)
                </button>
                <button type="button" onClick={handleDeleteDisease} disabled={submitting} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#DC2626', color: 'white', fontWeight: '700', cursor: 'pointer' }}>
                  {submitting ? "Suppression..." : "Oui, supprimer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
