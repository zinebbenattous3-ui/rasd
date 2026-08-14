import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/utils";
import { 
  Clock, 
  Search, 
  Building2, 
  Stethoscope, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  X,
  ChevronDown,
  RotateCcw,
  Check,
  AlertCircle,
  Filter
} from "lucide-react";

export const Route = createFileRoute("/health-authority/doctors")({
  component: HealthAuthorityDoctorsPage,
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

// PUBLIC FACILITY TYPES FOR HEALTH AUTHORITY ONLY
const PUBLIC_FACILITY_TYPES = ["CHU", "EPH", "EPSP"];

// Reusable Custom Dropdown Component
function CustomDropdown({
  icon: Icon,
  options,
  value,
  onChange,
  placeholder = "Sélectionner..."
}: {
  icon?: any;
  options: { value: string; label: string; dotColor?: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.custom-dropdown-wrapper')) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="custom-dropdown-wrapper" style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        style={{
          width: '100%',
          padding: '11px 16px',
          borderRadius: '12px',
          border: `1px solid ${value !== 'ALL' ? COLORS.teal : COLORS.border}`,
          backgroundColor: value !== 'ALL' ? COLORS.lightTeal : 'white',
          color: COLORS.navy,
          fontWeight: '600',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          boxShadow: open ? '0 0 0 3px rgba(15,162,155,0.15)' : '0 2px 5px rgba(0,0,0,0.02)',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {Icon && <Icon size={16} color={value !== 'ALL' ? COLORS.teal : COLORS.muted} />}
          {selectedOption?.dotColor && (
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: selectedOption.dotColor, flexShrink: 0 }} />
          )}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedOption?.label || placeholder}</span>
        </div>
        <ChevronDown size={16} color={COLORS.muted} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          borderRadius: '14px',
          border: `1px solid ${COLORS.border}`,
          boxShadow: '0 12px 30px -4px rgba(6, 44, 84, 0.15)',
          zIndex: 100,
          padding: '6px',
          maxHeight: '260px',
          overflowY: 'auto'
        }}>
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  fontWeight: isSelected ? '700' : '500',
                  color: isSelected ? COLORS.navy : COLORS.text,
                  backgroundColor: isSelected ? COLORS.lightTeal : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'background-color 0.1s'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {opt.dotColor && (
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: opt.dotColor, flexShrink: 0 }} />
                  )}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{opt.label}</span>
                </div>
                {isSelected && <Check size={16} color={COLORS.teal} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HealthAuthorityDoctorsPage() {
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [responsibleFacilities, setResponsibleFacilities] = useState<any[]>([]);

  // Doctors & Stats
  const [doctors, setDoctors] = useState<any[]>([]);
  const [stats, setStats] = useState({ pending: 0, accepted: 0, rejected: 0 });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("PENDING");
  const [selectedFacility, setSelectedFacility] = useState<string>("ALL");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("ALL");

  // Modals & Drawer State
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  
  // Feedback Toast & Action loading
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Auto-dismiss Toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Load Health Authority's public facilities & linked public-sector doctors strictly
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Get current Health Authority user ID
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

      // 2. Fetch PUBLIC facilities ONLY (CHU, EPH, EPSP) - strict query-level filter
      const { data: facsData } = await supabase
        .from('facilities')
        .select('id, name, wilaya, facility_type')
        .in('facility_type', PUBLIC_FACILITY_TYPES);

      const publicFacs = facsData || [];
      setResponsibleFacilities(publicFacs);

      const publicFacIds = publicFacs.map(f => f.id);

      if (publicFacIds.length === 0) {
        setDoctors([]);
        setStats({ pending: 0, accepted: 0, rejected: 0 });
        setLoading(false);
        return;
      }

      // 3. Fetch doctors belonging strictly to PUBLIC facilities
      const { data: docsData, error: docsError } = await supabase
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
        .in('facility_id', publicFacIds)
        .order('created_at', { ascending: false });

      if (!docsError && docsData) {
        // Double guarantee query level filter for public facility types
        const publicDocs = docsData.filter(d => d.facility && PUBLIC_FACILITY_TYPES.includes(d.facility.facility_type));
        setDoctors(publicDocs);

        const pending = publicDocs.filter(d => d.status === 'PENDING').length;
        const accepted = publicDocs.filter(d => d.status === 'ACCEPTED').length;
        const rejected = publicDocs.filter(d => d.status === 'REJECTED').length;
        setStats({ pending, accepted, rejected });
      }
    } catch (err) {
      console.error("Error loading doctors data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Open Doctor Details Drawer
  const handleOpenDoctorDrawer = (doc: any) => {
    setSelectedDoctor(doc);
    setShowDrawer(true);
  };

  // Handle Accept Doctor (Public sector)
  const handleConfirmAccept = async () => {
    if (!selectedDoctor) return;
    setSubmittingAction(true);
    setActionError(null);

    try {
      const now = new Date().toISOString();

      const { error: updateErr } = await supabase
        .from('doctors')
        .update({
          status: 'ACCEPTED',
          verified_at: now,
          verified_by_facility: selectedDoctor.facility_id,
          updated_at: now
        })
        .eq('id', selectedDoctor.id);

      if (updateErr) throw new Error(updateErr.message);

      setShowAcceptModal(false);
      setShowDrawer(false);
      setToast({ message: "✓ Médecin du secteur public accepté", type: 'success' });
      loadData();
    } catch (err: any) {
      setActionError(err.message || "Erreur lors de la validation.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Reject Doctor
  const handleConfirmReject = async () => {
    if (!selectedDoctor) return;
    setSubmittingAction(true);
    setActionError(null);

    try {
      const now = new Date().toISOString();

      const { error: updateErr } = await supabase
        .from('doctors')
        .update({
          status: 'REJECTED',
          updated_at: now
        })
        .eq('id', selectedDoctor.id);

      if (updateErr) throw new Error(updateErr.message);

      setShowRejectModal(false);
      setShowDrawer(false);
      setToast({ message: "✓ Demande refusée", type: 'success' });
      loadData();
    } catch (err: any) {
      setActionError(err.message || "Erreur lors du refus.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Specialties for filter dropdown
  const uniqueSpecialties = Array.from(new Set(doctors.map(d => d.specialty).filter(Boolean)));

  // Filtering Logic
  const filteredDoctors = doctors.filter((doc) => {
    const q = searchQuery.toLowerCase();
    const docName = `${doc.users?.first_name || ''} ${doc.users?.last_name || ''}`.toLowerCase();
    const docEmail = (doc.users?.email || '').toLowerCase();
    const docNin = (doc.nin || '').toLowerCase();
    const docSpec = (doc.specialty || '').toLowerCase();
    const facName = (doc.facility?.name || '').toLowerCase();

    const matchesQuery = 
      docName.includes(q) ||
      docEmail.includes(q) ||
      docNin.includes(q) ||
      docSpec.includes(q) ||
      facName.includes(q);

    const matchesStatus = selectedStatus === "ALL" || doc.status === selectedStatus;
    const matchesFacility = selectedFacility === "ALL" || doc.facility_id === selectedFacility;
    const matchesSpecialty = selectedSpecialty === "ALL" || doc.specialty === selectedSpecialty;

    return matchesQuery && matchesStatus && matchesFacility && matchesSpecialty;
  });

  const isFilterActive = searchQuery.trim() !== "" || selectedStatus !== "ALL" || selectedFacility !== "ALL" || selectedSpecialty !== "ALL";

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedStatus("ALL");
    setSelectedFacility("ALL");
    setSelectedSpecialty("ALL");
  };

  const getDoctorFullName = (doc: any) => {
    if (!doc?.users) return "Médecin";
    const fn = (doc.users.first_name || '').trim();
    const ln = (doc.users.last_name || '').trim();
    
    if (fn && ln && fn !== "1" && ln !== "1") {
      return `${fn} ${ln}`;
    }

    if (doc.users.email) {
      const emailPrefix = doc.users.email.split('@')[0];
      const cleanName = emailPrefix.replace(/[0-9]/g, '');
      if (cleanName.length > 2) {
        return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      }
      return emailPrefix;
    }
    return "Médecin";
  };

  const statusOptions = [
    { value: 'ALL', label: 'Tous les statuts' },
    { value: 'PENDING', label: 'En attente', dotColor: '#D97706' },
    { value: 'ACCEPTED', label: 'Acceptés', dotColor: '#15803D' },
    { value: 'REJECTED', label: 'Refusés', dotColor: '#DC2626' },
  ];

  const facilityOptions = [
    { value: 'ALL', label: 'Tous les établissements publics' },
    ...responsibleFacilities.map(f => ({ value: f.id, label: `${f.name} (${f.facility_type})` }))
  ];

  const specialtyOptions = [
    { value: 'ALL', label: 'Toutes les spécialités' },
    ...uniqueSpecialties.map(s => ({ value: s, label: s }))
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
          {toast.type === 'success' ? <CheckCircle2 size={18} color="#34D399" /> : <AlertCircle size={18} color="#FCA5A5" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
              <Stethoscope size={24} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: COLORS.navy, margin: 0, letterSpacing: '-0.02em' }}>
              Vérification des Médecins du Secteur Public
            </h2>
          </div>
          <p style={{ color: COLORS.muted, fontSize: '0.95rem', margin: 0 }}>
            Instruction et validation exclusive des praticiens de santé rattachés aux structures publiques (CHU, EPH, EPSP).
          </p>
        </div>

        <button
          onClick={loadData}
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
      </div>

      {/* Statistics Cards (Strictly Public Sector) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div 
          onClick={() => setSelectedStatus("PENDING")}
          style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '16px',
            border: selectedStatus === "PENDING" ? `2px solid #D97706` : `1px solid ${COLORS.border}`,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>En Attente (Public)</span>
            <Clock size={18} color="#D97706" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#B45309', marginTop: '10px' }}>{stats.pending}</div>
          <div style={{ fontSize: '0.78rem', color: COLORS.muted, marginTop: '4px' }}>CHU · EPH · EPSP</div>
        </div>

        <div 
          onClick={() => setSelectedStatus("ACCEPTED")}
          style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '16px',
            border: selectedStatus === "ACCEPTED" ? `2px solid ${COLORS.teal}` : `1px solid ${COLORS.border}`,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Acceptés (Public)</span>
            <CheckCircle2 size={18} color="#15803D" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#15803D', marginTop: '10px' }}>{stats.accepted}</div>
          <div style={{ fontSize: '0.78rem', color: COLORS.muted, marginTop: '4px' }}>Profils publics vérifiés</div>
        </div>

        <div 
          onClick={() => setSelectedStatus("REJECTED")}
          style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '16px',
            border: selectedStatus === "REJECTED" ? `2px solid #DC2626` : `1px solid ${COLORS.border}`,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Refusés</span>
            <XCircle size={18} color="#DC2626" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#DC2626', marginTop: '10px' }}>{stats.rejected}</div>
          <div style={{ fontSize: '0.78rem', color: COLORS.muted, marginTop: '4px' }}>Demandes non validées</div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: `1px solid ${COLORS.border}`, padding: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} color={COLORS.muted} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Rechercher un médecin, NIN, spécialité..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px 11px 42px',
                borderRadius: '12px',
                border: `1px solid ${COLORS.border}`,
                fontSize: '0.9rem',
                outline: 'none',
                backgroundColor: COLORS.bgLight,
                color: COLORS.navy
              }}
            />
          </div>

          <CustomDropdown
            icon={Filter}
            options={statusOptions}
            value={selectedStatus}
            onChange={setSelectedStatus}
            placeholder="Statut..."
          />

          <CustomDropdown
            icon={Building2}
            options={facilityOptions}
            value={selectedFacility}
            onChange={setSelectedFacility}
            placeholder="Établissements publics"
          />

          <CustomDropdown
            icon={Stethoscope}
            options={specialtyOptions}
            value={selectedSpecialty}
            onChange={setSelectedSpecialty}
            placeholder="Spécialités"
          />
        </div>

        {isFilterActive && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${COLORS.border}`, paddingTop: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: COLORS.muted, fontWeight: '600' }}>Filtres actifs :</span>
              {selectedStatus !== "ALL" && (
                <span style={{ backgroundColor: COLORS.lightTeal, color: COLORS.teal, padding: '4px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  Statut : {selectedStatus}
                  <X size={14} style={{ cursor: 'pointer' }} onClick={() => setSelectedStatus("ALL")} />
                </span>
              )}
            </div>

            <button
              onClick={resetFilters}
              style={{ background: 'none', border: 'none', color: COLORS.teal, cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RotateCcw size={14} /> Réinitialiser
            </button>
          </div>
        )}
      </div>

      {/* Doctor List Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: `1px solid ${COLORS.border}`, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: COLORS.muted }}>Chargement des requêtes médicales publiques...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: `1px solid ${COLORS.border}` }}>
              <tr>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Médecin</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Spécialité</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Établissement Public</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>NIN / Tél</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Statut</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date d'inscription</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDoctors.map((doc, idx) => {
                const fullName = getDoctorFullName(doc);
                const email = doc.users?.email || "";

                return (
                  <tr key={doc.id} style={{ borderBottom: idx !== filteredDoctors.length - 1 ? `1px solid ${COLORS.border}` : 'none' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '0.95rem' }}>Dr. {fullName}</div>
                      <div style={{ fontSize: '0.8rem', color: COLORS.muted }}>{email}</div>
                    </td>

                    <td style={{ padding: '16px 20px', color: COLORS.text, fontWeight: '600', fontSize: '0.9rem' }}>
                      {doc.specialty}
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: '600', color: COLORS.navy, fontSize: '0.88rem' }}>{doc.facility?.name || '—'}</div>
                      <div style={{ fontSize: '0.78rem', color: COLORS.teal, fontWeight: '700' }}>{doc.facility?.facility_type} • Wilaya {doc.facility?.wilaya || '—'}</div>
                    </td>

                    <td style={{ padding: '16px 20px', fontSize: '0.85rem', color: COLORS.text }}>
                      <div>NIN: <strong>{doc.nin}</strong></div>
                      <div style={{ color: COLORS.muted }}>Tél: {doc.phone}</div>
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      {doc.status === 'PENDING' && (
                        <span style={{ backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D', padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          ● En attente
                        </span>
                      )}
                      {doc.status === 'ACCEPTED' && (
                        <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          ● Accepté
                        </span>
                      )}
                      {doc.status === 'REJECTED' && (
                        <span style={{ backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5', padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          ● Refusé
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '16px 20px', color: COLORS.muted, fontSize: '0.85rem' }}>
                      {formatDateTime(doc.created_at)}
                    </td>

                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenDoctorDrawer(doc)}
                        style={{ padding: '6px 12px', border: `1px solid ${COLORS.border}`, borderRadius: '8px', background: 'white', color: COLORS.navy, fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Eye size={15} color={COLORS.teal} /> Examiner
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredDoctors.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem', color: COLORS.muted }}>
                    Aucune demande d'inscription médicale publique ne correspond à vos critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Doctor Review Drawer */}
      {showDrawer && selectedDoctor && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6, 44, 84, 0.5)', zIndex: 100, display: 'flex', justifyContent: 'flex-end', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', width: '100%', maxWidth: '540px', height: '100%', overflowY: 'auto', boxShadow: '-10px 0 30px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px', backgroundColor: COLORS.navy, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: COLORS.teal, textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>Dossier Médical (Secteur Public)</div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '800', margin: '4px 0 0 0' }}>
                  Dr. {getDoctorFullName(selectedDoctor)}
                </h3>
              </div>
              <button onClick={() => setShowDrawer(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: `1px solid ${COLORS.border}` }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase' }}>Email</div>
                  <div style={{ fontWeight: '600', color: COLORS.navy, fontSize: '0.9rem', marginTop: '2px' }}>{selectedDoctor.users?.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase' }}>Téléphone</div>
                  <div style={{ fontWeight: '600', color: COLORS.navy, fontSize: '0.9rem', marginTop: '2px' }}>{selectedDoctor.phone}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase' }}>Spécialité</div>
                  <div style={{ fontWeight: '700', color: COLORS.teal, fontSize: '0.92rem', marginTop: '2px' }}>{selectedDoctor.specialty}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase' }}>NIN</div>
                  <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '0.92rem', marginTop: '2px' }}>{selectedDoctor.nin}</div>
                </div>
              </div>

              <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', marginBottom: '4px' }}>Établissement Public Rattaché</div>
                <div style={{ fontSize: '1.05rem', fontWeight: '800', color: COLORS.navy }}>{selectedDoctor.facility?.name}</div>
                <div style={{ fontSize: '0.85rem', color: COLORS.teal, fontWeight: '700', marginTop: '2px' }}>
                  {selectedDoctor.facility?.facility_type} • Wilaya {selectedDoctor.facility?.wilaya}
                </div>
              </div>

              {selectedDoctor.status === 'PENDING' && (
                <div style={{ marginTop: 'auto', display: 'flex', gap: '12px', paddingTop: '20px', borderTop: `1px solid ${COLORS.border}` }}>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    style={{ flex: 1, padding: '12px', backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Refuser
                  </button>

                  <button
                    onClick={() => setShowAcceptModal(true)}
                    style={{ flex: 1, padding: '12px', backgroundColor: COLORS.teal, color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Accepter & Valider
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal Accept */}
      {showAcceptModal && selectedDoctor && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6, 44, 84, 0.5)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '100%', maxWidth: '440px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: COLORS.navy, margin: '0 0 10px 0' }}>
              Valider l'inscription médicale
            </h3>
            <p style={{ fontSize: '0.9rem', color: COLORS.text, marginBottom: '20px' }}>
              Voulez-vous confirmer l'inscription du <strong>Dr. {getDoctorFullName(selectedDoctor)}</strong> au sein de l'établissement public <strong>{selectedDoctor.facility?.name}</strong> ?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowAcceptModal(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, background: 'white', fontWeight: '600', cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleConfirmAccept} disabled={submittingAction} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: COLORS.teal, color: 'white', fontWeight: '700', cursor: 'pointer' }}>
                {submittingAction ? "Enregistrement..." : "Confirmer la validation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal Reject */}
      {showRejectModal && selectedDoctor && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6, 44, 84, 0.5)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '100%', maxWidth: '440px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#DC2626', margin: '0 0 10px 0' }}>
              Refuser la demande
            </h3>
            <p style={{ fontSize: '0.9rem', color: COLORS.text, marginBottom: '20px' }}>
              Voulez-vous rejeter la demande d'inscription du <strong>Dr. {getDoctorFullName(selectedDoctor)}</strong> ?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowRejectModal(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, background: 'white', fontWeight: '600', cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleConfirmReject} disabled={submittingAction} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#DC2626', color: 'white', fontWeight: '700', cursor: 'pointer' }}>
                {submittingAction ? "Traitement..." : "Confirmer le refus"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
