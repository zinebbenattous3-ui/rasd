import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Activity, 
  Search, 
  Plus, 
  Eye, 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  ChevronDown, 
  Check, 
  AlertTriangle,
  FileText,
  Building2,
  Stethoscope,
  Link as LinkIcon,
  UserPlus
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { SeveritySelector } from "@/components/ui/severity-selector";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import { User } from "lucide-react";

export const Route = createFileRoute("/doctor/health-events")({
  component: DoctorHealthEventsPage,
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

const COMMON_INCIDENTS = [
  "Intoxication alimentaire collective",
  "Épidémie de rougeole",
  "Cas suspect de choléra",
  "Cas suspect de méningite",
  "Cas de rage humaine",
  "Tétanos néonatal",
  "Infection respiratoire aiguë sévère",
  "Fièvre typhoïde",
  "Paludisme d'importation",
  "Autre événement de santé publique"
];

// Reusable Custom Popover Dropdown
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

function DoctorHealthEventsPage() {
  const [loading, setLoading] = useState(true);
  const [currentDoctor, setCurrentDoctor] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [patientsList, setPatientsList] = useState<any[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");

  // Drawer & Modals State
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInlineAddPatient, setShowInlineAddPatient] = useState(false);

  // Form State
  const [form, setForm] = useState({
    patient_id: "",
    incident_type: COMMON_INCIDENTS[0] || "",
    custom_incident: "",
    description: "",
    severity: "MEDIUM",
    patient_proof_url: ""
  });

  // Inline Add Patient Form State
  const [patientForm, setPatientForm] = useState({
    first_name: "",
    last_name: "",
    nin: "",
    date_of_birth: "",
    gender: "M",
    blood_type: "A+"
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Get logged in doctor
      const { data: docData } = await supabase
        .from('doctors')
        .select(`
          *,
          users:user_id (
            first_name,
            last_name,
            email
          ),
          facility:facility_id (
            id,
            name,
            wilaya
          )
        `)
        .limit(1)
        .maybeSingle();

      if (!docData?.user_id) {
        setLoading(false);
        return;
      }

      const userObj = Array.isArray(docData.users) ? docData.users[0] : docData.users;
      const facObj = Array.isArray(docData.facility) ? docData.facility[0] : docData.facility;

      setCurrentDoctor({
        id: docData.id,
        facilityId: docData.facility_id,
        facilityName: facObj?.name,
        doctorName: userObj ? `${userObj.first_name || ''} ${userObj.last_name || ''}`.trim() : 'Doctor'
      });

      // Escape key listener
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' || e.key === 'Esc') {
          setShowCreateModal(false);
          setSelectedEvent(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      // 2. Fetch Patients for selection
      const { data: pts } = await supabase
        .from('patients')
        .select(`
          id,
          nin,
          users:user_id (
            first_name,
            last_name
          )
        `);

      if (pts) setPatientsList(pts);

      // 3. Fetch Health Events for this Doctor
      const { data: evtsData, error: evtsErr } = await supabase
        .from('health_events')
        .select(`
          *,
          patient:patient_id (
            id,
            nin,
            date_of_birth,
            gender,
            blood_type,
            users:user_id (
              first_name,
              last_name,
              email
            )
          ),
          facility:facility_id (
            name,
            wilaya
          )
        `)
        .eq('doctor_id', docData.id)
        .order('created_at', { ascending: false });

      if (!evtsErr && evtsData) {
        setEvents(evtsData);
      }
    } catch (err) {
      console.error("Error loading health events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Inline Patient Creation
  const handleInlineAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!patientForm.first_name.trim() || !patientForm.last_name.trim() || !patientForm.nin.trim() || !patientForm.date_of_birth) {
      setFormError("Veuillez remplir tous les champs du patient (*).");
      return;
    }

    try {
      // Check NIN
      const { data: existingNin } = await supabase
        .from('patients')
        .select('id')
        .eq('nin', patientForm.nin.trim())
        .maybeSingle();

      if (existingNin) {
        setFormError("Un patient avec ce NIN existe déjà.");
        return;
      }

      // Create User
      const { data: newUser, error: userErr } = await supabase
        .from('users')
        .insert([{
          email: `${patientForm.nin.trim()}@patient.rasd.local`,
          password_hash: "PATIENT_NO_LOGIN_HASH",
          first_name: patientForm.first_name.trim(),
          last_name: patientForm.last_name.trim(),
          role: 'PATIENT',
          is_active: true
        }])
        .select()
        .single();

      if (userErr) throw new Error(userErr.message);

      // Create Patient
      const { data: newPatient, error: ptErr } = await supabase
        .from('patients')
        .insert([{
          user_id: newUser.id,
          nin: patientForm.nin.trim(),
          date_of_birth: patientForm.date_of_birth,
          gender: patientForm.gender,
          blood_type: patientForm.blood_type
        }])
        .select(`
          id,
          nin,
          users:user_id (
            first_name,
            last_name
          )
        `)
        .single();

      if (ptErr) throw new Error(ptErr.message);

      setPatientsList([newPatient, ...patientsList]);
      setForm({ ...form, patient_id: newPatient.id });
      setShowInlineAddPatient(false);
      setToast({ message: "✓ Patient créé et sélectionné automatiquement", type: 'success' });
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de la création du patient.");
    }
  };

  // Handle Create Health Event Submit
  const handleCreateEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.patient_id) {
      setFormError("Veuillez sélectionner ou créer un patient.");
      return;
    }

    const finalIncidentType = form.incident_type === "Autre événement de santé publique"
      ? (form.custom_incident.trim() || "Événement de santé publique")
      : form.incident_type;

    if (!form.description.trim()) {
      setFormError("Veuillez fournir une description détaillée des observations médicales.");
      return;
    }

    if (!currentDoctor?.id || !currentDoctor?.facilityId) {
      setFormError("Profil médecin ou établissement non valide.");
      return;
    }

    setSubmitting(true);

    try {
      const { error: insertErr } = await supabase
        .from('health_events')
        .insert([{
          doctor_id: currentDoctor.id, // Strictly scoped to authenticated doctor
          facility_id: currentDoctor.facilityId, // Strictly scoped to doctor's facility
          patient_id: form.patient_id,
          incident_type: finalIncidentType,
          description: form.description.trim(),
          severity: form.severity,
          status: 'PENDING',
          patient_proof_url: form.patient_proof_url.trim() || null
        }]);

      if (insertErr) throw new Error(insertErr.message);

      setShowCreateModal(false);
      setForm({
        patient_id: "",
        incident_type: COMMON_INCIDENTS[0] || "",
        custom_incident: "",
        description: "",
        severity: "MEDIUM",
        patient_proof_url: ""
      });
      setToast({ message: "✓ Événement de santé déclaré avec succès", type: 'success' });
      loadData();
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de la déclaration de l'événement.");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Event Details Drawer
  const handleOpenEvent = (evt: any) => {
    setSelectedEvent(evt);
    setShowDrawer(true);
  };

  // Filtered Events
  const filteredEvents = events.filter((evt) => {
    const q = searchQuery.toLowerCase();
    const patientObj = Array.isArray(evt.patient) ? evt.patient[0] : evt.patient;
    const userObj = Array.isArray(patientObj?.users) ? patientObj.users[0] : patientObj?.users;
    const patientName = `${userObj?.first_name || ''} ${userObj?.last_name || ''}`.toLowerCase();
    const incident = (evt.incident_type || '').toLowerCase();
    const nin = (patientObj?.nin || '').toLowerCase();

    const matchesQuery = patientName.includes(q) || incident.includes(q) || nin.includes(q);
    const matchesStatus = statusFilter === "ALL" || evt.status === statusFilter;
    const matchesSeverity = severityFilter === "ALL" || evt.severity === severityFilter;

    return matchesQuery && matchesStatus && matchesSeverity;
  });

  const isFilterActive = searchQuery.trim() !== "" || statusFilter !== "ALL" || severityFilter !== "ALL";

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
          <CheckCircle2 size={18} color="#34D399" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
              <Activity size={24} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: COLORS.navy, margin: 0 }}>
              Événements de Santé
            </h2>
          </div>
          <p style={{ color: COLORS.muted, fontSize: '0.95rem', margin: 0 }}>
            Déclarez et suivez les événements de santé publique relatifs aux patients de votre établissement.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setShowCreateModal(true);
          }}
          style={{
            backgroundColor: COLORS.navy,
            color: 'white',
            border: 'none',
            padding: '11px 22px',
            borderRadius: '12px',
            fontWeight: '700',
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(6, 44, 84, 0.3)'
          }}
        >
          <Plus size={18} color={COLORS.teal} /> + Déclarer un événement
        </button>
      </div>

      {/* Modern Filter Toolbar */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: `1px solid ${COLORS.border}`, padding: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', alignItems: 'center' }}>
          {/* Integrated Search Input */}
          <div style={{ position: 'relative' }}>
            <Search size={18} color={COLORS.muted} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Rechercher un incident, patient..."
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

          {/* Custom Status Dropdown */}
          <CustomDropdown
            options={[
              { value: 'ALL', label: 'Tous les statuts' },
              { value: 'PENDING', label: 'En attente', dotColor: '#D97706' },
              { value: 'VALIDATED', label: 'Validé', dotColor: '#15803D' },
              { value: 'REJECTED', label: 'Refusé', dotColor: '#DC2626' },
              { value: 'ARCHIVED', label: 'Archivé', dotColor: '#6B7280' },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Statut..."
          />

          {/* Custom Severity Dropdown */}
          <CustomDropdown
            options={[
              { value: 'ALL', label: 'Toutes les gravités' },
              { value: 'LOW', label: 'Faible (LOW)', dotColor: '#2563EB' },
              { value: 'MEDIUM', label: 'Moyenne (MEDIUM)', dotColor: '#D97706' },
              { value: 'HIGH', label: 'Élevée (HIGH)', dotColor: '#EA580C' },
              { value: 'CRITICAL', label: 'Critique (CRITICAL)', dotColor: '#DC2626' },
            ]}
            value={severityFilter}
            onChange={setSeverityFilter}
            placeholder="Gravité..."
          />
        </div>

        {/* Active Filter Chips & Reset */}
        {isFilterActive && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${COLORS.border}`, paddingTop: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: COLORS.muted, fontWeight: '600' }}>Filtres actifs :</span>
              {statusFilter !== 'ALL' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: COLORS.lightTeal, color: COLORS.teal, padding: '4px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '700' }}>
                  Statut : {statusFilter === 'PENDING' ? 'En attente' : statusFilter === 'VALIDATED' ? 'Validé' : statusFilter === 'REJECTED' ? 'Refusé' : 'Archivé'}
                  <X size={14} style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('ALL')} />
                </span>
              )}
              {severityFilter !== 'ALL' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: COLORS.lightTeal, color: COLORS.teal, padding: '4px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '700' }}>
                  Gravité : {severityFilter}
                  <X size={14} style={{ cursor: 'pointer' }} onClick={() => setSeverityFilter('ALL')} />
                </span>
              )}
              {searchQuery.trim() !== '' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#F1F5F9', color: COLORS.navy, padding: '4px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '700' }}>
                  "{searchQuery}"
                  <X size={14} style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
                </span>
              )}
            </div>

            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setSeverityFilter('ALL');
              }}
              style={{ background: 'none', border: 'none', color: COLORS.teal, cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RotateCcw size={14} /> Réinitialiser
            </button>
          </div>
        )}
      </div>

      {/* Health Events Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: `1px solid ${COLORS.border}`, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: COLORS.muted }}>Chargement des événements de santé...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: `1px solid ${COLORS.border}` }}>
              <tr>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Incident</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Patient</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Établissement</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gravité</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Statut</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((evt, idx) => {
                const patientObj = Array.isArray(evt.patient) ? evt.patient[0] : evt.patient;
                const userObj = Array.isArray(patientObj?.users) ? patientObj.users[0] : patientObj?.users;
                const pName = userObj ? `${userObj.first_name || ''} ${userObj.last_name || ''}`.trim() : "Patient";

                return (
                  <tr key={evt.id} style={{ borderBottom: idx !== filteredEvents.length - 1 ? `1px solid ${COLORS.border}` : 'none' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '0.95rem' }}>{evt.incident_type}</div>
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '0.9rem' }}>{pName}</div>
                      <div style={{ fontSize: '0.78rem', color: COLORS.muted }}>NIN: {patientObj?.nin || '—'}</div>
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: '600', color: COLORS.navy, fontSize: '0.88rem' }}>{evt.facility?.name || '—'}</div>
                    </td>

                    {/* Semantic Severity Badge */}
                    <td style={{ padding: '16px 20px' }}>
                      {evt.severity === 'CRITICAL' && (
                        <span style={{ backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5', padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          ● CRITIQUE
                        </span>
                      )}
                      {evt.severity === 'HIGH' && (
                        <span style={{ backgroundColor: '#FFEDD5', color: '#EA580C', border: '1px solid #FDBA74', padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          ● ÉLEVÉE
                        </span>
                      )}
                      {evt.severity === 'MEDIUM' && (
                        <span style={{ backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D', padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          ● MOYENNE
                        </span>
                      )}
                      {evt.severity === 'LOW' && (
                        <span style={{ backgroundColor: '#DBEAFE', color: '#2563EB', border: '1px solid #93C5FD', padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          ● FAIBLE
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '16px 20px' }}>
                      {evt.status === 'PENDING' && (
                        <span style={{ backgroundColor: '#FEF3C7', color: '#B45309', padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700' }}>
                          En attente
                        </span>
                      )}
                      {evt.status === 'VALIDATED' && (
                        <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700' }}>
                          Validé
                        </span>
                      )}
                      {evt.status === 'REJECTED' && (
                        <span style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700' }}>
                          Refusé
                        </span>
                      )}
                      {evt.status === 'ARCHIVED' && (
                        <span style={{ backgroundColor: '#F3F4F6', color: '#4B5563', padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700' }}>
                          Archivé
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '16px 20px', color: COLORS.muted, fontSize: '0.85rem' }}>
                      {new Date(evt.created_at).toLocaleDateString('fr-FR')}
                    </td>

                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenEvent(evt)}
                        style={{ padding: '6px 12px', border: `1px solid ${COLORS.border}`, borderRadius: '8px', background: 'white', color: COLORS.navy, fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Eye size={15} color={COLORS.teal} /> Détails
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem', color: COLORS.muted }}>
                    Aucun événement de santé ne correspond à vos filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Event Details Drawer */}
      {showDrawer && selectedEvent && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6, 44, 84, 0.5)', zIndex: 100, display: 'flex', justifyContent: 'flex-end', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', width: '100%', maxWidth: '560px', height: '100%', overflowY: 'auto', boxShadow: '-10px 0 30px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px', backgroundColor: COLORS.navy, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: COLORS.teal, textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>Fiche Événement</div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '800', margin: '4px 0 0 0' }}>
                  {selectedEvent.incident_type}
                </h3>
              </div>
              <button onClick={() => setShowDrawer(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', backgroundColor: '#F8FAFC', padding: '18px', borderRadius: '14px', border: `1px solid ${COLORS.border}` }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase' }}>Gravité</div>
                  <div style={{ fontWeight: '800', color: selectedEvent.severity === 'CRITICAL' ? '#DC2626' : COLORS.navy, fontSize: '0.95rem', marginTop: '2px' }}>
                    {selectedEvent.severity}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase' }}>Statut</div>
                  <div style={{ fontWeight: '700', color: COLORS.teal, fontSize: '0.9rem', marginTop: '2px' }}>
                    {selectedEvent.status}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase' }}>Structure</div>
                  <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '0.9rem', marginTop: '2px' }}>
                    {selectedEvent.facility?.name}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase' }}>Date de création</div>
                  <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '0.9rem', marginTop: '2px' }}>
                    {new Date(selectedEvent.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>

              {/* Medical Description */}
              <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '18px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '800', color: COLORS.muted, textTransform: 'uppercase', marginBottom: '8px' }}>
                  Observations Médicales & Description
                </div>
                <div style={{ fontSize: '0.92rem', color: COLORS.text, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {selectedEvent.description}
                </div>
              </div>

              {/* Patient Proof URL if available */}
              {selectedEvent.patient_proof_url && (
                <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '16px', backgroundColor: COLORS.lightTeal }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '800', color: COLORS.teal, textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <LinkIcon size={16} /> Pièce Justificative / Preuve
                  </div>
                  <a href={selectedEvent.patient_proof_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: COLORS.navy, fontWeight: '700', textDecoration: 'underline' }}>
                    Consulter le document joint
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Health Event Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6, 44, 84, 0.5)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '100%', maxWidth: '840px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ padding: '20px 24px', backgroundColor: COLORS.navy, color: 'white', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ fontWeight: '800', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={20} color={COLORS.teal} /> Déclarer un Événement de Santé
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEventSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
              {formError && (
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.85rem' }}>
                  {formError}
                </div>
              )}

              {/* Wide 2-Column Horizontal Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Left Column: Patient & Incident Type */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Patient Selection */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>Patient concerné *</label>
                    <SelectDropdown
                      value={form.patient_id}
                      onChange={(val) => setForm({ ...form, patient_id: val })}
                      placeholder="Sélectionner un patient..."
                      icon={User}
                      searchable={true}
                      options={patientsList.map((p) => {
                        const userObj = Array.isArray(p.users) ? p.users[0] : p.users;
                        const name = userObj ? `${userObj.first_name || ''} ${userObj.last_name || ''}`.trim() : 'Patient';
                        return {
                          value: p.id,
                          label: name,
                          sublabel: `NIN: ${p.nin}`
                        };
                      })}
                    />
                  </div>

                  {/* Incident Type */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>Type d'Incident / Événement Sanitaire *</label>
                    <SelectDropdown
                      value={form.incident_type || ""}
                      onChange={(val) => setForm({ ...form, incident_type: val })}
                      placeholder="Sélectionner le type d'incident..."
                      icon={Activity}
                      searchable={true}
                      options={COMMON_INCIDENTS.map((inc) => ({
                        value: inc,
                        label: inc
                      }))}
                    />

                    {form.incident_type === "Autre événement de santé publique" && (
                      <input
                        type="text"
                        placeholder="Spécifiez le type d'incident..."
                        value={form.custom_incident}
                        onChange={(e) => setForm({ ...form, custom_incident: e.target.value })}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '0.9rem', marginTop: '8px' }}
                      />
                    )}
                  </div>
                </div>

                {/* Right Column: Severity & Proof */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Severity */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: COLORS.navy, marginBottom: '8px' }}>Niveau de Gravité *</label>
                    <SeveritySelector
                      value={form.severity}
                      onChange={(val) => setForm({ ...form, severity: val })}
                    />
                  </div>

                  {/* Proof URL (Optional) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>Lien de Preuve / Document Joint (optionnel)</label>
                    <input
                      type="url"
                      value={form.patient_proof_url}
                      onChange={(e) => setForm({ ...form, patient_proof_url: e.target.value })}
                      placeholder="https://..."
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, fontSize: '0.9rem', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>

              {/* Description (Full Width Below Grid) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>Observations Médicales & Circonstances *</label>
                <textarea
                  rows={3}
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Décrivez l'événement, les symptômes observés et les circonstances particulières..."
                  style={{ width: '100%', padding: '11px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px', borderTop: `1px solid ${COLORS.border}`, paddingTop: '16px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '10px 18px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, background: 'white', color: COLORS.text, fontWeight: '600', cursor: 'pointer' }}>
                  Annuler (ESC)
                </button>
                <button type="submit" disabled={submitting} style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', background: COLORS.navy, color: 'white', fontWeight: '700', cursor: 'pointer' }}>
                  {submitting ? "Transmission..." : "Transmettre la déclaration →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
