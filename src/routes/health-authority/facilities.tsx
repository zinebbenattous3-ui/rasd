import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/utils";
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
import { WILAYAS_LIST_NAMES as ALGERIA_WILAYAS } from "@/lib/wilayas";

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

// PUBLIC FACILITY TYPES ONLY FOR HEALTH AUTHORITY (NO PRIVATE CLINICS)
const PUBLIC_FACILITY_TYPES = ["EPSP", "EPH", "CHU"];
const PUBLIC_FACILITY_LABELS: Record<string, string> = {
  EPSP: "EPSP — Établissement Public de Santé de Proximité",
  EPH: "EPH — Établissement Public Hospitalier",
  CHU: "CHU — Centre Hospitalier Universitaire",
};

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

  // Form State for Add / Edit (PUBLIC SECTOR ONLY)
  const [form, setForm] = useState({
    name: "",
    facility_type: "EPSP",
    wilaya: "16 - Alger",
    address: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch facilities & creators (QUERY LEVEL FILTER: PUBLIC SECTOR ONLY)
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

      // QUERY-LEVEL FILTER: Fetch ONLY public facilities (EPSP, EPH, CHU)
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
        .in('facility_type', PUBLIC_FACILITY_TYPES)
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
      facility_type: "EPSP",
      wilaya: "16 - Alger",
      address: ""
    });
    setFormError(null);
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (fac: any) => {
    setActiveFacility(fac);
    setForm({
      name: fac.name || "",
      facility_type: PUBLIC_FACILITY_TYPES.includes(fac.facility_type) ? fac.facility_type : "EPSP",
      wilaya: fac.wilaya || "16 - Alger",
      address: fac.address || ""
    });
    setFormError(null);
    setShowEditModal(true);
  };

  // Handle Add Submit (Strictly public facility)
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Le nom de l'établissement est obligatoire.");
      return;
    }

    if (!PUBLIC_FACILITY_TYPES.includes(form.facility_type)) {
      setFormError("La Direction de la Santé gère exclusivement les établissements publics (CHU, EPH, EPSP).");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const { error } = await supabase
        .from('facilities')
        .insert([
          {
            name: form.name.trim(),
            facility_type: form.facility_type,
            wilaya: form.wilaya,
            address: form.address.trim() || null,
            created_by: currentUserId || null
          }
        ]);

      if (error) throw new Error(error.message);

      setShowAddModal(false);
      fetchFacilitiesData();
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de la création de l'établissement.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFacility) return;
    if (!form.name.trim()) {
      setFormError("Le nom de l'établissement est obligatoire.");
      return;
    }

    if (!PUBLIC_FACILITY_TYPES.includes(form.facility_type)) {
      setFormError("La Direction de la Santé gère exclusivement les établissements publics (CHU, EPH, EPSP).");
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
          address: form.address.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeFacility.id);

      if (error) throw new Error(error.message);

      setShowEditModal(false);
      fetchFacilitiesData();
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de la modification de l'établissement.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Facility
  const handleDeleteFacility = async (facId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet établissement ?")) return;

    try {
      const { error } = await supabase
        .from('facilities')
        .delete()
        .eq('id', facId);

      if (error) throw error;
      fetchFacilitiesData();
    } catch (err: any) {
      alert("Impossible de supprimer cet établissement : " + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
              <Building2 size={24} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: COLORS.navy, margin: 0, letterSpacing: '-0.02em' }}>
              Gestion des Établissements Publics
            </h2>
          </div>
          <p style={{ color: COLORS.muted, fontSize: '0.95rem', margin: 0 }}>
            Répertoire officiel des structures de santé publiques sous la responsabilité de la Direction de la Santé (EPSP, EPH, CHU).
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
              padding: '10px 20px',
              borderRadius: '10px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(15, 162, 155, 0.35)'
            }}
          >
            <Plus size={18} />
            Ajouter un Établissement Public
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 16px rgba(0,0,0,0.02)', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '240px' }}>
          <Search size={18} color={COLORS.muted} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Rechercher par nom, wilaya, adresse..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 42px',
              borderRadius: '10px',
              border: `1px solid ${COLORS.border}`,
              fontSize: '0.9rem',
              outline: 'none',
              backgroundColor: COLORS.bgLight
            }}
          />
        </div>

        {/* Filter Dropdowns */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {/* Type Filter */}
          <SelectDropdown
            value={selectedType}
            onChange={setSelectedType}
            options={[
              { value: 'ALL', label: 'Tous les types publics' },
              { value: 'EPSP', label: 'EPSP — Proximité' },
              { value: 'EPH', label: 'EPH — Hospitalier' },
              { value: 'CHU', label: 'CHU — Universitaire' }
            ]}
          />

          {/* Wilaya Filter */}
          <SelectDropdown
            value={selectedWilaya}
            onChange={setSelectedWilaya}
            options={[
              { value: 'ALL', label: 'Toutes les wilayas' },
              ...ALGERIA_WILAYAS.map(w => ({ value: w, label: w }))
            ]}
          />

          {/* Creator Filter */}
          <SelectDropdown
            value={selectedCreator}
            onChange={setSelectedCreator}
            options={[
              { value: 'ALL', label: 'Tous les créateurs' },
              ...creatorsList.map(c => ({ value: c.id, label: c.name }))
            ]}
          />

          {(searchQuery || selectedType !== 'ALL' || selectedWilaya !== 'ALL' || selectedCreator !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedType('ALL');
                setSelectedWilaya('ALL');
                setSelectedCreator('ALL');
              }}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: COLORS.teal,
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                padding: '8px 12px'
              }}
            >
              Réinitialiser
            </button>
          )}
        </div>

      </div>

      {/* Facilities Grid */}
      {loading ? (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '4rem', textAlign: 'center', color: COLORS.muted, border: `1px solid ${COLORS.border}` }}>
          Chargement du répertoire des établissements publics...
        </div>
      ) : filteredFacilities.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '4rem', textAlign: 'center', color: COLORS.muted, border: `1px solid ${COLORS.border}` }}>
          Aucun établissement public ne correspond à vos critères de recherche.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredFacilities.map((fac) => {
            const creatorName = fac.creator?.first_name 
              ? `${fac.creator.first_name} ${fac.creator.last_name}`.trim()
              : "Direction de la Santé";

            return (
              <div
                key={fac.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  border: `1px solid ${COLORS.border}`,
                  padding: '22px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <span style={{
                      backgroundColor: COLORS.lightTeal,
                      color: COLORS.teal,
                      fontSize: '0.78rem',
                      fontWeight: '800',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {fac.facility_type}
                    </span>

                    <span style={{ fontSize: '0.8rem', color: COLORS.muted, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} color={COLORS.teal} /> {fac.wilaya}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: COLORS.navy, margin: '0 0 8px 0', lineHeight: '1.3' }}>
                    {fac.name}
                  </h3>

                  {fac.address && (
                    <p style={{ fontSize: '0.85rem', color: COLORS.muted, margin: '0 0 14px 0', lineHeight: '1.4' }}>
                      {fac.address}
                    </p>
                  )}

                  <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: '12px', fontSize: '0.78rem', color: COLORS.muted, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserCheck size={14} color={COLORS.teal} /> Créé par : <strong style={{ color: COLORS.navy }}>{creatorName}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} color={COLORS.muted} /> Enregistré le : {formatDateTime(fac.created_at)}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', borderTop: `1px solid ${COLORS.border}`, paddingTop: '14px' }}>
                  <button
                    onClick={() => {
                      setActiveFacility(fac);
                      setShowDetailsModal(true);
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: COLORS.bgLight,
                      color: COLORS.navy,
                      border: `1px solid ${COLORS.border}`,
                      padding: '8px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <Eye size={15} /> Détails
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(fac)}
                    style={{
                      backgroundColor: COLORS.bgLight,
                      color: COLORS.teal,
                      border: `1px solid ${COLORS.border}`,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Edit3 size={15} /> Éditer
                  </button>

                  <button
                    onClick={() => handleDeleteFacility(fac.id)}
                    style={{
                      backgroundColor: '#FEF2F2',
                      color: '#DC2626',
                      border: '1px solid #FCA5A5',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Ajouter un Établissement Public */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6, 44, 84, 0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '100%', maxWidth: '520px', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
                  <Building2 size={20} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: COLORS.navy, margin: 0 }}>
                  Nouveau Établissement Public
                </h3>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted }}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} /> {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>
                  Nom de l'établissement public *
                </label>
                <input
                  type="text"
                  placeholder="ex: CHU Mustapha Pacha, EPH Bologhine..."
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>
                    Type d'Établissement (Secteur Public) *
                  </label>
                  <select
                    value={form.facility_type}
                    onChange={(e) => setForm({ ...form, facility_type: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '0.9rem', outline: 'none', backgroundColor: 'white' }}
                  >
                    {PUBLIC_FACILITY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {PUBLIC_FACILITY_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>
                    Wilaya *
                  </label>
                  <select
                    value={form.wilaya}
                    onChange={(e) => setForm({ ...form, wilaya: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '0.9rem', outline: 'none', backgroundColor: 'white' }}
                  >
                    {ALGERIA_WILAYAS.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>
                  Adresse complète
                </label>
                <textarea
                  placeholder="Adresse géographique exacte..."
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ backgroundColor: COLORS.bgLight, border: `1px solid ${COLORS.border}`, color: COLORS.navy, padding: '10px 18px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{ backgroundColor: COLORS.teal, border: 'none', color: 'white', padding: '10px 22px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}
                >
                  {submitting ? "Enregistrement..." : "Créer l'établissement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Éditer un Établissement Public */}
      {showEditModal && activeFacility && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6, 44, 84, 0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '100%', maxWidth: '520px', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: COLORS.navy, margin: 0 }}>
                Modifier l'Établissement Public
              </h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted }}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>
                  Nom de l'établissement public *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>
                    Type *
                  </label>
                  <select
                    value={form.facility_type}
                    onChange={(e) => setForm({ ...form, facility_type: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '0.9rem', outline: 'none', backgroundColor: 'white' }}
                  >
                    {PUBLIC_FACILITY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {PUBLIC_FACILITY_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>
                    Wilaya *
                  </label>
                  <select
                    value={form.wilaya}
                    onChange={(e) => setForm({ ...form, wilaya: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '0.9rem', outline: 'none', backgroundColor: 'white' }}
                  >
                    {ALGERIA_WILAYAS.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>
                  Adresse
                </label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{ backgroundColor: COLORS.bgLight, border: `1px solid ${COLORS.border}`, color: COLORS.navy, padding: '10px 18px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{ backgroundColor: COLORS.teal, border: 'none', color: 'white', padding: '10px 22px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}
                >
                  {submitting ? "Mise à jour..." : "Enregistrer les modifications"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Détails d'un Établissement */}
      {showDetailsModal && activeFacility && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6, 44, 84, 0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '100%', maxWidth: '500px', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: COLORS.teal, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {activeFacility.facility_type} • Wilaya {activeFacility.wilaya}
                </span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: COLORS.navy, margin: '4px 0 0 0' }}>
                  {activeFacility.name}
                </h3>
              </div>
              <button onClick={() => setShowDetailsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: COLORS.bgLight, padding: '16px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase' }}>Adresse géographique</div>
                <div style={{ fontSize: '0.9rem', color: COLORS.navy, fontWeight: '600', marginTop: '2px' }}>
                  {activeFacility.address || "Non renseignée"}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase' }}>Créé par</div>
                <div style={{ fontSize: '0.9rem', color: COLORS.navy, fontWeight: '600', marginTop: '2px' }}>
                  {activeFacility.creator?.first_name ? `${activeFacility.creator.first_name} ${activeFacility.creator.last_name}` : "Direction de la Santé"}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase' }}>Date d'enregistrement</div>
                <div style={{ fontSize: '0.9rem', color: COLORS.navy, fontWeight: '600', marginTop: '2px' }}>
                  {formatDateTime(activeFacility.created_at)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDetailsModal(false)}
                style={{ backgroundColor: COLORS.navy, color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
