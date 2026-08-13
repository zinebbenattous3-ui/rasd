import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit3, 
  Trash2, 
  X, 
  RefreshCw,
  UserCheck,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { SelectDropdown } from "@/components/ui/select-dropdown";

export const Route = createFileRoute("/health-authority/facilities")({
  component: HealthAuthorityFacilitiesPage,
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

const FACILITY_TYPES = [
  { value: "EPSP", label: "EPSP — Établissement Public de Santé de Proximité" },
  { value: "EPH", label: "EPH — Établissement Public Hospitalier" },
  { value: "CHU", label: "CHU — Centre Hospitalo-Universitaire" },
];

const FACILITY_LABELS: Record<string, string> = {
  EPSP: "EPSP — Établissement Public de Santé de Proximité",
  EPH: "EPH — Établissement Public Hospitalier",
  CHU: "CHU — Centre Hospitalo-Universitaire",
};

import { WILAYAS_LIST_NAMES as ALGERIA_WILAYAS } from "@/lib/wilayas";

function HealthAuthorityFacilitiesPage() {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [creatorsList, setCreatorsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedWilaya, setSelectedWilaya] = useState("ALL");
  const [selectedCreator, setSelectedCreator] = useState("ALL");

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeFacility, setActiveFacility] = useState<any>(null);

  // Form State for Add / Edit
  const [form, setForm] = useState({
    name: "",
    facility_type: "EPSP",
    wilaya: "16 - Alger",
    address: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch facilities & creators
  const fetchFacilitiesData = async () => {
    setLoading(true);
    try {
      // Get current authenticated user
      const { data: authData } = await supabase
        .from('health_authorities')
        .select(`
          user_id,
          users:user_id (
            id,
            email,
            first_name,
            last_name
          )
        `)
        .limit(1)
        .maybeSingle();

      if (authData?.user_id) {
        setCurrentUserId(authData.user_id);
      }

      // Fetch facilities with creator (joining facilities.created_by -> users.id)
      const { data, error } = await supabase
        .from('facilities')
        .select(`
          *,
          creator:created_by (
            id,
            email,
            first_name,
            last_name,
            role
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setFacilities(data);

        // Build list of unique creators for filter dropdown
        const uniqueCreatorsMap = new Map();
        data.forEach((fac) => {
          if (fac.creator) {
            const fullName = `${fac.creator.first_name || ''} ${fac.creator.last_name || ''}`.trim() || fac.creator.email;
            uniqueCreatorsMap.set(fac.creator.id, fullName);
          }
        });

        const creatorsArr = Array.from(uniqueCreatorsMap.entries()).map(([id, name]) => ({ id, name }));
        setCreatorsList(creatorsArr);
      }
    } catch (err) {
      console.error("Error fetching facilities:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilitiesData();
  }, []);

  // Filter Logic (Search by name, wilaya, address; filter by type, wilaya, creator)
  const filteredFacilities = facilities.filter((fac) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = 
      (fac.name || "").toLowerCase().includes(q) ||
      (fac.wilaya || "").toLowerCase().includes(q) ||
      (fac.address || "").toLowerCase().includes(q);

    const matchesType = selectedType === "ALL" || fac.facility_type === selectedType;
    const matchesWilaya = selectedWilaya === "ALL" || fac.wilaya === selectedWilaya;
    const matchesCreator = selectedCreator === "ALL" || fac.created_by === selectedCreator;

    return matchesQuery && matchesType && matchesWilaya && matchesCreator;
  });

  // Open Add Modal
  const handleOpenAddModal = () => {
    setForm({
      name: "",
      facility_type: "Hôpital",
      wilaya: ALGERIA_WILAYAS[15] || "16 - Alger",
      address: ""
    });
    setFormError(null);
    setShowAddModal(true);
  };

  // Submit Add Facility (created_by is set automatically to currentUserId, NEVER user-editable)
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Le nom de l'établissement est requis.");
      return;
    }
    if (!form.address.trim()) {
      setFormError("L'adresse de l'établissement est requise.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const payload: any = {
        name: form.name.trim(),
        facility_type: form.facility_type,
        wilaya: form.wilaya,
        address: form.address.trim()
      };

      if (currentUserId) {
        payload.created_by = currentUserId;
      }

      const { error } = await supabase.from('facilities').insert([payload]);

      if (error) {
        throw new Error(error.message || "Erreur lors de la création de l'établissement.");
      }

      setShowAddModal(false);
      fetchFacilitiesData();
    } catch (err: any) {
      setFormError(err.message || "Une erreur s'est produite.");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (facility: any) => {
    setActiveFacility(facility);
    setForm({
      name: facility.name || "",
      facility_type: facility.facility_type || "Hôpital",
      wilaya: facility.wilaya || ALGERIA_WILAYAS[15] || "16 - Alger",
      address: facility.address || ""
    });
    setFormError(null);
    setShowEditModal(true);
  };

  // Submit Edit Facility
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFacility) return;
    if (!form.name.trim()) {
      setFormError("Le nom de l'établissement est requis.");
      return;
    }
    if (!form.address.trim()) {
      setFormError("L'adresse de l'établissement est requise.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const { error } = await supabase
        .from('facilities')
        .update({
          name: form.name.trim(),
          facility_type: form.facility_type,
          wilaya: form.wilaya,
          address: form.address.trim()
        })
        .eq('id', activeFacility.id);

      if (error) {
        throw new Error(error.message || "Erreur lors de la mise à jour de l'établissement.");
      }

      setShowEditModal(false);
      fetchFacilitiesData();
    } catch (err: any) {
      setFormError(err.message || "Une erreur s'est produite.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Facility
  const handleDeleteFacility = async (facilityId: string, facilityName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'établissement "${facilityName}" ? Cette action est irréversible.`)) {
      return;
    }

    try {
      const { error } = await supabase.from('facilities').delete().eq('id', facilityId);
      if (error) {
        alert("Erreur lors de la suppression : " + error.message);
      } else {
        fetchFacilitiesData();
      }
    } catch (err) {
      console.error("Error deleting facility:", err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
              <Building2 size={24} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: COLORS.navy, margin: 0 }}>
              Gestion des Établissements de Santé
            </h2>
          </div>
          <p style={{ color: COLORS.muted, fontSize: '0.95rem', margin: 0 }}>
            Administrez et filtrez l'ensemble des structures sanitaires publiques (EPSP, EPH, CHU) de votre juridiction.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={fetchFacilitiesData}
            disabled={loading}
            style={{
              backgroundColor: 'white',
              color: COLORS.navy,
              border: `1px solid ${COLORS.border}`,
              padding: '10px 18px',
              borderRadius: '10px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Actualiser
          </button>

          <button
            onClick={handleOpenAddModal}
            style={{
              backgroundColor: COLORS.teal,
              color: 'white',
              border: 'none',
              padding: '10px 22px',
              borderRadius: '10px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(15,162,155,0.3)'
            }}
          >
            <Plus size={18} />
            Ajouter un Établissement
          </button>
        </div>
      </div>

      {/* Modern Search & Filters Bar */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: `1px solid ${COLORS.border}`, padding: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search size={18} color={COLORS.muted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Rechercher par nom, wilaya, adresse..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 38px',
                borderRadius: '10px',
                border: `1px solid ${COLORS.border}`,
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Type Filter */}
          <div>
            <SelectDropdown
              value={selectedType}
              onChange={(val) => setSelectedType(val)}
              placeholder="Tous les Types"
              icon={Building2}
              options={[
                { value: "ALL", label: "Tous les Types (EPSP, EPH, CHU)" },
                ...FACILITY_TYPES.map(t => ({ value: t.value, label: t.label }))
              ]}
            />
          </div>

          {/* Wilaya Filter */}
          <div>
            <SelectDropdown
              value={selectedWilaya}
              onChange={(val) => setSelectedWilaya(val)}
              placeholder="Toutes les Wilayas"
              icon={MapPin}
              searchable={true}
              options={[
                { value: "ALL", label: "Toutes les Wilayas" },
                ...ALGERIA_WILAYAS.map(w => ({ value: w, label: w }))
              ]}
            />
          </div>

          {/* Created By Filter */}
          <div>
            <SelectDropdown
              value={selectedCreator}
              onChange={(val) => setSelectedCreator(val)}
              placeholder="Tous les Créateurs"
              icon={Filter}
              searchable={true}
              options={[
                { value: "ALL", label: "Tous les Créateurs" },
                ...creatorsList.map(c => ({ value: c.id, label: c.name }))
              ]}
            />
          </div>
        </div>

        <div style={{ fontSize: '0.85rem', color: COLORS.muted, borderTop: `1px solid ${COLORS.border}`, paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Résultats : <strong>{filteredFacilities.length}</strong> établissement(s) trouvé(s)</span>
          {(searchQuery || selectedType !== "ALL" || selectedWilaya !== "ALL" || selectedCreator !== "ALL") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedType("ALL");
                setSelectedWilaya("ALL");
                setSelectedCreator("ALL");
              }}
              style={{ background: 'none', border: 'none', color: COLORS.teal, cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      </div>

      {/* Facilities Data Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: `1px solid ${COLORS.border}`, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: COLORS.muted }}>Chargement des établissements...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: `1px solid ${COLORS.border}` }}>
              <tr>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nom Établissement</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Wilaya</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Adresse</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Créé Par</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Créé le</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFacilities.map((fac, idx) => {
                const creatorName = fac.creator?.first_name 
                  ? `${fac.creator.first_name} ${fac.creator.last_name}`.trim()
                  : "Autorité Sanitaire";

                return (
                  <tr key={fac.id} style={{ borderBottom: idx !== filteredFacilities.length - 1 ? `1px solid ${COLORS.border}` : 'none' }}>
                    <td style={{ padding: '16px 20px', fontWeight: '700', color: COLORS.navy, fontSize: '0.95rem' }}>
                      {fac.name}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ 
                        backgroundColor: COLORS.lightTeal, 
                        color: COLORS.teal, 
                        padding: '4px 10px', 
                        borderRadius: '999px', 
                        fontSize: '0.82rem', 
                        fontWeight: '600' 
                      }}>
                        {fac.facility_type}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', color: COLORS.text, fontSize: '0.9rem' }}>
                      {fac.wilaya}
                    </td>
                    <td style={{ padding: '16px 20px', color: COLORS.muted, fontSize: '0.85rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {fac.address}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: '600', color: COLORS.navy }}>
                        <UserCheck size={14} color={COLORS.teal} />
                        <span>{creatorName}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', color: COLORS.muted, fontSize: '0.85rem' }}>
                      {new Date(fac.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            setActiveFacility(fac);
                            setShowDetailsModal(true);
                          }}
                          style={{ padding: '6px', border: `1px solid ${COLORS.border}`, borderRadius: '6px', background: 'white', color: COLORS.teal, cursor: 'pointer' }}
                          title="Détails"
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(fac)}
                          style={{ padding: '6px', border: `1px solid ${COLORS.border}`, borderRadius: '6px', background: 'white', color: COLORS.navy, cursor: 'pointer' }}
                          title="Modifier"
                        >
                          <Edit3 size={16} />
                        </button>

                        <button
                          onClick={() => handleDeleteFacility(fac.id, fac.name)}
                          style={{ padding: '6px', border: `1px solid #FECACA`, borderRadius: '6px', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer' }}
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredFacilities.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: COLORS.muted }}>
                    Aucun établissement de santé ne correspond aux critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Facility Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6, 44, 84, 0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '100%', maxWidth: '520px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'fadeIn 0.2s' }}>
            <div style={{ padding: '20px 24px', backgroundColor: COLORS.navy, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: '700', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={20} color={COLORS.teal} /> Ajouter un Établissement
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {formError && (
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} /> {formError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: COLORS.navy, marginBottom: '6px' }}>
                  Nom de l'établissement *
                </label>
                <input
                  type="text"
                  placeholder="ex: Hôpital Mustapha Pacha"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '0.9rem', outline: 'none' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: COLORS.navy, marginBottom: '6px' }}>
                  Type d'établissement *
                </label>
                <SelectDropdown
                  value={form.facility_type}
                  onChange={(val) => setForm({ ...form, facility_type: val })}
                  placeholder="Sélectionner le type..."
                  icon={Building2}
                  options={FACILITY_TYPES.map(t => ({ value: t.value, label: t.label }))}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: COLORS.navy, marginBottom: '6px' }}>
                  Wilaya *
                </label>
                <SelectDropdown
                  value={form.wilaya}
                  onChange={(val) => setForm({ ...form, wilaya: val })}
                  placeholder="Sélectionner la wilaya..."
                  icon={MapPin}
                  searchable={true}
                  options={ALGERIA_WILAYAS.map(w => ({ value: w, label: w }))}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: COLORS.navy, marginBottom: '6px' }}>
                  Adresse *
                </label>
                <textarea
                  placeholder="Adresse précise de l'établissement..."
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '10px 18px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, background: 'white', color: COLORS.text, fontWeight: '600', cursor: 'pointer' }}>
                  Annuler (ESC)
                </button>
                <button type="submit" disabled={submitting} style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', background: COLORS.teal, color: 'white', fontWeight: '600', cursor: 'pointer' }}>
                  {submitting ? "Création en cours..." : "Créer l'Établissement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Facility Modal */}
      {showEditModal && activeFacility && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6, 44, 84, 0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'fadeIn 0.2s' }}>
            <div style={{ padding: '20px 24px', backgroundColor: COLORS.navy, color: 'white', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: '700', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={20} color={COLORS.teal} /> Modifier l'Établissement
              </div>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {formError && (
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.85rem' }}>
                  {formError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: COLORS.navy, marginBottom: '6px' }}>Nom de l'établissement *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '0.9rem', outline: 'none' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: COLORS.navy, marginBottom: '6px' }}>Type d'établissement *</label>
                <SelectDropdown
                  value={form.facility_type}
                  onChange={(val) => setForm({ ...form, facility_type: val })}
                  placeholder="Sélectionner le type..."
                  icon={Building2}
                  options={FACILITY_TYPES.map(t => ({ value: t.value, label: t.label }))}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: COLORS.navy, marginBottom: '6px' }}>Wilaya *</label>
                <SelectDropdown
                  value={form.wilaya}
                  onChange={(val) => setForm({ ...form, wilaya: val })}
                  placeholder="Sélectionner la wilaya..."
                  icon={MapPin}
                  searchable={true}
                  options={ALGERIA_WILAYAS.map(w => ({ value: w, label: w }))}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: COLORS.navy, marginBottom: '6px' }}>Adresse *</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '10px 18px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, background: 'white', color: COLORS.text, fontWeight: '600', cursor: 'pointer' }}>
                  Annuler
                </button>
                <button type="submit" disabled={submitting} style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', background: COLORS.teal, color: 'white', fontWeight: '600', cursor: 'pointer' }}>
                  {submitting ? "Mise à jour..." : "Enregistrer les modifications"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Facility Details Modal */}
      {showDetailsModal && activeFacility && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6, 44, 84, 0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '100%', maxWidth: '500px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'fadeIn 0.2s' }}>
            <div style={{ padding: '20px 24px', backgroundColor: COLORS.navy, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: '700', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={20} color={COLORS.teal} /> Fiche de l'Établissement
              </div>
              <button onClick={() => setShowDetailsModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: COLORS.muted }}>Nom de l'établissement</div>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: COLORS.navy, marginTop: '2px' }}>{activeFacility.name}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: COLORS.muted }}>Type</div>
                  <div style={{ fontWeight: '700', color: COLORS.teal, marginTop: '2px' }}>{activeFacility.facility_type}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: COLORS.muted }}>Wilaya</div>
                  <div style={{ fontWeight: '700', color: COLORS.navy, marginTop: '2px' }}>{activeFacility.wilaya}</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: COLORS.muted }}>Adresse complète</div>
                <div style={{ fontWeight: '600', color: COLORS.text, marginTop: '2px' }}>{activeFacility.address}</div>
              </div>

              <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: COLORS.muted }}>Créé par :</span>
                  <span style={{ fontWeight: '700', color: COLORS.navy }}>
                    {activeFacility.creator?.first_name 
                      ? `${activeFacility.creator.first_name} ${activeFacility.creator.last_name}` 
                      : 'Autorité Sanitaire'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: COLORS.muted }}>Date de création :</span>
                  <span style={{ fontWeight: '600', color: COLORS.text }}>
                    {new Date(activeFacility.created_at).toLocaleString('fr-FR')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: COLORS.muted }}>Dernière mise à jour :</span>
                  <span style={{ fontWeight: '600', color: COLORS.text }}>
                    {new Date(activeFacility.updated_at).toLocaleString('fr-FR')}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button onClick={() => setShowDetailsModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: COLORS.navy, color: 'white', fontWeight: '600', cursor: 'pointer' }}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
