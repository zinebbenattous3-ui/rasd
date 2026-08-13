import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
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

// Reusable Ultra-Modern Custom Dropdown Component
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
          overflowY: 'auto',
          animation: 'fadeIn 0.15s ease-out'
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
  const [selectedStatus, setSelectedStatus] = useState<string>("PENDING"); // Default prioritizes PENDING
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

  // Load Health Authority's responsible facilities & linked doctors
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

      if (!authData?.user_id) {
        setLoading(false);
        return;
      }

      const uid = authData.user_id;
      setCurrentUserId(uid);

      // 2. Fetch facilities created by / assigned to this Health Authority
      const { data: facsData } = await supabase
        .from('facilities')
        .select('id, name, wilaya, facility_type')
        .eq('created_by', uid);

      let facIds: string[] = [];
      if (facsData && facsData.length > 0) {
        facIds = facsData.map(f => f.id);
        setResponsibleFacilities(facsData);
      } else {
        // Fallback: If no facilities created by this specific user yet, query all facilities for demonstration
        const { data: allFacs } = await supabase.from('facilities').select('id, name, wilaya, facility_type');
        if (allFacs) {
          facIds = allFacs.map(f => f.id);
          setResponsibleFacilities(allFacs);
        }
      }

      if (facIds.length === 0) {
        setDoctors([]);
        setLoading(false);
        return;
      }

      // 3. Fetch doctors belonging strictly to responsible facilities
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
        .in('facility_id', facIds)
        .order('created_at', { ascending: false });

      if (!docsError && docsData) {
        setDoctors(docsData);

        const pending = docsData.filter(d => d.status === 'PENDING').length;
        const accepted = docsData.filter(d => d.status === 'ACCEPTED').length;
        const rejected = docsData.filter(d => d.status === 'REJECTED').length;
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

  // Handle Accept Doctor
  const handleConfirmAccept = async () => {
    if (!selectedDoctor || !currentUserId) return;
    setSubmittingAction(true);
    setActionError(null);

    try {
      const now = new Date().toISOString();

      // Update doctor status to ACCEPTED
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
      setToast({ message: "✓ Médecin accepté", type: 'success' });
      loadData();
    } catch (err: any) {
      setActionError(err.message || "Erreur lors de la validation.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Reject Doctor
  const handleConfirmReject = async () => {
    if (!selectedDoctor || !currentUserId) return;
    setSubmittingAction(true);
    setActionError(null);

    try {
      const now = new Date().toISOString();

      // Update doctor status to REJECTED
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

  // Check if any filter is active (non-default)
  const isFilterActive = searchQuery.trim() !== "" || selectedStatus !== "ALL" || selectedFacility !== "ALL" || selectedSpecialty !== "ALL";

  // Reset active filters
  const resetFilters = () => {
    setSearchQuery("");
    setSelectedStatus("ALL");
    setSelectedFacility("ALL");
    setSelectedSpecialty("ALL");
  };

  // Format Doctor Full Name cleanly (Fallback if DB has placeholder "1")
  const getDoctorFullName = (doc: any) => {
    if (!doc?.users) return "Médecin";
    const fn = (doc.users.first_name || '').trim();
    const ln = (doc.users.last_name || '').trim();
    
    // Check if real names exist and are not placeholder "1"
    if (fn && ln && fn !== "1" && ln !== "1") {
      return `${fn} ${ln}`;
    }

    // Fall back to clean email prefix
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

  // Status Filter Options
  const statusOptions = [
    { value: 'ALL', label: 'Tous les statuts' },
    { value: 'PENDING', label: 'En attente', dotColor: '#D97706' },
    { value: 'ACCEPTED', label: 'Acceptés', dotColor: '#15803D' },
    { value: 'REJECTED', label: 'Refusés', dotColor: '#DC2626' },
  ];

  // Facility Filter Options
  const facilityOptions = [
    { value: 'ALL', label: 'Toutes les structures' },
    ...responsibleFacilities.map(f => ({ value: f.id, label: `${f.name} (${f.wilaya})` }))
  ];

  // Specialty Filter Options
  const specialtyOptions = [
    { value: 'ALL', label: 'Toutes les spécialités' },
    ...uniqueSpecialties.map(s => ({ value: s, label: s }))
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Feedback Notification */}
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
          gap: '10px',
          animation: 'fadeIn 0.2s'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} color="#34D399" /> : <AlertCircle size={18} color="#FCA5A5" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header & Subtitle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
              <Stethoscope size={24} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: COLORS.navy, margin: 0, letterSpacing: '-0.02em' }}>
              Vérification des Médecins
            </h2>
          </div>
          <p style={{ color: COLORS.muted, fontSize: '0.95rem', margin: 0 }}>
            Examinez et validez les demandes d'inscription des médecins rattachés à vos établissements.
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

      {/* Statistics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Pending Card */}
        <div 
          onClick={() => setSelectedStatus("PENDING")}
          style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '16px',
            border: selectedStatus === "PENDING" ? `2px solid #D97706` : `1px solid ${COLORS.border}`,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.02)',
            transition: 'all 0.15s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>En Attente</span>
            <Clock size={18} color="#D97706" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#B45309', marginTop: '10px' }}>{stats.pending}</div>
          <div style={{ fontSize: '0.78rem', color: COLORS.muted, marginTop: '4px' }}>Demandes à examiner</div>
        </div>

        {/* Accepted Card */}
        <div 
          onClick={() => setSelectedStatus("ACCEPTED")}
          style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '16px',
            border: selectedStatus === "ACCEPTED" ? `2px solid ${COLORS.teal}` : `1px solid ${COLORS.border}`,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.02)',
            transition: 'all 0.15s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Acceptés</span>
            <CheckCircle2 size={18} color="#15803D" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#15803D', marginTop: '10px' }}>{stats.accepted}</div>
          <div style={{ fontSize: '0.78rem', color: COLORS.muted, marginTop: '4px' }}>Profils vérifiés</div>
        </div>

        {/* Rejected Card */}
        <div 
          onClick={() => setSelectedStatus("REJECTED")}
          style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '16px',
            border: selectedStatus === "REJECTED" ? `2px solid #DC2626` : `1px solid ${COLORS.border}`,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.02)',
            transition: 'all 0.15s'
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

      {/* ULTRA-MODERN TOOLBAR & CUSTOM POPOVER DROPDOWNS */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: `1px solid ${COLORS.border}`, padding: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Search Bar & Custom Interactive Dropdowns Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', alignItems: 'center' }}>
          {/* Integrated Search Input */}
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
                color: COLORS.navy,
                transition: 'all 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.backgroundColor = 'white';
                e.target.style.borderColor = COLORS.teal;
              }}
              onBlur={(e) => {
                e.target.style.backgroundColor = COLORS.bgLight;
                e.target.style.borderColor = COLORS.border;
              }}
            />
          </div>

          {/* Custom Statut Popover Dropdown */}
          <CustomDropdown
            icon={Filter}
            options={statusOptions}
            value={selectedStatus}
            onChange={setSelectedStatus}
            placeholder="Statut..."
          />

          {/* Custom Facility Popover Dropdown */}
          <CustomDropdown
            icon={Building2}
            options={facilityOptions}
            value={selectedFacility}
            onChange={setSelectedFacility}
            placeholder="Toutes les structures"
          />

          {/* Custom Specialty Popover Dropdown */}
          <CustomDropdown
            icon={Stethoscope}
            options={specialtyOptions}
            value={selectedSpecialty}
            onChange={setSelectedSpecialty}
            placeholder="Toutes les spécialités"
          />
        </div>

        {/* Active Filter Chips & Reset */}
        {isFilterActive && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${COLORS.border}`, paddingTop: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: COLORS.muted, fontWeight: '600' }}>Filtres actifs :</span>
              
              {selectedStatus !== "ALL" && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: COLORS.lightTeal, color: COLORS.teal, padding: '4px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '700' }}>
                  Statut : {selectedStatus === 'PENDING' ? 'En attente' : selectedStatus === 'ACCEPTED' ? 'Acceptés' : 'Refusés'}
                  <X size={14} style={{ cursor: 'pointer' }} onClick={() => setSelectedStatus("ALL")} />
                </span>
              )}

              {selectedFacility !== "ALL" && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: COLORS.lightTeal, color: COLORS.teal, padding: '4px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '700' }}>
                  Structure : {responsibleFacilities.find(f => f.id === selectedFacility)?.name || 'Sélectionnée'}
                  <X size={14} style={{ cursor: 'pointer' }} onClick={() => setSelectedFacility("ALL")} />
                </span>
              )}

              {selectedSpecialty !== "ALL" && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: COLORS.lightTeal, color: COLORS.teal, padding: '4px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '700' }}>
                  Spécialité : {selectedSpecialty}
                  <X size={14} style={{ cursor: 'pointer' }} onClick={() => setSelectedSpecialty("ALL")} />
                </span>
              )}

              {searchQuery.trim() !== "" && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#F1F5F9', color: COLORS.navy, padding: '4px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '700' }}>
                  Recherche : "{searchQuery}"
                  <X size={14} style={{ cursor: 'pointer' }} onClick={() => setSearchQuery("")} />
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
          <div style={{ padding: '4rem', textAlign: 'center', color: COLORS.muted }}>Chargement des requêtes médicales...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: `1px solid ${COLORS.border}` }}>
              <tr>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Médecin</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Spécialité</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Établissement</th>
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
                      <div style={{ fontSize: '0.78rem', color: COLORS.muted }}>{doc.facility?.wilaya || '—'}</div>
                    </td>

                    <td style={{ padding: '16px 20px', fontSize: '0.85rem', color: COLORS.text }}>
                      <div>NIN: <strong>{doc.nin}</strong></div>
                      <div style={{ color: COLORS.muted }}>Tél: {doc.phone}</div>
                    </td>

                    {/* Compact Refined Status Badges */}
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
                    Aucune demande d'inscription médicale ne correspond à vos critères.
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
                <div style={{ fontSize: '0.78rem', color: COLORS.teal, textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>Fiche Médicale</div>
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
                <div style={{ fontSize: '0.78rem', fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', marginBottom: '4px' }}>Établissement</div>
                <div style={{ fontSize: '1rem', fontWeight: '800', color: COLORS.navy }}>{selectedDoctor.facility?.name || 'Non spécifié'}</div>
                <div style={{ fontSize: '0.82rem', color: COLORS.muted, marginTop: '2px' }}>{selectedDoctor.facility?.facility_type} • Wilaya de {selectedDoctor.facility?.wilaya}</div>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: 'auto', borderTop: `1px solid ${COLORS.border}`, paddingTop: '20px', display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    setActionError(null);
                    setShowAcceptModal(true);
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: COLORS.teal,
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <CheckCircle2 size={18} /> Accepter le médecin
                </button>

                <button
                  onClick={() => {
                    setActionError(null);
                    setShowRejectModal(true);
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #FECACA',
                    backgroundColor: '#FEF2F2',
                    color: '#DC2626',
                    fontWeight: '700',
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <XCircle size={18} /> Refuser la demande
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. SIMPLE & FOCUSED ACCEPTANCE CONFIRMATION MODAL */}
      {showAcceptModal && selectedDoctor && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6, 44, 84, 0.5)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '20px 24px', backgroundColor: COLORS.navy, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: '700', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={20} color={COLORS.teal} /> Confirmer l’acceptation
              </div>
              <button onClick={() => setShowAcceptModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {actionError && (
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.85rem' }}>
                  {actionError}
                </div>
              )}

              <p style={{ fontSize: '0.98rem', color: COLORS.text, lineHeight: '1.6', margin: 0 }}>
                Vous êtes sur le point d’accepter le <strong>Dr. {getDoctorFullName(selectedDoctor)}</strong>.
              </p>
              <p style={{ fontSize: '0.9rem', color: COLORS.muted, lineHeight: '1.5', margin: 0 }}>
                Une fois accepté, son profil sera vérifié et il pourra accéder à la plateforme.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button 
                  onClick={() => setShowAcceptModal(false)} 
                  style={{ padding: '10px 18px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, background: 'white', color: COLORS.text, fontWeight: '600', cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button 
                  onClick={handleConfirmAccept} 
                  disabled={submittingAction} 
                  style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', background: COLORS.teal, color: 'white', fontWeight: '700', cursor: 'pointer' }}
                >
                  {submittingAction ? "Validation..." : "Confirmer l’acceptation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SIMPLE & FOCUSED REJECTION CONFIRMATION MODAL */}
      {showRejectModal && selectedDoctor && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6, 44, 84, 0.5)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '20px 24px', backgroundColor: '#DC2626', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: '700', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <XCircle size={20} /> Refuser la demande
              </div>
              <button onClick={() => setShowRejectModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {actionError && (
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.85rem' }}>
                  {actionError}
                </div>
              )}

              <p style={{ fontSize: '0.98rem', color: COLORS.text, lineHeight: '1.6', margin: 0 }}>
                Vous êtes sur le point de refuser la demande du <strong>Dr. {getDoctorFullName(selectedDoctor)}</strong>.
              </p>
              <p style={{ fontSize: '0.9rem', color: COLORS.muted, lineHeight: '1.5', margin: 0 }}>
                Le médecin ne pourra pas accéder à la plateforme tant que sa demande reste refusée.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button 
                  onClick={() => setShowRejectModal(false)} 
                  style={{ padding: '10px 18px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, background: 'white', color: COLORS.text, fontWeight: '600', cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button 
                  onClick={handleConfirmReject} 
                  disabled={submittingAction} 
                  style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', background: '#DC2626', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                >
                  {submittingAction ? "Traitement..." : "Refuser la demande"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
