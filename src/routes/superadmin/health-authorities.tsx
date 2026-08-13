import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { hashPassword } from "@/lib/auth-hash";
import { 
  Plus, 
  ShieldCheck, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  User, 
  Lock, 
  Mail, 
  Check, 
  RefreshCw, 
  Search, 
  Building2, 
  Sparkles,
  Award,
  ArrowRight,
  Edit3,
  Briefcase
} from "lucide-react";

export const Route = createFileRoute("/superadmin/health-authorities")({
  component: HealthAuthoritiesPage,
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

const PRESET_AUTHORITY_TYPES = [
  { 
    code: 'DSP', 
    label: 'Directeur de santé publique', 
    short: 'DSP', 
    description: 'Direction de la Santé Publique au niveau de la wilaya' 
  },
  { 
    code: 'DSS', 
    label: 'Directeur de service de santé', 
    short: 'DSS', 
    description: 'Direction des Services de Santé et des Établissements' 
  }
];

// Helper: Calculate Password Strength
function getPasswordStrength(password: string) {
  if (!password) return { score: 0, label: "", color: "#cbd5e1", width: "0%" };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  switch (score) {
    case 1:
      return { score, label: "Faible", color: "#EF4444", width: "25%" };
    case 2:
      return { score, label: "Moyen", color: "#F59E0B", width: "50%" };
    case 3:
      return { score, label: "Fort", color: "#10B981", width: "75%" };
    case 4:
      return { score, label: "Excellent", color: COLORS.teal, width: "100%" };
    default:
      return { score, label: "Très faible", color: "#EF4444", width: "15%" };
  }
}

function HealthAuthoritiesPage() {
  const [authorities, setAuthorities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State matching backend requirements
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    position: "",
    authorityType: "DSP",
    customAuthorityType: ""
  });

  // UI state for password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fetch authorities from Supabase with user relational data (users is single source of truth for identity)
  const fetchAuthorities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('health_authorities')
        .select(`
          *,
          users:user_id (
            id,
            email,
            first_name,
            last_name,
            is_active,
            role,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAuthorities(data);
      }
    } catch (err) {
      console.error("Error fetching health authorities:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthorities();
  }, []);

  // ESC key listener to close modal
  useEffect(() => {
    if (!showModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Esc") {
        setShowModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showModal]);

  // Reset form when opening modal
  const handleOpenModal = () => {
    setForm({
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      position: "",
      authorityType: "DSP",
      customAuthorityType: ""
    });
    setStep(1);
    setFormError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowModal(true);
  };

  // Step Validation logic before advancing
  const validateStep = (currentStep: number) => {
    setFormError(null);

    if (currentStep === 1) {
      if (!form.email.trim()) {
        setFormError("L'adresse email est requise.");
        return false;
      }
      const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
      if (!emailRegex.test(form.email.trim())) {
        setFormError("Veuillez saisir une adresse email valide.");
        return false;
      }
      if (!form.password) {
        setFormError("Le mot de passe est requis.");
        return false;
      }
      if (form.password.length < 8) {
        setFormError("Le mot de passe doit contenir au moins 8 caractères.");
        return false;
      }
      if (form.password !== form.confirmPassword) {
        setFormError("Les mots de passe ne correspondent pas.");
        return false;
      }
    }

    if (currentStep === 2) {
      if (!form.firstName.trim()) {
        setFormError("Le prénom est requis.");
        return false;
      }
      if (!form.lastName.trim()) {
        setFormError("Le nom de famille est requis.");
        return false;
      }
    }

    if (currentStep === 3) {
      if (!form.position.trim()) {
        setFormError("L'intitulé du poste / position est requis.");
        return false;
      }
      if (form.authorityType === 'OTHER' && !form.customAuthorityType.trim()) {
        setFormError("Veuillez préciser le type d'autorité personnalisé.");
        return false;
      }
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateStep(step)) {
      setStep((s) => s + 1);
    }
  };

  const handlePrevStep = () => {
    setFormError(null);
    setStep((s) => s - 1);
  };

  // Final Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const finalAuthorityType = form.authorityType === 'OTHER' && form.customAuthorityType.trim() 
      ? form.customAuthorityType.trim() 
      : form.authorityType;

    try {
      // Step 1: Create user in `users` table (centralized identity source of truth)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([{
          email: form.email.trim().toLowerCase(),
          password_hash: hashPassword(form.password),
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          role: 'HEALTH_AUTHORITY',
          is_active: true
        }])
        .select('id')
        .single();

      if (userError || !userData) {
        if (userError?.code === '23505') {
          throw new Error("Cet email est déjà utilisé par un autre compte.");
        }
        throw new Error(userError?.message || "Erreur lors de la création du compte utilisateur.");
      }

      // Step 2: Create health_authorities record linked via user_id
      const { error: authError } = await supabase
        .from('health_authorities')
        .insert([{
          user_id: userData.id,
          position: form.position.trim(),
          authority_type: finalAuthorityType
        }]);

      if (authError) {
        // Rollback created user if authority insert fails
        await supabase.from('users').delete().eq('id', userData.id);
        throw new Error(authError.message || "Erreur lors de l'enregistrement de l'autorité de santé.");
      }

      // Move to Complete step
      setStep(5);
      fetchAuthorities();
    } catch (err: any) {
      setFormError(err.message || "Une erreur est survenue lors du traitement.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Deletion
  const handleDelete = async (id: string, userId?: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette autorité de santé ? Cette action est irréversible.")) return;

    try {
      const { error } = await supabase.from('health_authorities').delete().eq('id', id);
      if (!error && userId) {
        await supabase.from('users').delete().eq('id', userId);
      }
      fetchAuthorities();
    } catch (err) {
      console.error("Error deleting authority:", err);
    }
  };

  // Filtered Authorities for Search
  const filteredAuthorities = authorities.filter((auth) => {
    const q = searchQuery.toLowerCase();
    const pos = (auth.position || "").toLowerCase();
    const type = (auth.authority_type || "").toLowerCase();
    const email = (auth.users?.email || "").toLowerCase();
    const firstName = (auth.users?.first_name || "").toLowerCase();
    const lastName = (auth.users?.last_name || "").toLowerCase();
    return pos.includes(q) || type.includes(q) || email.includes(q) || firstName.includes(q) || lastName.includes(q);
  });

  const passwordStrength = getPasswordStrength(form.password);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
              <ShieldCheck size={24} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: COLORS.navy, margin: 0 }}>
              Autorités de Santé
            </h2>
          </div>
          <p style={{ color: COLORS.muted, fontSize: '0.95rem', margin: 0, maxWidth: '600px' }}>
            Gestion centralisée des comptes d'administration sanitaire (DSP, DSS, Clinique Privée) enregistrés sur la plateforme Rassd.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={fetchAuthorities}
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
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Actualiser
          </button>

          <button 
            onClick={handleOpenModal} 
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
              boxShadow: '0 4px 14px rgba(15,162,155,0.3)',
              transition: 'all 0.2s'
            }}
          >
            <Plus size={18} />
            Ajouter une Autorité
          </button>
        </div>
      </div>

      {/* Modern Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '14px', border: `1px solid ${COLORS.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: COLORS.muted, fontWeight: '600', textTransform: 'uppercase' }}>Total Structures</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: COLORS.navy }}>{authorities.length}</div>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '14px', border: `1px solid ${COLORS.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#F0FDF4', color: '#15803D' }}>
            <Award size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: COLORS.muted, fontWeight: '600', textTransform: 'uppercase' }}>Direction DSP</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: COLORS.navy }}>
              {authorities.filter(a => a.authority_type === 'DSP').length}
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '14px', border: `1px solid ${COLORS.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#FEF3C7', color: '#B45309' }}>
            <Sparkles size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: COLORS.muted, fontWeight: '600', textTransform: 'uppercase' }}>Direction DSS</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: COLORS.navy }}>
              {authorities.filter(a => a.authority_type === 'DSS').length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: `1px solid ${COLORS.border}`, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        {/* Table Search Header */}
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.bgLight }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
            <Search size={18} color={COLORS.muted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, position, type, email..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 38px',
                borderRadius: '8px',
                border: `1px solid ${COLORS.border}`,
                fontSize: '0.9rem',
                outline: 'none',
                backgroundColor: 'white'
              }}
            />
          </div>
          <div style={{ fontSize: '0.85rem', color: COLORS.muted }}>
            Affichage de <strong>{filteredAuthorities.length}</strong> autorité(s)
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem', color: COLORS.muted, gap: '12px' }}>
            <RefreshCw size={20} className="animate-spin" color={COLORS.teal} />
            <span>Chargement des données...</span>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: `1px solid ${COLORS.border}` }}>
              <tr>
                <th style={{ padding: '14px 24px', color: COLORS.navy, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Titulaire (Nom & Prénom)</th>
                <th style={{ padding: '14px 24px', color: COLORS.navy, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Poste / Position</th>
                <th style={{ padding: '14px 24px', color: COLORS.navy, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Compte Utilisateur (Email)</th>
                <th style={{ padding: '14px 24px', color: COLORS.navy, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type d'Autorité</th>
                <th style={{ padding: '14px 24px', color: COLORS.navy, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAuthorities.map((auth, idx) => {
                const presetObj = PRESET_AUTHORITY_TYPES.find(t => t.code === auth.authority_type);
                const displayLabel = presetObj ? `${presetObj.label} (${presetObj.short})` : auth.authority_type;
                const userEmail = auth.users?.email || "Compte lié";
                const fullName = (auth.users?.first_name || auth.users?.last_name) 
                  ? `${auth.users?.first_name || ''} ${auth.users?.last_name || ''}`.trim() 
                  : "Titulaire Sanitaire";

                return (
                  <tr key={auth.id} style={{ borderBottom: idx !== filteredAuthorities.length - 1 ? `1px solid ${COLORS.border}` : 'none' }}>
                    <td style={{ padding: '16px 24px', color: COLORS.text, fontWeight: '600' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
                          <User size={18} />
                        </div>
                        <div>
                          <div style={{ color: COLORS.navy, fontSize: '0.95rem', fontWeight: '700' }}>{fullName}</div>
                          <div style={{ fontSize: '0.75rem', color: COLORS.muted, marginTop: '2px' }}>Rôle: HEALTH_AUTHORITY</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', color: COLORS.navy, fontSize: '0.9rem', fontWeight: '600' }}>
                      {auth.position}
                    </td>
                    <td style={{ padding: '16px 24px', color: COLORS.muted, fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mail size={16} color={COLORS.muted} />
                        <span>{userEmail}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ 
                        backgroundColor: auth.authority_type === 'DSP' ? '#EFF6FF' : auth.authority_type === 'DSS' ? '#F0FDF4' : auth.authority_type === 'CLINIQUE_PRIVEE' ? '#FAF5FF' : '#F3F4F6', 
                        color: auth.authority_type === 'DSP' ? '#1D4ED8' : auth.authority_type === 'DSS' ? '#15803D' : auth.authority_type === 'CLINIQUE_PRIVEE' ? '#7E22CE' : '#374151', 
                        border: `1px solid ${auth.authority_type === 'DSP' ? '#BFDBFE' : auth.authority_type === 'DSS' ? '#BBF7D0' : auth.authority_type === 'CLINIQUE_PRIVEE' ? '#E9D5FF' : '#E5E7EB'}`,
                        padding: '0.35rem 0.85rem', 
                        borderRadius: '999px', 
                        fontSize: '0.85rem', 
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
                        {displayLabel}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDelete(auth.id, auth.user_id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                          padding: '8px',
                          borderRadius: '8px',
                          transition: 'all 0.2s',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredAuthorities.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem 2rem', color: COLORS.muted }}>
                    Aucune autorité de santé ne correspond à votre recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* STEP-BY-STEP ONBOARDING MODAL */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(6, 44, 84, 0.6)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
          padding: '24px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '640px',
            maxHeight: '85vh',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: `1px solid ${COLORS.border}`,
            overflow: 'hidden',
            animation: 'fadeIn 0.25s ease-out',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 28px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', flexShrink: 0 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} color={COLORS.teal} />
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: COLORS.navy }}>
                    Nouvelle Autorité de Santé
                  </h3>
                </div>
                <span style={{ fontSize: '0.85rem', color: COLORS.muted, marginTop: '2px', display: 'block' }}>
                  Parcours d'inscription et de configuration du compte
                </span>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted, padding: '4px', borderRadius: '50%' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Stepper Navigation Progress Bar */}
            {step <= 4 && (
              <div style={{ borderBottom: `1px solid ${COLORS.border}`, padding: '14px 28px', backgroundColor: 'white', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                  {[
                    { number: 1, title: "Compte", icon: Mail },
                    { number: 2, title: "Infos Personnelles", icon: User },
                    { number: 3, title: "Infos Pro", icon: Briefcase },
                    { number: 4, title: "Récapitulatif", icon: CheckCircle2 }
                  ].map((s) => {
                    const Icon = s.icon;
                    const isActive = step === s.number;
                    const isPassed = step > s.number;

                    return (
                      <div key={s.number} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 2 }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          backgroundColor: isPassed ? COLORS.teal : isActive ? COLORS.navy : '#f1f5f9',
                          color: isPassed || isActive ? 'white' : COLORS.muted,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '0.85rem',
                          boxShadow: isActive ? '0 4px 10px rgba(6,44,84,0.25)' : 'none',
                          transition: 'all 0.3s'
                        }}>
                          {isPassed ? <Check size={16} /> : <Icon size={16} />}
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: isActive ? '700' : '500', color: isActive ? COLORS.navy : COLORS.muted }}>
                          {s.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Body with internal scrolling */}
            <form onSubmit={handleSubmit} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px', overflowY: 'auto', flex: 1 }}>
              {formError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #F87171', color: '#B91C1C', borderRadius: '10px', fontSize: '0.9rem', animation: 'fadeIn 0.2s' }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{formError}</span>
                </div>
              )}

              {/* STEP 1: ACCOUNT */}
              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'fadeIn 0.3s' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: COLORS.navy, marginBottom: '6px', fontWeight: '600' }}>
                      Adresse Email Professionnelle *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="exemple@sante.gov.dz"
                        style={{
                          width: '100%',
                          padding: '11px 14px 11px 40px',
                          borderRadius: '10px',
                          border: `1px solid ${COLORS.border}`,
                          fontSize: '0.95rem',
                          outline: 'none'
                        }}
                      />
                      <Mail size={18} color={COLORS.muted} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: COLORS.navy, marginBottom: '6px', fontWeight: '600' }}>
                      Mot de passe *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="••••••••"
                        style={{
                          width: '100%',
                          padding: '11px 40px 11px 40px',
                          borderRadius: '10px',
                          border: `1px solid ${COLORS.border}`,
                          fontSize: '0.95rem',
                          outline: 'none'
                        }}
                      />
                      <Lock size={18} color={COLORS.muted} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted }}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {form.password.length > 0 && (
                      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ height: '4px', width: '100%', backgroundColor: COLORS.border, borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: passwordStrength.width, backgroundColor: passwordStrength.color, transition: 'all 0.3s' }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: passwordStrength.color, fontWeight: '600', textAlign: 'right' }}>
                          Force du mot de passe : {passwordStrength.label}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: COLORS.navy, marginBottom: '6px', fontWeight: '600' }}>
                      Confirmer le mot de passe *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                        placeholder="••••••••"
                        style={{
                          width: '100%',
                          padding: '11px 40px 11px 40px',
                          borderRadius: '10px',
                          border: `1px solid ${form.confirmPassword && form.password !== form.confirmPassword ? '#F87171' : COLORS.border}`,
                          fontSize: '0.95rem',
                          outline: 'none'
                        }}
                      />
                      <Lock size={18} color={COLORS.muted} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted }}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {form.confirmPassword && form.password === form.confirmPassword && (
                      <span style={{ color: '#166534', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                        ✓ Les mots de passe correspondent.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: PERSONAL INFO */}
              {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'fadeIn 0.3s' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: COLORS.navy, marginBottom: '6px', fontWeight: '600' }}>
                      Prénom *
                    </label>
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      placeholder="Ex: Mohamed"
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        border: `1px solid ${COLORS.border}`,
                        fontSize: '0.95rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: COLORS.navy, marginBottom: '6px', fontWeight: '600' }}>
                      Nom de famille *
                    </label>
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      placeholder="Ex: Benali"
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        border: `1px solid ${COLORS.border}`,
                        fontSize: '0.95rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: PROFESSIONAL INFO */}
              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'fadeIn 0.3s' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: COLORS.navy, marginBottom: '6px', fontWeight: '600' }}>
                      Intitulé du Poste / Position *
                    </label>
                    <input
                      type="text"
                      value={form.position}
                      onChange={(e) => setForm({ ...form, position: e.target.value })}
                      placeholder="Ex: Directeur Régional de la Santé Publique"
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        border: `1px solid ${COLORS.border}`,
                        fontSize: '0.95rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: COLORS.navy, marginBottom: '8px', fontWeight: '600' }}>
                      Type d'Autorité de Santé *
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {PRESET_AUTHORITY_TYPES.map((item) => (
                        <div
                          key={item.code}
                          onClick={() => setForm({ ...form, authorityType: item.code })}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '12px',
                            border: `2px solid ${form.authorityType === item.code ? COLORS.teal : COLORS.border}`,
                            backgroundColor: form.authorityType === item.code ? COLORS.lightTeal : 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '0.95rem' }}>
                              {item.label} ({item.short})
                            </div>
                            <div style={{ fontSize: '0.8rem', color: COLORS.muted, marginTop: '2px' }}>
                              {item.description}
                            </div>
                          </div>
                          {form.authorityType === item.code && (
                            <CheckCircle2 size={20} color={COLORS.teal} />
                          )}
                        </div>
                      ))}
                    </div>

                    {form.authorityType === 'OTHER' && (
                      <div style={{ marginTop: '12px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: COLORS.navy, marginBottom: '6px', fontWeight: '600' }}>
                          Précisez le type personnalisé *
                        </label>
                        <input
                          type="text"
                          value={form.customAuthorityType}
                          onChange={(e) => setForm({ ...form, customAuthorityType: e.target.value })}
                          placeholder="Ex: Inspecteur Sanitaire Général"
                          style={{
                            width: '100%',
                            padding: '11px 14px',
                            borderRadius: '10px',
                            border: `1px solid ${COLORS.border}`,
                            fontSize: '0.95rem',
                            outline: 'none'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4: REVIEW */}
              {step === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s' }}>
                  <div style={{ backgroundColor: COLORS.bgLight, borderRadius: '14px', border: `1px solid ${COLORS.border}`, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '12px' }}>
                      <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mail size={18} color={COLORS.teal} /> Compte Utilisateur
                      </div>
                      <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: COLORS.teal, fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Edit3 size={14} /> Modifier
                      </button>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: COLORS.muted }}>Email</div>
                      <div style={{ fontWeight: '600', color: COLORS.navy, fontSize: '0.95rem' }}>{form.email}</div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '12px', paddingTop: '8px' }}>
                      <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={18} color={COLORS.teal} /> Identité Personnelle
                      </div>
                      <button type="button" onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: COLORS.teal, fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Edit3 size={14} /> Modifier
                      </button>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: COLORS.muted }}>Nom & Prénom</div>
                      <div style={{ fontWeight: '600', color: COLORS.navy, fontSize: '0.95rem' }}>{form.firstName} {form.lastName}</div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '12px', paddingTop: '8px' }}>
                      <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Briefcase size={18} color={COLORS.teal} /> Poste & Rôle Sanitaire
                      </div>
                      <button type="button" onClick={() => setStep(3)} style={{ background: 'none', border: 'none', color: COLORS.teal, fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Edit3 size={14} /> Modifier
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: COLORS.muted }}>Poste / Position</div>
                        <div style={{ fontWeight: '600', color: COLORS.navy, fontSize: '0.95rem' }}>{form.position}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: COLORS.muted }}>Type d'Autorité</div>
                        <div style={{ fontWeight: '600', color: COLORS.teal, fontSize: '0.95rem' }}>
                          {form.authorityType === 'OTHER' ? form.customAuthorityType : form.authorityType}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: SUCCESS STATE */}
              {step === 5 && (
                <div style={{ textAlign: 'center', padding: '20px 0', animation: 'fadeIn 0.4s ease-out' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: COLORS.lightTeal, color: COLORS.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <CheckCircle2 size={40} />
                  </div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: COLORS.navy, marginBottom: '8px' }}>
                    Autorité de Santé Créée !
                  </h3>
                  <p style={{ color: COLORS.muted, fontSize: '0.95rem', marginBottom: '24px' }}>
                    Le compte et le profil de l'autorité de santé ont été configurés avec succès sur la plateforme.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      backgroundColor: COLORS.teal,
                      color: 'white',
                      border: 'none',
                      padding: '12px 32px',
                      borderRadius: '10px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(15,162,155,0.3)'
                    }}
                  >
                    Fermer & Terminer
                  </button>
                </div>
              )}

              {/* Modal Footer Buttons */}
              {step <= 4 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${COLORS.border}`, paddingTop: '16px', marginTop: 'auto', flexShrink: 0, backgroundColor: 'white' }}>
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      style={{
                        backgroundColor: 'transparent',
                        color: COLORS.navy,
                        border: `1px solid ${COLORS.border}`,
                        padding: '10px 20px',
                        borderRadius: '10px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <ChevronLeft size={16} /> Précédent
                    </button>
                  ) : <div />}

                  {step < 4 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      style={{
                        backgroundColor: COLORS.navy,
                        color: 'white',
                        border: 'none',
                        padding: '10px 24px',
                        borderRadius: '10px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(6,44,84,0.2)'
                      }}
                    >
                      Suivant <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        backgroundColor: COLORS.teal,
                        color: 'white',
                        border: 'none',
                        padding: '10px 28px',
                        borderRadius: '10px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(15,162,155,0.3)'
                      }}
                    >
                      {submitting ? "Création en cours..." : "Créer l'Autorité de Santé"} <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
