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
  UserPlus,
  Paperclip,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  Sparkles
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { SeveritySelector } from "@/components/ui/severity-selector";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import { User } from "lucide-react";
import { ProofUploader } from "@/components/ui/proof-uploader";
import { 
  getProofSignedUrl, 
  uploadProofDocument, 
  deleteProofDocument, 
  extractFileName, 
  isPdfFile 
} from "@/lib/proof-storage";
import { enhanceMedicalObservation, type StructuredObservation } from "@/lib/ai-enhance";
import { PatientProofViewer } from "@/components/medical/PatientProofViewer";
import { formatDateTime } from "@/lib/utils";

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

function calculateAge(dateOfBirth?: string): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const currentYear = new Date().getFullYear();
  const birthYear = dob.getFullYear();
  const age = currentYear - birthYear;
  return age >= 0 ? age : null;
}

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
  const [diseasesList, setDiseasesList] = useState<{ id: string; name: string }[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [diseaseFilter, setDiseaseFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");

  // Drawer & Modals State
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInlineAddPatient, setShowInlineAddPatient] = useState(false);

  // Proof Document Storage State
  const [selectedProofFile, setSelectedProofFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // View-Only Proof Viewer & Delete Confirmation State
  const [viewerModal, setViewerModal] = useState<{
    open: boolean;
    storagePath: string | null;
    healthEventId?: string;
    documentTitle?: string;
  }>({ open: false, storagePath: null });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ open: boolean; eventId: string; path: string } | null>(null);

  // AI Medical Observation Enhancement State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProposal, setAiProposal] = useState<{
    original: string;
    structured: StructuredObservation;
    formattedPlainText: string;
  } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    patient_id: "",
    reportable_disease_id: "",
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

  // ESC key listener to close active modals & drawers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Esc") {
        if (showCreateModal) setShowCreateModal(false);
        if (showDrawer) setShowDrawer(false);
        if (deleteConfirmModal?.open) setDeleteConfirmModal(null);
        if (viewerModal?.open) setViewerModal({ open: false, storagePath: null });
        if (showInlineAddPatient) setShowInlineAddPatient(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCreateModal, showDrawer, deleteConfirmModal?.open, viewerModal?.open, showInlineAddPatient]);

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Reportable Diseases from reportable_diseases table
      const { data: disData } = await supabase
        .from('reportable_diseases')
        .select('id, name')
        .order('name');

      if (disData && disData.length > 0) {
        setDiseasesList(disData);
      }

      // 2. Get logged in doctor
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
          setViewerModal({ open: false, storagePath: null });
          setDeleteConfirmModal(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      // 3. Fetch Patients for selection
      const { data: pts } = await supabase
        .from('patients')
        .select(`
          id,
          first_name,
          last_name,
          nin,
          date_of_birth,
          gender,
          blood_type
        `);

      if (pts) setPatientsList(pts);

      // 4. Fetch Health Events for this Doctor with joined reportable_diseases
      const { data: evtsData, error: evtsErr } = await supabase
        .from('health_events')
        .select(`
          *,
          patient:patient_id (
            id,
            first_name,
            last_name,
            nin,
            date_of_birth,
            gender,
            blood_type
          ),
          reportable_disease:reportable_disease_id (
            id,
            name
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

    if (!patientForm.first_name.trim() || !patientForm.last_name.trim() || !patientForm.nin.trim()) {
      setFormError("Nom, prénom et NIN sont obligatoires pour créer un patient.");
      return;
    }

    try {
      // Create patient entry directly in patients table (No user account)
      const { data: ptData, error: ptErr } = await supabase
        .from('patients')
        .insert([{
          first_name: patientForm.first_name.trim(),
          last_name: patientForm.last_name.trim(),
          nin: patientForm.nin.trim(),
          date_of_birth: patientForm.date_of_birth || '1990-01-01',
          gender: patientForm.gender,
          blood_type: patientForm.blood_type
        }])
        .select()
        .single();

      if (ptErr) throw new Error(ptErr.message);

      // Update patient list and select new patient automatically
      setPatientsList(prev => [ptData, ...prev]);
      setForm(prev => ({ ...prev, patient_id: ptData.id }));
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
      setFormError("Veuillez sélectionner un patient.");
      return;
    }

    if (!form.reportable_disease_id) {
      setFormError("Veuillez sélectionner une maladie / événement déclarable.");
      return;
    }

    if (!form.description.trim()) {
      setFormError("Veuillez fournir une description détaillée des observations médicales.");
      return;
    }

    if (!selectedProofFile) {
      setFormError("Veuillez joindre obligatoirement un document de preuve.");
      return;
    }

    if (!currentDoctor?.id || !currentDoctor?.facilityId) {
      setFormError("Profil médecin ou établissement non valide.");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Insert Health Event Record First
      const { data: newEvt, error: insertErr } = await supabase
        .from('health_events')
        .insert([{
          doctor_id: currentDoctor.id, // Strictly scoped to authenticated doctor
          facility_id: currentDoctor.facilityId, // Strictly scoped to doctor's facility
          patient_id: form.patient_id,
          reportable_disease_id: form.reportable_disease_id,
          description: form.description.trim(),
          severity: form.severity,
          patient_proof_url: null
        }])
        .select()
        .single();

      if (insertErr || !newEvt) throw new Error(insertErr?.message || "Erreur lors de la création de l'événement.");

      // 2. Upload Proof Document if selected
      if (selectedProofFile) {
        setUploadingProof(true);
        setUploadProgress(35);

        let proofPath = "";
        try {
          proofPath = await uploadProofDocument(newEvt.id, selectedProofFile);
          setUploadProgress(85);
        } catch (uploadErr: any) {
          console.error("Proof file upload failed:", uploadErr);
          // Rollback: Delete newly created event so incomplete record is not saved
          await supabase.from('health_events').delete().eq('id', newEvt.id);
          setFormError(uploadErr.message || "Impossible d'ajouter le document de preuve. Veuillez réessayer.");
          return;
        }

        // 3. Update database record with proof path
        const { error: updateErr } = await supabase
          .from('health_events')
          .update({ patient_proof_url: proofPath })
          .eq('id', newEvt.id);

        if (updateErr) {
          // Cleanup uploaded storage file & rollback event creation
          await deleteProofDocument(proofPath);
          await supabase.from('health_events').delete().eq('id', newEvt.id);
          throw new Error("Impossible d'associer le document de preuve à la déclaration.");
        }
        setUploadProgress(100);
      }

      setShowCreateModal(false);
      setForm({
        patient_id: "",
        reportable_disease_id: "",
        description: "",
        severity: "MEDIUM",
        patient_proof_url: ""
      });
      setSelectedProofFile(null);
      setToast({ message: "✓ Événement de santé déclaré avec succès", type: 'success' });
      loadData();
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de la déclaration de l'événement.");
    } finally {
      setSubmitting(false);
      setUploadingProof(false);
      setUploadProgress(0);
    }
  };

  // Helper to View Proof Document with View-Only PatientProofViewer
  const handleViewProofDocument = (proofPathOrUrl: string, eventId?: string) => {
    setViewerModal({
      open: true,
      storagePath: proofPathOrUrl,
      healthEventId: eventId || selectedEvent?.id,
      documentTitle: extractFileName(proofPathOrUrl)
    });
  };

  // Helper to Confirm & Delete Proof Document
  const handleConfirmDeleteProof = async () => {
    if (!deleteConfirmModal?.eventId || !deleteConfirmModal?.path) return;

    setSubmitting(true);
    try {
      const { eventId, path } = deleteConfirmModal;

      // 1. Delete file object from private storage bucket
      await deleteProofDocument(path);

      // 2. Set patient_proof_url to null in DB
      const { error } = await supabase
        .from('health_events')
        .update({ patient_proof_url: null })
        .eq('id', eventId);

      if (error) throw error;

      // 3. Update drawer state if open
      if (selectedEvent && selectedEvent.id === eventId) {
        setSelectedEvent((prev: any) => prev ? { ...prev, patient_proof_url: null } : null);
      }

      setDeleteConfirmModal(null);
      setToast({ message: "✓ Document de preuve supprimé avec succès", type: 'success' });
      loadData();
    } catch (err: any) {
      console.error("Error deleting proof document:", err);
      setToast({ message: "Impossible de supprimer le document. Veuillez réessayer.", type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to Trigger AI Observation Enhancement
  const handleEnhanceObservations = async () => {
    if (!form.description.trim()) {
      setAiError("Veuillez rédiger vos observations initiales avant de demander l'amélioration par l'IA.");
      return;
    }

    setAiError(null);
    setAiLoading(true);
    const originalText = form.description.trim();

    const result = await enhanceMedicalObservation(originalText);
    setAiLoading(false);

    if (result.success && result.structuredObservation && result.formattedPlainText) {
      setAiProposal({
        original: originalText,
        structured: result.structuredObservation,
        formattedPlainText: result.formattedPlainText
      });
    } else {
      setAiError(result.error || "⚠️ Impossible d'améliorer le texte. Réessayer.");
    }
  };

  // Helper to Accept AI Proposal and insert clean plain text into editable textarea
  const handleAcceptAIProposal = () => {
    if (aiProposal?.formattedPlainText) {
      setForm((prev) => ({ ...prev, description: aiProposal.formattedPlainText }));
      setAiProposal(null);
      setAiError(null);
      setToast({ message: "✓ Reformulation IA appliquée à vos observations", type: 'success' });
    }
  };

  // Helper to Reject AI Proposal and retain doctor's original version
  const handleRejectAIProposal = () => {
    setAiProposal(null);
    setAiError(null);
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
    
    const diseaseObj = Array.isArray(evt.reportable_disease) ? evt.reportable_disease[0] : evt.reportable_disease;
    const diseaseName = (diseaseObj?.name || '').toLowerCase();
    const nin = (patientObj?.nin || '').toLowerCase();

    const matchesSearch = patientName.includes(q) || diseaseName.includes(q) || nin.includes(q);
    const matchesDisease = diseaseFilter === "ALL" || evt.reportable_disease_id === diseaseFilter;
    const matchesSeverity = severityFilter === "ALL" || evt.severity === severityFilter;

    return matchesSearch && matchesDisease && matchesSeverity;
  });

  const isFilterActive = searchQuery.trim() !== "" || diseaseFilter !== "ALL" || severityFilter !== "ALL";

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'center' }}>
          {/* Integrated Search Input */}
          <div style={{ position: 'relative' }}>
            <Search size={18} color={COLORS.muted} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Rechercher une maladie, patient..."
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

          {/* Disease Filter */}
          <SelectDropdown
            value={diseaseFilter}
            onChange={setDiseaseFilter}
            placeholder="Toutes les maladies"
            icon={Activity}
            searchable={true}
            options={[
              { value: 'ALL', label: 'Toutes les maladies' },
              ...diseasesList.map((d) => ({ value: d.id, label: d.name }))
            ]}
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
              {diseaseFilter !== 'ALL' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: COLORS.lightTeal, color: COLORS.teal, padding: '4px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '700' }}>
                  Maladie : {diseasesList.find(d => d.id === diseaseFilter)?.name || 'Spécifique'}
                  <X size={14} style={{ cursor: 'pointer' }} onClick={() => setDiseaseFilter('ALL')} />
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
                setDiseaseFilter('ALL');
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
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: `1px solid ${COLORS.border}`, overflowX: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: COLORS.muted }}>Chargement des événements de santé...</div>
        ) : (
          <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: `1px solid ${COLORS.border}` }}>
              <tr>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Maladie</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Patient</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Établissement</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gravité</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                <th style={{ padding: '14px 20px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((evt, idx) => {
                const patientObj = Array.isArray(evt.patient) ? evt.patient[0] : evt.patient;
                const userObj = Array.isArray(patientObj?.users) ? patientObj.users[0] : patientObj?.users;
                const pName = userObj ? `${userObj.first_name || ''} ${userObj.last_name || ''}`.trim() : "Patient";
                const diseaseObj = Array.isArray(evt.reportable_disease) ? evt.reportable_disease[0] : evt.reportable_disease;
                const diseaseName = diseaseObj?.name || "Maladie non spécifiée";

                return (
                  <tr key={evt.id} style={{ borderBottom: idx !== filteredEvents.length - 1 ? `1px solid ${COLORS.border}` : 'none' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '0.95rem' }}>{diseaseName}</div>
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

                    <td style={{ padding: '16px 20px', color: COLORS.navy, fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: '700' }}>
                        {formatDateTime(evt.created_at)}
                      </div>
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
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3.5rem', color: COLORS.muted }}>
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
                  {(Array.isArray(selectedEvent.reportable_disease) ? selectedEvent.reportable_disease[0] : selectedEvent.reportable_disease)?.name || "Événement de Santé"}
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
                  <div style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase' }}>Structure</div>
                  <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '0.9rem', marginTop: '2px' }}>
                    {selectedEvent.facility?.name}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase' }}>Date & Heure de création</div>
                  <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '0.9rem', marginTop: '2px' }}>
                    {formatDateTime(selectedEvent.created_at)}
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

              {/* Patient Proof Document Card in Drawer */}
              {selectedEvent.patient_proof_url ? (
                <div style={{ border: `1px solid ${COLORS.teal}`, borderRadius: '14px', padding: '16px', backgroundColor: COLORS.lightTeal }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: '800', color: COLORS.teal, textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Paperclip size={16} /> Document de Preuve
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'white', color: COLORS.teal }}>
                        {isPdfFile(selectedEvent.patient_proof_url) ? <FileText size={22} /> : <ImageIcon size={22} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '0.9rem' }}>
                          {extractFileName(selectedEvent.patient_proof_url)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: COLORS.muted }}>
                          Stockage sécurisé (Accès restreint)
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleViewProofDocument(selectedEvent.patient_proof_url)}
                        style={{ padding: '6px 14px', borderRadius: '8px', border: `1px solid ${COLORS.teal}`, background: 'white', color: COLORS.teal, fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Eye size={15} /> Voir
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmModal({
                          open: true,
                          eventId: selectedEvent.id,
                          path: selectedEvent.patient_proof_url
                        })}
                        style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Trash2 size={15} /> Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ border: `1px dashed ${COLORS.border}`, borderRadius: '14px', padding: '14px', backgroundColor: '#F8FAFC', color: COLORS.muted, fontSize: '0.85rem', textAlign: 'center' }}>
                  Aucun document joint
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

              {/* Responsive 2-Column Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '24px' }}>
                {/* Left Column: Patient & Reportable Disease */}
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
                        const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Patient';
                        const age = calculateAge(p.date_of_birth);

                        return {
                          value: p.id,
                          label: name,
                          sublabel: (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                              <span style={{ color: '#64748B', fontWeight: '500', fontSize: '0.75rem' }}>NIN: {p.nin}</span>
                              {age !== null && (
                                <span style={{ backgroundColor: '#F1F5F9', color: '#062C54', padding: '1px 6px', borderRadius: '4px', fontWeight: '700', fontSize: '0.72rem' }}>
                                  {age} ans
                                </span>
                              )}
                              {p.gender && (
                                <span style={{
                                  backgroundColor: p.gender === 'F' ? '#FCE7F3' : '#DBEAFE',
                                  color: p.gender === 'F' ? '#DB2777' : '#1D4ED8',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontWeight: '700',
                                  fontSize: '0.72rem'
                                }}>
                                  {p.gender === 'F' ? '♀ Femme' : '♂ Homme'}
                                </span>
                              )}
                              {p.blood_type && (
                                <span style={{ backgroundColor: '#FEF2F2', color: '#DC2626', padding: '1px 6px', borderRadius: '4px', fontWeight: '800', fontSize: '0.72rem' }}>
                                  🩸 {p.blood_type}
                                </span>
                              )}
                            </div>
                          )
                        };
                      })}
                    />
                  </div>

                  {/* Reportable Disease Selection */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>
                      Maladie / Événement déclarable *
                    </label>
                    <SelectDropdown
                      value={form.reportable_disease_id}
                      onChange={(val) => setForm({ ...form, reportable_disease_id: val })}
                      placeholder="🔍 Rechercher une maladie..."
                      icon={Activity}
                      searchable={true}
                      options={diseasesList.map((dis) => ({
                        value: dis.id,
                        label: dis.name
                      }))}
                    />
                    {diseasesList.length === 0 && (
                      <div style={{ fontSize: '0.78rem', color: COLORS.muted, marginTop: '4px' }}>
                        Chargement des maladies déclarables...
                      </div>
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

                  {/* Proof File Uploader */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>
                      Document de preuve *
                    </label>
                    <ProofUploader
                      selectedFile={selectedProofFile}
                      onFileSelect={setSelectedProofFile}
                      uploading={uploadingProof}
                      uploadProgress={uploadProgress}
                    />
                  </div>
                </div>
              </div>

              {/* Description & AI Enhancement (Full Width Below Grid) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: COLORS.navy }}>
                    Observations Médicales & Circonstances *
                  </label>
                  {aiLoading && (
                    <span style={{ fontSize: '0.78rem', color: COLORS.teal, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={14} className="animate-spin" /> Analyse en cours... L'IA structure vos observations.
                    </span>
                  )}
                </div>

                <textarea
                  rows={4}
                  required
                  value={form.description}
                  onChange={(e) => {
                    setForm({ ...form, description: e.target.value });
                    if (aiError) setAiError(null);
                  }}
                  placeholder="Décrivez les observations cliniques, les circonstances de l'événement et les informations pertinentes..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    border: `1px solid ${COLORS.border}`,
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'vertical',
                    backgroundColor: 'white',
                    color: COLORS.navy,
                    lineHeight: '1.5'
                  }}
                />

                {/* AI Enhancement Trigger Button */}
                {!aiProposal && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginTop: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        disabled={aiLoading || submitting || !form.description.trim()}
                        onClick={handleEnhanceObservations}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '7px',
                          padding: '7px 15px',
                          borderRadius: '999px',
                          border: `1px solid ${COLORS.teal}`,
                          backgroundColor: aiLoading ? COLORS.lightTeal : 'white',
                          color: COLORS.teal,
                          fontWeight: '700',
                          fontSize: '0.82rem',
                          cursor: (aiLoading || !form.description.trim()) ? 'not-allowed' : 'pointer',
                          boxShadow: '0 2px 6px rgba(15, 162, 155, 0.12)',
                          opacity: (!form.description.trim()) ? 0.6 : 1,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Sparkles size={15} />
                        {aiLoading ? "Amélioration..." : "✨ Améliorer avec l'IA"}
                      </button>
                      <span style={{ fontSize: '0.76rem', color: COLORS.muted, fontWeight: '500' }}>
                        Reformule et structure vos observations sans modifier les faits.
                      </span>
                    </div>
                  </div>
                )}

                {/* AI Error Alert Banner */}
                {aiError && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#DC2626',
                    fontSize: '0.82rem',
                    fontWeight: '600'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={16} />
                      <span>{aiError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleEnhanceObservations}
                      style={{ background: 'none', border: 'none', color: '#DC2626', fontWeight: '700', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.78rem' }}
                    >
                      Réessayer
                    </button>
                  </div>
                )}

                {/* Side-by-Side Proposal Review UI */}
                {aiProposal && (
                  <div style={{
                    border: `1px solid ${COLORS.teal}`,
                    borderRadius: '14px',
                    backgroundColor: COLORS.lightTeal,
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 4px 16px rgba(15, 162, 155, 0.1)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.teal, fontWeight: '800', fontSize: '0.88rem' }}>
                        <Sparkles size={18} /> ✨ Proposition améliorée par l'IA
                      </div>
                      <span style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '600' }}>
                        Examinez les deux versions avant de choisir
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      {/* Original Doctor Version */}
                      <div style={{ backgroundColor: 'white', border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase' }}>
                          Votre version originale
                        </div>
                        <div style={{ fontSize: '0.86rem', color: COLORS.navy, lineHeight: '1.5', whiteSpace: 'pre-wrap', flex: 1 }}>
                          {aiProposal.original}
                        </div>
                      </div>

                      {/* AI Enhanced Proposal Version - Non-Repetitive Presentation */}
                      <div style={{ backgroundColor: 'white', border: `2px solid ${COLORS.teal}`, borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: '800', color: COLORS.teal, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Sparkles size={14} /> {aiProposal.structured.title || "Observations cliniques"}
                        </div>

                        {aiProposal.structured.paragraph ? (
                          <div style={{ fontSize: '0.86rem', color: COLORS.navy, lineHeight: '1.5', whiteSpace: 'pre-wrap', flex: 1, fontWeight: '500' }}>
                            {aiProposal.structured.paragraph}
                          </div>
                        ) : aiProposal.structured.items && aiProposal.structured.items.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, marginTop: '4px' }}>
                            {aiProposal.structured.items.map((item, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.84rem', color: COLORS.navy, lineHeight: '1.45' }}>
                                <span style={{ color: COLORS.teal, fontWeight: '800', fontSize: '0.9rem', lineHeight: '1.2' }}>•</span>
                                <div style={{ flex: 1 }}>
                                  <strong style={{ color: COLORS.navy, fontWeight: '700' }}>{item.label}</strong>
                                  {item.content ? <span style={{ color: COLORS.text }}> — {item.content}</span> : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Review Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', borderTop: '1px solid rgba(15, 162, 155, 0.2)', paddingTop: '12px' }}>
                      <button
                        type="button"
                        onClick={handleRejectAIProposal}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          border: `1px solid ${COLORS.border}`,
                          backgroundColor: 'white',
                          color: COLORS.text,
                          fontWeight: '600',
                          fontSize: '0.84rem',
                          cursor: 'pointer'
                        }}
                      >
                        Garder ma version
                      </button>

                      <button
                        type="button"
                        onClick={handleAcceptAIProposal}
                        style={{
                          padding: '8px 20px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: COLORS.teal,
                          color: 'white',
                          fontWeight: '700',
                          fontSize: '0.84rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 8px rgba(15, 162, 155, 0.25)'
                        }}
                      >
                        <Check size={16} /> Utiliser cette version
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px', borderTop: `1px solid ${COLORS.border}`, paddingTop: '16px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '10px 18px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, background: 'white', color: COLORS.text, fontWeight: '600', cursor: 'pointer' }}>
                  Annuler (ESC)
                </button>
                <button type="submit" disabled={submitting || uploadingProof || aiLoading} style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', background: COLORS.navy, color: 'white', fontWeight: '700', cursor: 'pointer' }}>
                  {submitting || uploadingProof ? "Transmission..." : "Transmettre la déclaration →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Proof Confirmation Modal */}
      {deleteConfirmModal && deleteConfirmModal.open && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6, 44, 84, 0.6)', zIndex: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: COLORS.navy, margin: '0 0 8px 0' }}>
              Supprimer le document ?
            </h3>
            <p style={{ fontSize: '0.88rem', color: COLORS.muted, margin: '0 0 20px 0', lineHeight: '1.5' }}>
              Ce document sera définitivement supprimé de ce dossier.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmModal(null)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, background: 'white', color: COLORS.text, fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProof}
                disabled={submitting}
                style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#DC2626', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                {submitting ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View-Only Patient Proof Document Viewer */}
      <PatientProofViewer
        open={viewerModal.open}
        onClose={() => setViewerModal({ open: false, storagePath: null })}
        storagePath={viewerModal.storagePath}
        healthEventId={viewerModal.healthEventId}
        documentTitle={viewerModal.documentTitle}
      />
    </div>
  );
}
