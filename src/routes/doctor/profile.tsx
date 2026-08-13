import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/utils";
import { 
  User, 
  Building2, 
  CheckCircle2, 
  Mail, 
  Phone, 
  FileText, 
  MapPin, 
  RefreshCw,
  ArrowRight,
  Clock,
  AlertCircle,
  XCircle,
  Check,
  Search,
  X,
  Send,
  AlertTriangle
} from "lucide-react";

export const Route = createFileRoute("/doctor/profile")({
  component: DoctorProfilePage,
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

interface Facility {
  id: string;
  name: string;
  wilaya: string;
  facility_type?: string;
  address?: string;
}

interface FacilityChangeRequest {
  id: string;
  doctor_id: string;
  current_facility_id: string;
  requested_facility_id: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  review_message?: string | null;
  created_at: string;
  updated_at: string;
  current_facility?: Facility | Facility[];
  requested_facility?: Facility | Facility[];
}

function DoctorProfilePage() {
  const [loading, setLoading] = useState(true);
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [changeRequests, setChangeRequests] = useState<FacilityChangeRequest[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  
  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFacilityId, setSelectedFacilityId] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Escape key listener to close modal
  useEffect(() => {
    if (!showModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Esc") {
        setShowModal(false);
        setConfirmStep(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showModal]);

  // Load Doctor Profile & Change Requests
  const loadProfileData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Doctor Info
      const { data: docData, error: docErr } = await supabase
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
            wilaya,
            address
          )
        `)
        .limit(1)
        .maybeSingle();

      if (docErr) throw docErr;

      if (docData && docData.users) {
        const userObj = Array.isArray(docData.users) ? docData.users[0] : docData.users;
        const facObj = Array.isArray(docData.facility) ? docData.facility[0] : docData.facility;

        const profileObj = {
          id: docData.id,
          userId: docData.user_id,
          email: userObj?.email,
          firstName: userObj?.first_name,
          lastName: userObj?.last_name,
          nin: docData.nin,
          orderNumber: docData.order_number,
          phone: docData.phone,
          specialty: docData.specialty,
          status: docData.status,
          facilityId: docData.facility_id,
          facilityName: facObj?.name,
          facilityType: facObj?.facility_type,
          facilityWilaya: facObj?.wilaya,
          facilityAddress: facObj?.address
        };

        setDoctorProfile(profileObj);

        // 2. Fetch Facility Change Requests for this doctor
        const { data: reqData } = await supabase
          .from('doctor_facility_change_requests')
          .select(`
            *,
            current_facility:current_facility_id (id, name, wilaya, facility_type),
            requested_facility:requested_facility_id (id, name, wilaya, facility_type)
          `)
          .eq('doctor_id', docData.id)
          .order('created_at', { ascending: false });

        if (reqData) {
          setChangeRequests(reqData as any);
        }

        // 3. Fetch Facilities list for change selector
        const { data: facData } = await supabase
          .from('facilities')
          .select('id, name, wilaya, facility_type, address')
          .order('name');

        if (facData) {
          setFacilities(facData);
        }
      }
    } catch (err) {
      console.error("Error loading doctor profile data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, []);

  // Find Pending Request
  const pendingRequest = changeRequests.find(r => r.status === 'PENDING');
  // Find Latest Non-Pending Request (for displaying approved/rejected status banner)
  const latestCompletedRequest = changeRequests.find(r => r.status !== 'PENDING');

  // Selected Facility Object
  const selectedFacilityObj = facilities.find(f => f.id === selectedFacilityId);

  // Form Submit Handler
  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedFacilityId) {
      setFormError("Veuillez sélectionner un nouvel établissement.");
      return;
    }

    if (selectedFacilityId === doctorProfile?.facilityId) {
      setFormError("Veuillez sélectionner un établissement différent de votre établissement actuel.");
      return;
    }

    if (!reason.trim()) {
      setFormError("Veuillez indiquer le motif de votre demande.");
      return;
    }

    setConfirmStep(true);
  };

  const handleConfirmSubmit = async () => {
    if (!doctorProfile?.id || !doctorProfile?.facilityId || !selectedFacilityId || !reason.trim()) {
      setFormError("Données de formulaire incomplètes.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      // Create PENDING request in DB
      const { error: insertErr } = await supabase
        .from('doctor_facility_change_requests')
        .insert([{
          doctor_id: doctorProfile.id,
          current_facility_id: doctorProfile.facilityId,
          requested_facility_id: selectedFacilityId,
          reason: reason.trim(),
          status: 'PENDING'
        }]);

      if (insertErr) throw insertErr;

      setToast({
        message: "✓ Demande de changement d'établissement envoyée avec succès.",
        type: 'success'
      });

      setShowModal(false);
      setConfirmStep(false);
      setSelectedFacilityId("");
      setReason("");
      setSearchQuery("");
      
      // Reload Profile & Request history
      await loadProfileData();
    } catch (err: any) {
      console.error("Error submitting facility change request:", err);
      setFormError(err.message || "Impossible d'envoyer la demande. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFacilities = facilities.filter(f => 
    f.id !== doctorProfile?.facilityId &&
    (f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     f.wilaya.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span style={{ backgroundColor: '#FEF3C7', color: '#D97706', border: '1px solid #FCD34D', padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Clock size={13} /> 🟡 En attente
          </span>
        );
      case 'APPROVED':
        return (
          <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <CheckCircle2 size={13} /> 🟢 Approuvée
          </span>
        );
      case 'REJECTED':
        return (
          <span style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5', padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <XCircle size={13} /> 🔴 Refusée
          </span>
        );
      case 'CANCELLED':
        return (
          <span style={{ backgroundColor: '#F1F5F9', color: '#64748B', border: '1px solid #CBD5E1', padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            ⚪ Annulée
          </span>
        );
      default:
        return null;
    }
  };

  const getFacilityName = (facilityProp: Facility | Facility[] | undefined) => {
    if (!facilityProp) return 'Établissement';
    return Array.isArray(facilityProp) ? facilityProp[0]?.name : facilityProp.name;
  };

  const getFacilityWilaya = (facilityProp: Facility | Facility[] | undefined) => {
    if (!facilityProp) return '';
    return Array.isArray(facilityProp) ? facilityProp[0]?.wilaya : facilityProp.wilaya;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '880px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* Toast Banner */}
      {toast && (
        <div style={{
          backgroundColor: toast.type === 'success' ? '#0fa29b' : '#DC2626',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '12px',
          fontWeight: '700',
          fontSize: '0.9rem',
          boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
              <User size={24} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: COLORS.navy, margin: 0 }}>
              Profil Médecin Déclarant
            </h2>
          </div>
          <p style={{ color: COLORS.muted, fontSize: '0.95rem', margin: 0 }}>
            Informations d'accréditation et de rattachement à la structure sanitaire.
          </p>
        </div>

        <button
          onClick={loadProfileData}
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
            gap: '8px'
          }}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Actualiser
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: COLORS.muted, fontWeight: '600' }}>
          Chargement du profil...
        </div>
      ) : doctorProfile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Identity Card */}
          <div style={{ backgroundColor: 'white', borderRadius: '20px', border: `1px solid ${COLORS.border}`, padding: '28px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: COLORS.navy, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: '800' }}>
                Dr
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: COLORS.navy, margin: 0 }}>
                    Dr. {doctorProfile.firstName} {doctorProfile.lastName}
                  </h3>
                  <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <CheckCircle2 size={14} /> Médecin Agréé
                  </span>
                </div>
                <div style={{ color: COLORS.teal, fontWeight: '700', fontSize: '0.95rem', marginTop: '2px' }}>
                  {doctorProfile.specialty}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '14px', border: `1px solid ${COLORS.border}` }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} /> Email Professionnel
                </div>
                <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '0.92rem', marginTop: '4px' }}>{doctorProfile.email}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={14} /> Téléphone
                </div>
                <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '0.92rem', marginTop: '4px' }}>{doctorProfile.phone}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} /> NIN
                </div>
                <div style={{ fontWeight: '800', color: COLORS.navy, fontSize: '0.92rem', marginTop: '4px' }}>{doctorProfile.nin}</div>
              </div>

              {doctorProfile.orderNumber && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={14} /> N° Ordre des Médecins
                  </div>
                  <div style={{ fontWeight: '800', color: COLORS.teal, fontSize: '0.92rem', marginTop: '4px' }}>{doctorProfile.orderNumber}</div>
                </div>
              )}
            </div>
          </div>

          {/* Current Facility Card */}
          <div style={{ backgroundColor: 'white', borderRadius: '20px', border: `1px solid ${COLORS.border}`, padding: '28px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: '800', color: COLORS.navy, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={20} color={COLORS.teal} /> Établissement de Rattachement
              </div>

              {/* Action Button: Disabled if Pending Request Exists */}
              {!pendingRequest && (
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(true);
                    setConfirmStep(false);
                    setFormError(null);
                  }}
                  style={{
                    backgroundColor: COLORS.teal,
                    color: 'white',
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: '10px',
                    fontWeight: '700',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(15, 162, 155, 0.25)',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <Building2 size={16} />
                  <span>Demander un changement</span>
                </button>
              )}
            </div>

            {/* Current Facility Details Box */}
            <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '20px', backgroundColor: '#F8FAFC' }}>
              <div style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
                Établissement actuel
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: '800', color: COLORS.navy, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🏥</span>
                <span>{doctorProfile.facilityName || 'Établissement non spécifié'}</span>
              </div>
              <div style={{ fontSize: '0.88rem', color: COLORS.muted, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {doctorProfile.facilityType && <span>Type : <strong>{doctorProfile.facilityType}</strong></span>}
                {doctorProfile.facilityType && doctorProfile.facilityWilaya && <span>•</span>}
                {doctorProfile.facilityWilaya && <span>Wilaya : <strong>{doctorProfile.facilityWilaya}</strong></span>}
              </div>
              {doctorProfile.facilityAddress && (
                <div style={{ fontSize: '0.82rem', color: COLORS.text, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} color={COLORS.teal} /> Adresse : {doctorProfile.facilityAddress}
                </div>
              )}
            </div>
          </div>

          {/* ACTIVE PENDING REQUEST BANNER */}
          {pendingRequest && (
            <div 
              style={{ 
                backgroundColor: '#FFFBEB', 
                border: '1px solid #FCD34D', 
                borderRadius: '18px', 
                padding: '24px',
                boxShadow: '0 4px 16px rgba(217, 119, 6, 0.08)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#B45309', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Demande de changement en cours
                  </div>
                  <h4 style={{ margin: '4px 0 0 0', fontSize: '1.15rem', fontWeight: '800', color: '#92400E' }}>
                    Demande de rattachement soumise
                  </h4>
                </div>
                {getStatusBadge('PENDING')}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', backgroundColor: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #FDE68A', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#B45309', fontWeight: '700', textTransform: 'uppercase' }}>
                    🏥 Établissement demandé
                  </div>
                  <div style={{ fontWeight: '800', color: COLORS.navy, fontSize: '0.98rem', marginTop: '2px' }}>
                    {getFacilityName(pendingRequest.requested_facility)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: COLORS.muted }}>
                    {getFacilityWilaya(pendingRequest.requested_facility)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: '#B45309', fontWeight: '700', textTransform: 'uppercase' }}>
                    Envoyée le
                  </div>
                  <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '0.92rem', marginTop: '2px' }}>
                    {formatDateTime(pendingRequest.created_at)}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', color: '#B45309', lineHeight: '1.5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>
                  Votre établissement actuel reste inchangé jusqu'à la validation officielle de cette demande.
                </span>
              </div>
            </div>
          )}

          {/* LATEST COMPLETED REQUEST NOTIFICATION (If Approved or Rejected) */}
          {!pendingRequest && latestCompletedRequest && (
            <div>
              {latestCompletedRequest.status === 'APPROVED' && (
                <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <CheckCircle2 size={24} color="#16A34A" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: '800', color: '#15803D', fontSize: '1rem' }}>
                      ✓ Changement d'établissement approuvé
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#166534', marginTop: '4px' }}>
                      Votre demande de rattachement à 🏥 <strong>{getFacilityName(latestCompletedRequest.requested_facility)}</strong> a été approuvée.
                    </div>
                  </div>
                </div>
              )}

              {latestCompletedRequest.status === 'REJECTED' && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <XCircle size={24} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: '800', color: '#B91C1C', fontSize: '1rem' }}>
                      Demande de changement refusée
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#991B1B', marginTop: '4px' }}>
                      Votre demande de changement vers 🏥 <strong>{getFacilityName(latestCompletedRequest.requested_facility)}</strong> a été refusée.
                    </div>
                    {latestCompletedRequest.review_message && (
                      <div style={{ marginTop: '8px', padding: '10px 14px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #FECDD3', fontSize: '0.85rem', color: '#7F1D1D' }}>
                        <strong>Motif du refus :</strong> {latestCompletedRequest.review_message}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* REQUEST HISTORY SECTION */}
          <div style={{ backgroundColor: 'white', borderRadius: '20px', border: `1px solid ${COLORS.border}`, padding: '28px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: COLORS.navy, margin: '0 0 18px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color={COLORS.teal} /> Historique des demandes de changement
            </h4>

            {changeRequests.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {changeRequests.map((req) => (
                  <div 
                    key={req.id}
                    style={{
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '14px',
                      padding: '16px 20px',
                      backgroundColor: '#F8FAFC',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '14px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', color: COLORS.navy, fontSize: '0.95rem' }}>
                        <span>🏥</span>
                        <span>{getFacilityName(req.requested_facility)}</span>
                        <span style={{ fontSize: '0.8rem', color: COLORS.muted, fontWeight: '500' }}>
                          ({getFacilityWilaya(req.requested_facility)})
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: COLORS.muted, marginTop: '4px' }}>
                        Demande créée le {formatDateTime(req.created_at)}
                      </div>
                      {req.reason && (
                        <div style={{ fontSize: '0.82rem', color: COLORS.text, marginTop: '6px', fontStyle: 'italic' }}>
                          « {req.reason} »
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {getStatusBadge(req.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: COLORS.muted, fontSize: '0.9rem' }}>
                Aucune demande de changement d'établissement enregistrée pour le moment.
              </div>
            )}
          </div>

        </div>
      ) : (
        <div style={{ padding: '3rem', textAlign: 'center', color: COLORS.muted }}>
          Profil non disponible.
        </div>
      )}

      {/* CHANGE FACILITY MODAL / DRAWER */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6, 44, 84, 0.6)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '580px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '24px', backgroundColor: COLORS.navy, color: 'white', borderRadius: '24px 24px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: COLORS.teal, textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
                  Mobilité Professionnelle
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '4px 0 0 0' }}>
                  Demander un changement d'établissement
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setShowModal(false);
                  setConfirmStep(false);
                }} 
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Supporting Text */}
              <p style={{ margin: 0, fontSize: '0.88rem', color: COLORS.muted, lineHeight: '1.5' }}>
                Vous pouvez demander votre rattachement à un autre établissement. Votre demande devra être examinée et validée avant toute modification de votre profil.
              </p>

              {/* Form Error Banner */}
              {formError && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '12px 16px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>{formError}</span>
                </div>
              )}

              {/* STEP 1: FORM INPUTS */}
              {!confirmStep ? (
                <form onSubmit={handleNextStep} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Current Facility (Read-Only) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>
                      Établissement actuel (Lecture seule)
                    </label>
                    <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '14px 16px', backgroundColor: '#F8FAFC', color: COLORS.navy, fontWeight: '700', fontSize: '0.95rem' }}>
                      🏥 {doctorProfile?.facilityName} <span style={{ fontSize: '0.82rem', color: COLORS.muted, fontWeight: '500' }}>({doctorProfile?.facilityWilaya})</span>
                    </div>
                  </div>

                  {/* Requested Facility Selector */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>
                      Nouvel établissement *
                    </label>

                    {/* Facility Search Input */}
                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                      <Search size={16} color={COLORS.muted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        placeholder="Rechercher par nom d'établissement ou wilaya..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px 10px 36px',
                          borderRadius: '10px',
                          border: `1px solid ${COLORS.border}`,
                          fontSize: '0.85rem',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* Facility Scrollable Options Box */}
                    <div style={{ maxHeight: '180px', overflowY: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: 'white' }}>
                      {filteredFacilities.map((fac) => (
                        <div
                          key={fac.id}
                          onClick={() => setSelectedFacilityId(fac.id)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: selectedFacilityId === fac.id ? COLORS.lightTeal : 'transparent',
                            border: selectedFacilityId === fac.id ? `1px solid ${COLORS.teal}` : '1px solid transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '0.88rem' }}>
                              🏥 {fac.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: COLORS.muted }}>
                              {fac.facility_type ? `${fac.facility_type} • ` : ''}Wilaya : {fac.wilaya}
                            </div>
                          </div>
                          {selectedFacilityId === fac.id && (
                            <Check size={16} color={COLORS.teal} />
                          )}
                        </div>
                      ))}

                      {filteredFacilities.length === 0 && (
                        <div style={{ padding: '16px', textAlign: 'center', color: COLORS.muted, fontSize: '0.85rem' }}>
                          Aucun établissement trouvé.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reason Textarea */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: COLORS.navy, marginBottom: '6px' }}>
                      Motif de la demande *
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Expliquez brièvement la raison de votre demande (ex: mutation professionnelle, réaffectation régionale)..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '12px',
                        border: `1px solid ${COLORS.border}`,
                        fontSize: '0.9rem',
                        color: COLORS.text,
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>

                  {/* Form Footer Action */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px', borderTop: `1px solid ${COLORS.border}` }}>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        border: `1px solid ${COLORS.border}`,
                        backgroundColor: 'white',
                        color: COLORS.muted,
                        fontWeight: '700',
                        fontSize: '0.88rem',
                        cursor: 'pointer'
                      }}
                    >
                      Annuler
                    </button>

                    <button
                      type="submit"
                      style={{
                        padding: '10px 24px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: COLORS.navy,
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span>Continuer</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>

                </form>
              ) : (
                /* STEP 2: CONFIRMATION VIEW */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ backgroundColor: '#F8FAFC', border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: COLORS.navy, marginBottom: '8px' }}>
                      Confirmer la demande ?
                    </div>
                    <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: COLORS.muted }}>
                      Vous demandez votre rattachement à l'établissement suivant :
                    </p>

                    <div style={{ backgroundColor: COLORS.lightTeal, border: `1px solid ${COLORS.teal}`, borderRadius: '12px', padding: '16px', marginBottom: '14px' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: '800', color: COLORS.navy }}>
                        🏥 {selectedFacilityObj?.name}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: COLORS.teal, fontWeight: '700', marginTop: '2px' }}>
                        Wilaya de {selectedFacilityObj?.wilaya}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: COLORS.muted, lineHeight: '1.4' }}>
                      Votre établissement actuel (<strong>{doctorProfile?.facilityName}</strong>) restera inchangé jusqu'à la validation officielle de cette demande.
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px', borderTop: `1px solid ${COLORS.border}` }}>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setConfirmStep(false)}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        border: `1px solid ${COLORS.border}`,
                        backgroundColor: 'white',
                        color: COLORS.muted,
                        fontWeight: '700',
                        fontSize: '0.88rem',
                        cursor: 'pointer'
                      }}
                    >
                      Retour
                    </button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleConfirmSubmit}
                      style={{
                        padding: '10px 24px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: COLORS.teal,
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '0.88rem',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(15, 162, 155, 0.25)'
                      }}
                    >
                      <Send size={16} />
                      <span>{submitting ? "Envoi en cours..." : "Confirmer et envoyer"}</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
