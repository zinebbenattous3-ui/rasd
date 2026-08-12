import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Users, 
  Search, 
  Plus, 
  Eye, 
  X, 
  Calendar as CalendarIcon, 
  Activity, 
  RotateCcw, 
  ChevronDown, 
  Check, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  UserPlus,
  Edit
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { GenderSelector } from "@/components/ui/gender-selector";
import { BloodTypeSelector } from "@/components/ui/blood-type-selector";
import { validateNIN } from "dz-nin-checker";

export const Route = createFileRoute("/doctor/patients")({
  component: DoctorPatientsPage,
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

// Reusable Custom Popover Dropdown
function CustomDropdown({
  icon: Icon,
  options,
  value,
  onChange,
  placeholder = "Sélectionner..."
}: {
  icon?: any;
  options: { value: string; label: string }[];
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
                <span>{opt.label}</span>
                {isSelected && <Check size={16} color={COLORS.teal} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DoctorPatientsPage() {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<any[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("ALL");
  const [bloodFilter, setBloodFilter] = useState("ALL");

  // Drawer / Modals State
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientEvents, setPatientEvents] = useState<any[]>([]);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any>(null);

  // Form State
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    nin: "",
    date_of_birth: "",
    gender: "M",
    blood_type: "A+",
    email: ""
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

  // ESC key listener to close active drawer & modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Esc") {
        if (showAddModal) setShowAddModal(false);
        if (showEditModal) setShowEditModal(false);
        if (showDrawer) setShowDrawer(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAddModal, showEditModal, showDrawer]);

  // Load patients from DB
  const loadPatients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          *,
          users:user_id (
            id,
            email,
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPatients(data);
      }
    } catch (err) {
      console.error("Error loading patients:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  // Fetch related health events for selected patient
  const fetchPatientEvents = async (patientId: string) => {
    try {
      const { data } = await supabase
        .from('health_events')
        .select(`
          *,
          reportable_disease:reportable_disease_id (
            id,
            name
          ),
          facility:facility_id (
            name,
            wilaya
          )
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (data) {
        setPatientEvents(data);
      } else {
        setPatientEvents([]);
      }
    } catch (err) {
      setPatientEvents([]);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        setShowAddModal(false);
        setShowDrawer(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Open Patient Drawer
  const handleOpenPatient = (p: any) => {
    setSelectedPatient(p);
    setShowDrawer(true);
    fetchPatientEvents(p.id);
  };

  // Handle Add Patient Submission
  const handleAddPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!form.first_name.trim() || !form.last_name.trim() || !form.nin.trim() || !form.date_of_birth) {
      setFormError("Veuillez remplir tous les champs obligatoires (*).");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Check NIN uniqueness in existing patients
      const { data: existingNin } = await supabase
        .from('patients')
        .select('id')
        .eq('nin', form.nin.trim())
        .maybeSingle();

      if (existingNin) {
        setFormError("Un patient avec ce NIN existe déjà.");
        setSubmitting(false);
        return;
      }

      // 2. Create User account for Patient
      const patientEmail = form.email.trim() || `${form.nin.trim()}@patient.rasd.local`;
      const { data: newUser, error: userErr } = await supabase
        .from('users')
        .insert([{
          email: patientEmail.toLowerCase(),
          password_hash: "PATIENT_NO_LOGIN_HASH",
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          role: 'PATIENT',
          is_active: true
        }])
        .select()
        .single();

      if (userErr) throw new Error(userErr.message);

      // 3. Create Patient Record linked to user_id
      const { error: patientErr } = await supabase
        .from('patients')
        .insert([{
          user_id: newUser.id,
          nin: form.nin.trim(),
          date_of_birth: form.date_of_birth,
          gender: form.gender,
          blood_type: form.blood_type || null
        }]);

      if (patientErr) throw new Error(patientErr.message);

      setShowAddModal(false);
      setForm({
        first_name: "",
        last_name: "",
        nin: "",
        date_of_birth: "",
        gender: "M",
        blood_type: "A+",
        email: ""
      });
      setToast({ message: "✓ Patient enregistré avec succès", type: 'success' });
      loadPatients();
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de l'enregistrement du patient.");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Patient Modal
  const handleOpenEdit = (p: any) => {
    const userObj = Array.isArray(p?.users) ? p.users[0] : p?.users;
    setEditingPatient(p);
    setForm({
      first_name: userObj?.first_name || "",
      last_name: userObj?.last_name || "",
      nin: p.nin || "",
      date_of_birth: p.date_of_birth || "",
      gender: p.gender || "M",
      blood_type: p.blood_type || "A+",
      email: userObj?.email || ""
    });
    setFormError(null);
    setShowEditModal(true);
  };

  // Handle Edit Patient Submission
  const handleEditPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;
    setFormError(null);

    if (!form.first_name.trim() || !form.last_name.trim() || !form.nin.trim() || !form.date_of_birth) {
      setFormError("Veuillez remplir tous les champs obligatoires (*).");
      return;
    }

    setSubmitting(true);

    try {
      if (form.nin.trim() !== editingPatient.nin) {
        const { data: existingNin } = await supabase
          .from('patients')
          .select('id')
          .eq('nin', form.nin.trim())
          .neq('id', editingPatient.id)
          .maybeSingle();

        if (existingNin) {
          setFormError("Un autre patient avec ce NIN existe déjà.");
          setSubmitting(false);
          return;
        }
      }

      const userId = editingPatient.user_id;
      if (userId) {
        const { error: userErr } = await supabase
          .from('users')
          .update({
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            ...(form.email.trim() ? { email: form.email.trim().toLowerCase() } : {})
          })
          .eq('id', userId);

        if (userErr) throw new Error(userErr.message);
      }

      const { error: patientErr } = await supabase
        .from('patients')
        .update({
          nin: form.nin.trim(),
          date_of_birth: form.date_of_birth,
          gender: form.gender,
          blood_type: form.blood_type || null
        })
        .eq('id', editingPatient.id);

      if (patientErr) throw new Error(patientErr.message);

      setShowEditModal(false);
      setEditingPatient(null);
      setToast({ message: "✓ Informations du patient mises à jour avec succès", type: 'success' });
      loadPatients();

      if (selectedPatient && selectedPatient.id === editingPatient.id) {
        const userObj = Array.isArray(selectedPatient.users) ? selectedPatient.users[0] : selectedPatient.users;
        setSelectedPatient({
          ...selectedPatient,
          nin: form.nin.trim(),
          date_of_birth: form.date_of_birth,
          gender: form.gender,
          blood_type: form.blood_type,
          users: {
            ...userObj,
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            email: form.email.trim() || userObj?.email
          }
        });
      }
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de la modification des informations.");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper for Patient Name
  const getPatientFullName = (p: any) => {
    const userObj = Array.isArray(p?.users) ? p.users[0] : p?.users;
    if (!userObj) return "Patient";
    return `${userObj.first_name || ''} ${userObj.last_name || ''}`.trim() || "Patient";
  };

  // Filtered Patients List
  const filteredPatients = patients.filter((p) => {
    const q = searchQuery.toLowerCase();
    const userObj = Array.isArray(p?.users) ? p.users[0] : p?.users;
    const name = `${userObj?.first_name || ''} ${userObj?.last_name || ''}`.toLowerCase();
    const email = (userObj?.email || '').toLowerCase();
    const nin = (p.nin || '').toLowerCase();

    const matchesQuery = name.includes(q) || email.includes(q) || nin.includes(q);
    const matchesGender = genderFilter === "ALL" || p.gender === genderFilter;
    const matchesBlood = bloodFilter === "ALL" || p.blood_type === bloodFilter;

    return matchesQuery && matchesGender && matchesBlood;
  });

  const isFilterActive = searchQuery.trim() !== "" || genderFilter !== "ALL" || bloodFilter !== "ALL";

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
              <Users size={24} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: COLORS.navy, margin: 0 }}>
              Gestion des Patients
            </h2>
          </div>
          <p style={{ color: COLORS.muted, fontSize: '0.95rem', margin: 0 }}>
            Consultez le registre des patients, enregistrez de nouveaux profils et accédez aux historiques d'événements.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setShowAddModal(true);
          }}
          style={{
            backgroundColor: COLORS.teal,
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
            boxShadow: '0 4px 14px rgba(15, 162, 155, 0.3)'
          }}
        >
          <UserPlus size={18} /> + Ajouter un patient
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
              placeholder="Rechercher un patient, NIN..."
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

          {/* Custom Gender Dropdown */}
          <CustomDropdown
            options={[
              { value: 'ALL', label: 'Tous les genres' },
              { value: 'M', label: 'Homme' },
              { value: 'F', label: 'Femme' },
            ]}
            value={genderFilter}
            onChange={setGenderFilter}
            placeholder="Genre..."
          />

          {/* Custom Blood Type Dropdown */}
          <CustomDropdown
            options={[
              { value: 'ALL', label: 'Tous les groupes sanguins' },
              { value: 'A+', label: 'A+' },
              { value: 'A-', label: 'A-' },
              { value: 'B+', label: 'B+' },
              { value: 'B-', label: 'B-' },
              { value: 'AB+', label: 'AB+' },
              { value: 'AB-', label: 'AB-' },
              { value: 'O+', label: 'O+' },
              { value: 'O-', label: 'O-' },
            ]}
            value={bloodFilter}
            onChange={setBloodFilter}
            placeholder="Groupe sanguin..."
          />
        </div>

        {/* Active Filter Chips & Reset */}
        {isFilterActive && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${COLORS.border}`, paddingTop: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: COLORS.muted, fontWeight: '600' }}>Filtres actifs :</span>
              {genderFilter !== 'ALL' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: COLORS.lightTeal, color: COLORS.teal, padding: '4px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '700' }}>
                  Sexe : {genderFilter === 'M' ? 'Homme' : 'Femme'}
                  <X size={14} style={{ cursor: 'pointer' }} onClick={() => setGenderFilter('ALL')} />
                </span>
              )}
              {bloodFilter !== 'ALL' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: COLORS.lightTeal, color: COLORS.teal, padding: '4px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '700' }}>
                  Groupe : {bloodFilter}
                  <X size={14} style={{ cursor: 'pointer' }} onClick={() => setBloodFilter('ALL')} />
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
                setGenderFilter('ALL');
                setBloodFilter('ALL');
              }}
              style={{ background: 'none', border: 'none', color: COLORS.teal, cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RotateCcw size={14} /> Réinitialiser
            </button>
          </div>
        )}
      </div>

      {/* Patient Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: `1px solid ${COLORS.border}`, overflowX: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: COLORS.muted }}>Chargement du registre des patients...</div>
        ) : (
          <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: `1px solid ${COLORS.border}` }}>
              <tr>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Patient</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>NIN</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date de naissance</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sexe</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Groupe sanguin</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inscrit le</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((p, idx) => {
                const fullName = getPatientFullName(p);
                const userObj = Array.isArray(p?.users) ? p.users[0] : p?.users;
                const email = userObj?.email || "";

                return (
                  <tr key={p.id} style={{ borderBottom: idx !== filteredPatients.length - 1 ? `1px solid ${COLORS.border}` : 'none' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '0.95rem' }}>{fullName}</div>
                      <div style={{ fontSize: '0.8rem', color: COLORS.muted }}>{email}</div>
                    </td>

                    <td style={{ padding: '16px 20px', fontWeight: '700', color: COLORS.navy, fontSize: '0.9rem' }}>
                      {p.nin}
                    </td>

                    <td style={{ padding: '16px 20px', color: COLORS.text, fontSize: '0.88rem' }}>
                      <div style={{ fontWeight: '600' }}>{new Date(p.date_of_birth).toLocaleDateString('fr-FR')}</div>
                      <div style={{ fontSize: '0.78rem', color: COLORS.muted, fontWeight: '600' }}>
                        {new Date().getFullYear() - new Date(p.date_of_birth).getFullYear()} ans
                      </div>
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        backgroundColor: p.gender === 'M' ? '#E0F2FE' : '#FCE7F3',
                        color: p.gender === 'M' ? '#0369A1' : '#BE185D'
                      }}>
                        {p.gender === 'M' ? 'Homme' : 'Femme'}
                      </span>
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ backgroundColor: COLORS.lightTeal, color: COLORS.teal, padding: '4px 10px', borderRadius: '6px', fontWeight: '800', fontSize: '0.85rem' }}>
                        {p.blood_type || '—'}
                      </span>
                    </td>

                    <td style={{ padding: '16px 20px', color: COLORS.muted, fontSize: '0.85rem' }}>
                      {new Date(p.created_at).toLocaleDateString('fr-FR')}
                    </td>

                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => handleOpenPatient(p)}
                          style={{ padding: '6px 12px', border: `1px solid ${COLORS.border}`, borderRadius: '8px', background: 'white', color: COLORS.navy, fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Eye size={15} color={COLORS.teal} /> Fiche patient
                        </button>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          style={{ padding: '6px 12px', border: `1px solid ${COLORS.border}`, borderRadius: '8px', background: 'white', color: COLORS.navy, fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Edit size={15} color={COLORS.teal} /> Modifier
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem', color: COLORS.muted }}>
                    Aucun patient ne correspond à vos critères de recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Patient Details & Related Health Events Drawer */}
      {showDrawer && selectedPatient && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6, 44, 84, 0.5)', zIndex: 100, display: 'flex', justifyContent: 'flex-end', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', width: '100%', maxWidth: '560px', height: '100%', overflowY: 'auto', boxShadow: '-10px 0 30px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px', backgroundColor: COLORS.navy, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: COLORS.teal, textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>Dossier Patient</div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '800', margin: '4px 0 0 0' }}>
                  {getPatientFullName(selectedPatient)}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => handleOpenEdit(selectedPatient)}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Edit size={14} color="#38BDF8" /> Modifier
                </button>
                <button onClick={() => setShowDrawer(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                  <X size={24} />
                </button>
              </div>
            </div>

            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Patient Identity Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', backgroundColor: '#F8FAFC', padding: '18px', borderRadius: '14px', border: `1px solid ${COLORS.border}` }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase' }}>NIN</div>
                  <div style={{ fontWeight: '800', color: COLORS.navy, fontSize: '0.95rem', marginTop: '2px' }}>{selectedPatient.nin}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase' }}>Date de Naissance</div>
                  <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '0.9rem', marginTop: '2px' }}>
                    {new Date(selectedPatient.date_of_birth).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase' }}>Sexe</div>
                  <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '0.9rem', marginTop: '2px' }}>
                    {selectedPatient.gender === 'M' ? 'Homme' : 'Femme'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase' }}>Groupe Sanguin</div>
                  <div style={{ fontWeight: '800', color: COLORS.teal, fontSize: '0.95rem', marginTop: '2px' }}>
                    {selectedPatient.blood_type || 'Non renseigné'}
                  </div>
                </div>
              </div>

              {/* Related Health Events Section */}
              <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '18px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: '800', color: COLORS.navy, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={18} color={COLORS.teal} /> Historique des Événements de Santé
                </div>

                {patientEvents.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: COLORS.muted, fontSize: '0.88rem' }}>
                    Aucun événement de santé enregistré pour ce patient.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {patientEvents.map((evt) => {
                      const diseaseObj = Array.isArray(evt.reportable_disease) ? evt.reportable_disease[0] : evt.reportable_disease;
                      const diseaseName = diseaseObj?.name || "Maladie non spécifiée";

                      return (
                        <div key={evt.id} style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: `1px solid ${COLORS.border}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '0.9rem' }}>{diseaseName}</div>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: '800',
                              color: evt.severity === 'CRITICAL' ? '#DC2626' : evt.severity === 'HIGH' ? '#EA580C' : '#2563EB'
                            }}>
                              {evt.severity}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: COLORS.text, marginTop: '4px' }}>{evt.description}</div>
                          <div style={{ fontSize: '0.75rem', color: COLORS.muted, marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Structure : {evt.facility?.name || '—'}</span>
                            <span>{new Date(evt.created_at).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Patient Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6, 44, 84, 0.5)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '100%', maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '20px 24px', backgroundColor: COLORS.navy, color: 'white', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: '800', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={20} color={COLORS.teal} /> + Ajouter un patient
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddPatientSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {formError && (
                <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.85rem', fontWeight: '600' }}>
                  {formError}
                </div>
              )}

              {/* 2-Column Responsive Layout Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '24px' }}>
                {/* Left Column: Identité & Personal Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Section 1: Identité */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: '800', color: COLORS.teal, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      1. Identité du Patient
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>Prénom *</label>
                        <input
                          type="text"
                          required
                          value={form.first_name}
                          onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                          placeholder="Prénom"
                          style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '0.9rem', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>Nom *</label>
                        <input
                          type="text"
                          required
                          value={form.last_name}
                          onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                          placeholder="Nom"
                          style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '0.9rem', outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>NIN (Numéro d'Identification National) *</label>
                      <input
                        type="text"
                        required
                        value={form.nin}
                        onChange={(e) => setForm({ ...form, nin: e.target.value })}
                        placeholder="ex: 100040000000000000"
                        style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>
                  </div>

                  {/* Section 2: Informations Personnelles */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: '800', color: COLORS.teal, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      2. Informations Personnelles
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>Date de Naissance *</label>
                      <DatePicker
                        value={form.date_of_birth}
                        onChange={(val) => setForm({ ...form, date_of_birth: val })}
                        placeholder="Date de naissance..."
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>Sexe *</label>
                      <GenderSelector
                        value={form.gender}
                        onChange={(val) => setForm({ ...form, gender: val })}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Profil Médical & Contact */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: '800', color: COLORS.teal, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      3. Profil Médical & Contact
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: COLORS.navy, marginBottom: '8px' }}>Groupe Sanguin *</label>
                      <BloodTypeSelector
                        value={form.blood_type}
                        onChange={(val) => setForm({ ...form, blood_type: val })}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>Adresse Email (optionnel)</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="patient@email.dz"
                        style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: `1px solid ${COLORS.border}`, paddingTop: '16px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '11px 20px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, background: 'white', color: COLORS.text, fontWeight: '600', cursor: 'pointer' }}>
                  Annuler (ESC)
                </button>
                <button type="submit" disabled={submitting} style={{ padding: '11px 24px', borderRadius: '10px', border: 'none', background: COLORS.teal, color: 'white', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 14px rgba(15, 162, 155, 0.3)' }}>
                  {submitting ? "Enregistrement..." : "Enregistrer le patient →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {showEditModal && editingPatient && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6, 44, 84, 0.5)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '100%', maxWidth: '820px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '20px 24px', backgroundColor: COLORS.navy, color: 'white', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: '800', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit size={20} color={COLORS.teal} /> Modifier les informations du patient
              </div>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditPatientSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {formError && (
                <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.85rem', fontWeight: '600' }}>
                  {formError}
                </div>
              )}

              {/* 2-Column Horizontal Layout Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Left Column: Identité & Personal Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Section 1: Identité */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: '800', color: COLORS.teal, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      1. Identité du Patient
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>Prénom *</label>
                        <input
                          type="text"
                          required
                          value={form.first_name}
                          onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                          placeholder="Prénom"
                          style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '0.9rem', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>Nom *</label>
                        <input
                          type="text"
                          required
                          value={form.last_name}
                          onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                          placeholder="Nom"
                          style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '0.9rem', outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>NIN (Numéro d'Identification National) *</label>
                      <input
                        type="text"
                        required
                        value={form.nin}
                        onChange={(e) => setForm({ ...form, nin: e.target.value.replace(/\D/g, "") })}
                        placeholder="ex: 100040000000000000"
                        maxLength={18}
                        style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>
                  </div>

                  {/* Section 2: Informations Personnelles */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: '800', color: COLORS.teal, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      2. Informations Personnelles
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>Date de Naissance *</label>
                      <DatePicker
                        value={form.date_of_birth}
                        onChange={(val) => setForm({ ...form, date_of_birth: val })}
                        placeholder="Date de naissance..."
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>Sexe *</label>
                      <GenderSelector
                        value={form.gender}
                        onChange={(val) => setForm({ ...form, gender: val })}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Profil Médical & Contact */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: '800', color: COLORS.teal, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      3. Profil Médical & Contact
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: COLORS.navy, marginBottom: '8px' }}>Groupe Sanguin *</label>
                      <BloodTypeSelector
                        value={form.blood_type}
                        onChange={(val) => setForm({ ...form, blood_type: val })}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>Adresse Email (optionnel)</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="patient@email.dz"
                        style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: `1px solid ${COLORS.border}`, paddingTop: '16px' }}>
                <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '11px 20px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, background: 'white', color: COLORS.text, fontWeight: '600', cursor: 'pointer' }}>
                  Annuler (ESC)
                </button>
                <button type="submit" disabled={submitting} style={{ padding: '11px 24px', borderRadius: '10px', border: 'none', background: COLORS.teal, color: 'white', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 14px rgba(15, 162, 155, 0.3)' }}>
                  {submitting ? "Mise à jour..." : "Enregistrer les modifications →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
