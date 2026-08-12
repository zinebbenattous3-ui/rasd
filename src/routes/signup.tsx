import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, type FormEvent } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MedicalNetworkCanvas, type NetworkState } from "@/components/medical/MedicalNetworkCanvas";
import { validateNIN } from "dz-nin-checker";
import {
  Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck,
  Stethoscope, User, Search, Building2, Lock, ChevronRight, Edit2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { hashPassword } from "@/lib/auth-hash";
import { TurnstileWidget, type TurnstileWidgetRef } from "@/components/TurnstileWidget";
import { verifyTurnstileToken } from "@/lib/turnstileServer";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Créer un compte — Rased Network" },
      {
        name: "description",
        content: "Rejoignez le réseau national de surveillance et de veille épidémiologique.",
      },
    ],
  }),
  component: SignupPage,
});

type RoleType = 'DOCTOR' | 'PATIENT' | 'INSPECTOR' | 'HEALTH_AUTHORITY';

interface FormErrors {
  email?: string;
  password?: string;
  confirm_password?: string;
  first_name?: string;
  last_name?: string;
  nin?: string;
  specialty?: string;
  facility?: string;
  phone?: string;
  function_title?: string;
  wilaya?: string;
  authority_position?: string;
  form?: string;
}

const SPECIALTIES = [
  "Médecine interne", "Cardiologie", "Pneumologie", "Gastro-entérologie", "Néphrologie",
  "Endocrinologie et maladies métaboliques", "Neurologie", "Rhumatologie", "Hématologie",
  "Oncologie médicale", "Maladies infectieuses", "Dermatologie", "Pédiatrie", "Psychiatrie",
  "Gériatrie", "Médecine physique et réadaptation", "Médecine nucléaire", "Médecine légale",
  "Médecine du travail", "Médecine d’urgence", "Médecine générale / médecine de famille",
  "Médecine de réanimation", "Chirurgie générale", "Chirurgie viscérale et digestive",
  "Chirurgie thoracique", "Chirurgie cardiovasculaire", "Chirurgie vasculaire", "Neurochirurgie",
  "Chirurgie orthopédique et traumatologique", "Urologie", "Chirurgie pédiatrique",
  "Chirurgie plastique, reconstructrice et esthétique", "Chirurgie maxillo-faciale",
  "Chirurgie gynécologique", "Ophtalmologie", "Oto-rhino-laryngologie (ORL)", "Gynécologie-obstétrique",
  "Stomatologie / chirurgie orale", "Radiologie", "Imagerie médicale",
  "Anatomie et cytologie pathologiques", "Biologie médicale", "Biochimie", "Microbiologie",
  "Immunologie", "Hématologie biologique", "Génétique médicale", "Parasitologie",
  "Anesthésiologie", "Réanimation médicale", "Réanimation chirurgicale"
];

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const normalizeString = (str: string) =>
  str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "#e2e8f0" };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return { score: 25, label: "Faible", color: "#ef4444" };
  if (score === 3) return { score: 60, label: "Moyen", color: "#f59e0b" };
  if (score === 4) return { score: 85, label: "Fort", color: "#0fa29b" };
  return { score: 100, label: "Excellent", color: "#10b981" };
}

function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [networkState, setNetworkState] = useState<NetworkState>('initial');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeSecurity, setAgreeSecurity] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirm_password: "",
    first_name: "",
    last_name: "",
    nin: "",
    role: "DOCTOR" as RoleType,
    // Doctor specific
    specialty: "",
    facility: "",
    facility_id: "",
    phone: "",
    // Patient specific
    birth_date: "",
    gender: "M",
    blood_type: "A+",
    // Inspector & Health Authority specific
    function_title: "",
    wilaya: "",
    authority_position: ""
  });

  const [ninDetails, setNinDetails] = useState<null | { nationality: string; sex: string; year: string }>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSpecialtyDropdown, setShowSpecialtyDropdown] = useState(false);
  const [showFacilityDropdown, setShowFacilityDropdown] = useState(false);
  const [facilitiesList, setFacilitiesList] = useState<any[]>([]);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileWidgetRef = useRef<TurnstileWidgetRef>(null);

  useEffect(() => {
    async function loadFacilities() {
      const { data } = await supabase.from('facilities').select('id, name, wilaya, facility_type');
      if (data) setFacilitiesList(data);
    }
    loadFacilities();
  }, []);

  const filteredSpecialties = SPECIALTIES.filter(s =>
    normalizeString(s).includes(normalizeString(form.specialty))
  );

  const filteredFacilities = facilitiesList.filter(f =>
    normalizeString(f.name).includes(normalizeString(form.facility)) ||
    (f.wilaya && normalizeString(f.wilaya).includes(normalizeString(form.facility)))
  );

  function update(key: keyof typeof form, value: any) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors((e) => {
        const copy = { ...e };
        delete copy[key as keyof FormErrors];
        return copy;
      });
    }

    if (key === 'email' && typeof value === 'string' && value.includes('@')) {
      setNetworkState('email-entered');
    }
    if (key === 'role') {
      setNetworkState('role-selected');
    }
    if (key === 'nin') {
      setNinDetails(null);
    }
  }

  const pwdStrength = getPasswordStrength(form.password);

  function validateStep(currentStep: number): boolean {
    const nextErrors: FormErrors = {};

    if (currentStep === 1) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
        nextErrors.email = "Veuillez saisir une adresse e-mail valide.";
      }
      if (form.password.length < 8) {
        nextErrors.password = "Le mot de passe doit contenir au moins 8 caractères.";
      }
      if (form.password !== form.confirm_password) {
        nextErrors.confirm_password = "Les mots de passe ne correspondent pas.";
      }
    } else if (currentStep === 2) {
      if (!form.first_name.trim()) nextErrors.first_name = "Prénom requis.";
      if (!form.last_name.trim()) nextErrors.last_name = "Nom requis.";

      if (form.role === 'DOCTOR' || form.role === 'PATIENT') {
        if (!form.nin.trim()) {
          nextErrors.nin = "NIN requis.";
        } else if (!/^\d{8,18}$/.test(form.nin)) {
          nextErrors.nin = "Le NIN doit contenir entre 8 et 18 chiffres.";
        } else {
          const ninResult = validateNIN(form.nin);
          if (!ninResult.isValid) {
            nextErrors.nin = ninResult.error || "NIN invalide.";
          } else {
            setNinDetails({
              nationality: ninResult.nationality,
              sex: ninResult.sex,
              year: ninResult.year,
            });
          }
        }
      }
    } else if (currentStep === 3) {
      if (form.role === 'DOCTOR') {
        if (!form.specialty.trim()) nextErrors.specialty = "Spécialité requise.";
        if (!form.phone.trim()) nextErrors.phone = "Numéro de téléphone requis.";
        else if (!/^\d{10}$/.test(form.phone.trim())) nextErrors.phone = "Le téléphone doit comporter 10 chiffres (ex: 0550123456).";
      } else if (form.role === 'INSPECTOR') {
        if (!form.function_title.trim()) nextErrors.function_title = "Fonction requise.";
        if (!form.wilaya.trim()) nextErrors.wilaya = "Wilaya requise.";
      } else if (form.role === 'HEALTH_AUTHORITY') {
        if (!form.authority_position.trim()) nextErrors.authority_position = "Position requise.";
      }
    } else if (currentStep === 4) {
      if (!agreeTerms) {
        nextErrors.form = "Veuillez accepter les conditions d'utilisation et la politique de confidentialité pour continuer.";
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setNetworkState('error');
      return false;
    }
    setNetworkState('validated');
    return true;
  }

  function nextStep() {
    if (validateStep(step)) {
      setStep((s) => s + 1);
    }
  }

  function prevStep() {
    setStep((s) => s - 1);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validateStep(step)) return;

    if (!turnstileToken) {
      setErrors({ form: "Veuillez valider le contrôle anti-robot Turnstile pour créer votre compte." });
      setNetworkState('error');
      return;
    }

    setLoading(true);

    // 1. Mandatory server-side Turnstile token verification
    try {
      const turnstileRes = await verifyTurnstileToken({ data: { token: turnstileToken } });
      if (!turnstileRes.success) {
        setLoading(false);
        setNetworkState('error');
        setErrors({ form: turnstileRes.error || "La vérification anti-robot a échoué. Veuillez réessayer." });
        setTurnstileToken("");
        turnstileWidgetRef.current?.reset();
        return; // REJECT: Do NOT execute registration RPC or create user in DB
      }
    } catch (turnstileErr: any) {
      setLoading(false);
      setNetworkState('error');
      setErrors({ form: turnstileErr.message || "Erreur lors de la vérification Turnstile." });
      setTurnstileToken("");
      turnstileWidgetRef.current?.reset();
      return; // REJECT: Do NOT execute registration RPC or create user in DB
    }

    setNetworkState('done');

    try {
      if (form.role === 'DOCTOR') {
        // 1. Try RPC registration procedure for Doctors
        const { data, error } = await supabase.rpc('register_doctor', {
          email_input: form.email.trim(),
          password_input: form.password,
          nin_input: form.nin.trim(),
          first_name_input: form.first_name.trim(),
          last_name_input: form.last_name.trim(),
          specialty_input: form.specialty.trim(),
          phone_input: form.phone.trim()
        });

        if (!error && data && data.success !== false) {
          if (form.facility_id) {
            await supabase
              .from('doctors')
              .update({ facility_id: form.facility_id, status: 'PENDING' })
              .eq('nin', form.nin.trim());
          }
          setLoading(false);
          setDone(true);
          return;
        }
      }

      // 2. Direct table insertion (users table as single source of identity)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([{
          email: form.email.trim().toLowerCase(),
          password_hash: hashPassword(form.password),
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          role: form.role,
          is_active: true
        }])
        .select('id')
        .single();

      if (userError || !userData) {
        setLoading(false);
        setNetworkState('error');
        if (userError?.code === '23505') {
          setErrors({ form: "Cet email est déjà utilisé par un autre compte." });
        } else {
          setErrors({ form: userError?.message || "Erreur lors de la création du compte." });
        }
        return;
      }

      // Role specific table creation
      if (form.role === 'DOCTOR') {
        const { error: doctorError } = await supabase.from('doctors').insert([{
          user_id: userData.id,
          nin: form.nin.trim(),
          specialty: form.specialty.trim(),
          facility_id: form.facility_id || null,
          phone: form.phone.trim(),
          status: 'PENDING'
        }]);

        if (doctorError) {
          await supabase.from('users').delete().eq('id', userData.id);
          setLoading(false);
          setNetworkState('error');
          setErrors({ form: doctorError.message || "Erreur enregistrement profil médecin." });
          return;
        }
      } else if (form.role === 'PATIENT') {
        await supabase.from('patients').insert([{
          user_id: userData.id,
          nin: form.nin.trim(),
          birth_date: form.birth_date || null,
          gender: form.gender,
          blood_type: form.blood_type
        }]);
      }

      setLoading(false);
      setDone(true);
    } catch (err: any) {
      setLoading(false);
      setNetworkState('error');
      setErrors({ form: err.message || "Erreur de connexion." });
    }
  }

  return (
    <div className="site" style={{ minHeight: "100vh", backgroundColor: "#062C54" }}>
      <Navbar />

      <main style={{ display: "flex", minHeight: "calc(100vh - 140px)", width: "100%", backgroundColor: "#ffffff" }}>
        {/* Left Side — "JOIN THE HEALTH NETWORK" Canvas Visual */}
        <div
          className="hidden md:flex"
          style={{
            flex: "1 1 50%",
            backgroundColor: "#062C54",
            color: "white",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "2.5rem",
            position: "relative",
            overflow: "hidden"
          }}
        >
          {/* Header Branding */}
          <div style={{ position: "relative", zIndex: 10 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "rgba(15, 162, 155, 0.15)", border: "1px solid rgba(15, 162, 155, 0.3)", borderRadius: "999px", padding: "4px 14px", fontSize: "0.75rem", color: "#38BDF8", fontWeight: "700", letterSpacing: "0.05em", marginBottom: "1rem" }}>
              <ShieldCheck size={14} color="#0fa29b" />
              <span>RÉSEAU NATIONAL DE SANTE</span>
            </div>
            <h2 style={{ fontSize: "1.85rem", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.01em", lineHeight: "1.2" }}>
              Rejoignez l'Écosystème National de Veille Épidémiologique
            </h2>
            <p style={{ color: "#94A3B8", fontSize: "0.95rem", lineHeight: "1.6", marginTop: "0.5rem", maxWidth: "440px" }}>
              Raccordez votre établissement ou votre profil au réseau RASED pour contribuer à la surveillance sanitaire en temps réel.
            </p>
          </div>

          {/* Interactive Living Network Canvas */}
          <div style={{ flex: 1, minHeight: "340px", position: "relative", margin: "1rem 0" }}>
            <MedicalNetworkCanvas state={networkState} selectedRole={form.role} />
          </div>

          {/* Footer Technical Note */}
          <div style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem", color: "#64748B", borderTop: "1px solid rgba(255, 255, 255, 0.1)", paddingTop: "1rem" }}>
            <span>ALGERIA HEALTH INTELLIGENCE NETWORK</span>
            <span>CONNEXION CHIFFRÉE</span>
          </div>
        </div>

        {/* Right Side — Multi-Step Signup Form */}
        <div
          style={{
            flex: "1 1 50%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "2.5rem 1.5rem",
            backgroundColor: "#ffffff"
          }}
        >
          <div style={{ width: "100%", maxWidth: "460px" }}>
            {done ? (
              /* Success Screen */
              <div style={{ textAlign: "center", animation: "fadeIn 0.4s ease-out" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "#e6f5f4", color: "#0fa29b", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", marginBottom: "1.25rem", boxShadow: "0 0 20px rgba(15, 162, 155, 0.2)" }}>
                  ✓
                </div>
                <h2 style={{ fontSize: "1.75rem", color: "#062C54", fontWeight: "800", marginBottom: "0.75rem" }}>
                  {form.role === 'DOCTOR' ? 'Demande enregistrée !' : 'Compte créé avec succès !'}
                </h2>
                <p style={{ color: "#4a5568", lineHeight: "1.6", fontSize: "0.95rem", marginBottom: "2rem" }}>
                  {form.role === 'DOCTOR' ? (
                    <>
                      Votre compte médecin a été créé avec le statut <strong>En attente (PENDING)</strong>. Votre établissement validera votre raccordement sous peu. Un e-mail d'information vous a été transmis sur <strong>{form.email}</strong>.
                    </>
                  ) : (
                    <>
                      Bienvenue sur le réseau RASED. Votre compte a été initialisé. Vous pouvez désormais accéder à votre espace sécurisé.
                    </>
                  )}
                </p>
                <Link
                  to="/login"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    backgroundColor: "#062C54",
                    color: "white",
                    padding: "0.85rem 2rem",
                    borderRadius: "10px",
                    textDecoration: "none",
                    fontWeight: "700",
                    boxShadow: "0 4px 14px rgba(6, 44, 84, 0.2)"
                  }}
                >
                  <span>Accéder à la connexion</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <>
                {/* Form Heading & Progress Bar */}
                <div style={{ marginBottom: "2rem" }}>
                  <h1 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#062C54", letterSpacing: "-0.01em" }}>
                    Inscription Médecin Praticien
                  </h1>
                  <p style={{ color: "#718096", fontSize: "0.92rem", marginTop: "0.25rem" }}>
                    Rejoignez le réseau national de surveillance sanitaire RASED. Votre compte sera soumis à vérification par votre établissement.
                  </p>

                  {/* Modern 4-Step Progress Indicator */}
                  <div style={{ marginTop: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.6rem", fontSize: "0.8rem", fontWeight: "700" }}>
                      <span style={{ color: step >= 1 ? "#0fa29b" : "#a0aec0" }}>① Compte</span>
                      <span style={{ color: step >= 2 ? "#0fa29b" : "#a0aec0" }}>② Identité</span>
                      <span style={{ color: step >= 3 ? "#0fa29b" : "#a0aec0" }}>③ Profil</span>
                      <span style={{ color: step >= 4 ? "#0fa29b" : "#a0aec0" }}>④ Confirmation</span>
                    </div>

                    <div style={{ display: "flex", gap: "6px" }}>
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            height: "5px",
                            borderRadius: "999px",
                            backgroundColor: i <= step ? "#0fa29b" : "#edf2f7",
                            transition: "all 0.3s ease"
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {errors.form && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", padding: "0.85rem", backgroundColor: "#fef2f2", border: "1px solid #f87171", color: "#991b1b", borderRadius: "10px", fontSize: "0.88rem", marginBottom: "1.5rem" }}>
                    <AlertCircle size={18} style={{ marginTop: "2px", flexShrink: 0 }} />
                    <span>{errors.form}</span>
                  </div>
                )}

                <form onSubmit={step === 4 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }} noValidate>
                  {/* STEP 1: COMPTE */}
                  {step === 1 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", animation: "fadeIn 0.3s ease-out" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.88rem", fontWeight: "600", color: "#2d3748", marginBottom: "0.4rem" }}>
                          Adresse e-mail professionnelle *
                        </label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => update("email", e.target.value)}
                          placeholder="exemple@sante.gov.dz"
                          style={{
                            width: "100%",
                            padding: "0.75rem 1rem",
                            borderRadius: "10px",
                            border: errors.email ? "1.5px solid #ef4444" : "1.5px solid #cbd5e1",
                            fontSize: "0.95rem",
                            outline: "none",
                            transition: "all 0.2s"
                          }}
                        />
                        {errors.email && <span style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "0.3rem", display: "block" }}>{errors.email}</span>}
                        {form.email && !errors.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email) && (
                          <span style={{ color: "#10b981", fontSize: "0.8rem", marginTop: "0.3rem", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <CheckCircle2 size={13} /> Adresse e-mail valide
                          </span>
                        )}
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.88rem", fontWeight: "600", color: "#2d3748", marginBottom: "0.4rem" }}>
                          Mot de passe *
                        </label>
                        <div style={{ position: "relative" }}>
                          <input
                            type={showPassword ? "text" : "password"}
                            value={form.password}
                            onChange={(e) => update("password", e.target.value)}
                            placeholder="••••••••"
                            style={{
                              width: "100%",
                              padding: "0.75rem 2.75rem 0.75rem 1rem",
                              borderRadius: "10px",
                              border: errors.password ? "1.5px solid #ef4444" : "1.5px solid #cbd5e1",
                              fontSize: "0.95rem",
                              outline: "none"
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#718096", cursor: "pointer" }}
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>

                        {/* Password Strength Indicator */}
                        {form.password && (
                          <div style={{ marginTop: "0.5rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "3px", color: "#718096" }}>
                              <span>Sécurité du mot de passe</span>
                              <span style={{ fontWeight: "700", color: pwdStrength.color }}>{pwdStrength.label}</span>
                            </div>
                            <div style={{ height: "4px", width: "100%", backgroundColor: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
                              <div style={{ width: `${pwdStrength.score}%`, height: "100%", backgroundColor: pwdStrength.color, transition: "width 0.3s ease" }} />
                            </div>
                          </div>
                        )}
                        {errors.password && <span style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "0.3rem", display: "block" }}>{errors.password}</span>}
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.88rem", fontWeight: "600", color: "#2d3748", marginBottom: "0.4rem" }}>
                          Confirmer le mot de passe *
                        </label>
                        <input
                          type="password"
                          value={form.confirm_password}
                          onChange={(e) => update("confirm_password", e.target.value)}
                          placeholder="••••••••"
                          style={{
                            width: "100%",
                            padding: "0.75rem 1rem",
                            borderRadius: "10px",
                            border: errors.confirm_password ? "1.5px solid #ef4444" : "1.5px solid #cbd5e1",
                            fontSize: "0.95rem",
                            outline: "none"
                          }}
                        />
                        {errors.confirm_password && <span style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "0.3rem", display: "block" }}>{errors.confirm_password}</span>}
                        {form.confirm_password && form.password === form.confirm_password && (
                          <span style={{ color: "#10b981", fontSize: "0.8rem", marginTop: "0.3rem", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <CheckCircle2 size={13} /> Les mots de passe correspondent ✓
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={nextStep}
                        style={{
                          marginTop: "1rem",
                          width: "100%",
                          backgroundColor: "#062C54",
                          color: "white",
                          padding: "0.85rem",
                          borderRadius: "10px",
                          fontWeight: "700",
                          fontSize: "0.95rem",
                          border: "none",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          boxShadow: "0 4px 14px rgba(6, 44, 84, 0.2)"
                        }}
                      >
                        <span>Continuer vers Identité</span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  )}

                  {/* STEP 2: IDENTITÉ */}
                  {step === 2 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", animation: "fadeIn 0.3s ease-out" }}>
                      <div style={{ display: "flex", gap: "1rem" }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", fontSize: "0.88rem", fontWeight: "600", color: "#2d3748", marginBottom: "0.4rem" }}>Prénom *</label>
                          <input
                            type="text"
                            value={form.first_name}
                            onChange={(e) => update("first_name", e.target.value)}
                            placeholder="Zineb"
                            style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "10px", border: errors.first_name ? "1.5px solid #ef4444" : "1.5px solid #cbd5e1", fontSize: "0.95rem" }}
                          />
                          {errors.first_name && <span style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "0.3rem", display: "block" }}>{errors.first_name}</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", fontSize: "0.88rem", fontWeight: "600", color: "#2d3748", marginBottom: "0.4rem" }}>Nom *</label>
                          <input
                            type="text"
                            value={form.last_name}
                            onChange={(e) => update("last_name", e.target.value)}
                            placeholder="Ben Attous"
                            style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "10px", border: errors.last_name ? "1.5px solid #ef4444" : "1.5px solid #cbd5e1", fontSize: "0.95rem" }}
                          />
                          {errors.last_name && <span style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "0.3rem", display: "block" }}>{errors.last_name}</span>}
                        </div>
                      </div>

                      {(form.role === 'DOCTOR' || form.role === 'PATIENT') && (
                        <div>
                          <label style={{ display: "block", fontSize: "0.88rem", fontWeight: "600", color: "#2d3748", marginBottom: "0.4rem" }}>
                            Numéro d'Identification Nationale (NIN) *
                          </label>
                          <input
                            type="text"
                            value={form.nin}
                            onChange={(e) => update("nin", e.target.value.replace(/\D/g, ""))}
                            placeholder="1000400000000000XX"
                            maxLength={18}
                            style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "10px", border: errors.nin ? "1.5px solid #ef4444" : "1.5px solid #cbd5e1", fontSize: "0.95rem" }}
                          />
                          {errors.nin && <span style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "0.3rem", display: "block" }}>{errors.nin}</span>}

                          {ninDetails && (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "0.75rem", padding: "0.75rem 1rem", backgroundColor: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", fontSize: "0.85rem", color: "#166534" }}>
                              <CheckCircle2 size={16} color="#22c55e" />
                              <span>NIN Valide — <strong>{ninDetails.nationality}</strong>, {ninDetails.sex}, né(e) en <strong>{ninDetails.year}</strong></span>
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                        <button type="button" onClick={prevStep} style={{ flex: 1, padding: "0.85rem", borderRadius: "10px", border: "1.5px solid #cbd5e1", backgroundColor: "transparent", color: "#062C54", fontWeight: "600", cursor: "pointer" }}>
                          Retour
                        </button>
                        <button type="button" onClick={nextStep} style={{ flex: 2, padding: "0.85rem", borderRadius: "10px", border: "none", backgroundColor: "#062C54", color: "white", fontWeight: "700", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                          <span>Continuer vers Profil</span>
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: PROFIL MÉDICAL */}
                  {step === 3 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", animation: "fadeIn 0.3s ease-out" }}>
                      <div style={{ backgroundColor: "#f0fdfa", border: "1px solid rgba(15, 162, 155, 0.3)", borderRadius: "10px", padding: "0.85rem 1rem", display: "flex", alignItems: "center", gap: "10px" }}>
                        <Stethoscope size={20} color="#0fa29b" />
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#062C54" }}>Profil Médecin Praticien</div>
                          <div style={{ fontSize: "0.75rem", color: "#4a5568" }}>Rattachement médical et déclarations épidémiologiques</div>
                        </div>
                      </div>

                      {/* Doctor Specific Fields */}
                      <div style={{ position: "relative" }}>
                        <label style={{ display: "block", fontSize: "0.88rem", fontWeight: "600", color: "#2d3748", marginBottom: "0.4rem" }}>Spécialité Médicale *</label>
                        <input
                          type="text"
                          value={form.specialty}
                          onChange={(e) => {
                            update("specialty", e.target.value);
                            setShowSpecialtyDropdown(true);
                          }}
                          placeholder="ex: Cardiologie, Médecine générale..."
                          style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "10px", border: errors.specialty ? "1.5px solid #ef4444" : "1.5px solid #cbd5e1", fontSize: "0.95rem" }}
                          onFocus={() => setShowSpecialtyDropdown(true)}
                          onBlur={() => setTimeout(() => setShowSpecialtyDropdown(false), 200)}
                        />
                        {showSpecialtyDropdown && filteredSpecialties.length > 0 && (
                          <ul style={{ position: "absolute", top: "100%", left: 0, right: 0, maxHeight: "180px", overflowY: "auto", backgroundColor: "white", border: "1px solid #cbd5e1", borderRadius: "10px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", listStyle: "none", padding: "4px 0", margin: "4px 0 0 0", zIndex: 30 }}>
                            {filteredSpecialties.map((spec) => (
                              <li key={spec} onClick={() => { update("specialty", spec); setShowSpecialtyDropdown(false); }} style={{ padding: "0.6rem 1rem", fontSize: "0.9rem", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}>
                                {spec}
                              </li>
                            ))}
                          </ul>
                        )}
                        {errors.specialty && <span style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "0.3rem", display: "block" }}>{errors.specialty}</span>}
                      </div>

                      <div style={{ position: "relative" }}>
                        <label style={{ display: "block", fontSize: "0.88rem", fontWeight: "600", color: "#2d3748", marginBottom: "0.4rem" }}>Établissement rattaché</label>
                        <input
                          type="text"
                          value={form.facility}
                          onChange={(e) => { update("facility", e.target.value); update("facility_id", ""); setShowFacilityDropdown(true); }}
                          placeholder="Rechercher CHU, EPH, Clinique..."
                          style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "10px", border: "1.5px solid #cbd5e1", fontSize: "0.95rem" }}
                          onFocus={() => setShowFacilityDropdown(true)}
                          onBlur={() => setTimeout(() => setShowFacilityDropdown(false), 200)}
                        />
                        {showFacilityDropdown && filteredFacilities.length > 0 && (
                          <ul style={{ position: "absolute", top: "100%", left: 0, right: 0, maxHeight: "180px", overflowY: "auto", backgroundColor: "white", border: "1px solid #cbd5e1", borderRadius: "10px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", listStyle: "none", padding: "4px 0", margin: "4px 0 0 0", zIndex: 30 }}>
                            {filteredFacilities.map((fac) => (
                              <li key={fac.id} onClick={() => { update("facility", fac.name); update("facility_id", fac.id); setShowFacilityDropdown(false); }} style={{ padding: "0.6rem 1rem", fontSize: "0.9rem", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}>
                                <div style={{ fontWeight: "700", color: "#062C54" }}>{fac.name}</div>
                                <div style={{ fontSize: "0.75rem", color: "#718096" }}>{fac.wilaya} • {fac.facility_type || 'Établissement'}</div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.88rem", fontWeight: "600", color: "#2d3748", marginBottom: "0.4rem" }}>Téléphone professionnel *</label>
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => update("phone", e.target.value.replace(/\D/g, ""))}
                          placeholder="0550123456"
                          maxLength={10}
                          style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "10px", border: errors.phone ? "1.5px solid #ef4444" : "1.5px solid #cbd5e1", fontSize: "0.95rem" }}
                        />
                        {errors.phone && <span style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "0.3rem", display: "block" }}>{errors.phone}</span>}
                      </div>

                      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                        <button type="button" onClick={prevStep} style={{ flex: 1, padding: "0.85rem", borderRadius: "10px", border: "1.5px solid #cbd5e1", backgroundColor: "transparent", color: "#062C54", fontWeight: "600", cursor: "pointer" }}>
                          Retour
                        </button>
                        <button type="button" onClick={nextStep} style={{ flex: 2, padding: "0.85rem", borderRadius: "10px", border: "none", backgroundColor: "#062C54", color: "white", fontWeight: "700", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                          <span>Revoir mes informations</span>
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: CONFIRMATION & REVIEW */}
                  {step === 4 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", animation: "fadeIn 0.3s ease-out" }}>
                      <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1.25rem" }}>
                        <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#062C54", marginBottom: "1rem" }}>
                          Vérifiez vos informations
                        </h3>

                        {/* Compte Summary */}
                        <div style={{ paddingBottom: "0.85rem", borderBottom: "1px solid #e2e8f0", marginBottom: "0.85rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#718096", textTransform: "uppercase" }}>Compte</div>
                            <div style={{ fontSize: "0.92rem", fontWeight: "600", color: "#2d3748", marginTop: "2px" }}>{form.email}</div>
                          </div>
                          <button type="button" onClick={() => setStep(1)} style={{ background: "none", border: "none", color: "#0fa29b", fontSize: "0.8rem", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Edit2 size={12} /> Modifier
                          </button>
                        </div>

                        {/* Identité Summary */}
                        <div style={{ paddingBottom: "0.85rem", borderBottom: "1px solid #e2e8f0", marginBottom: "0.85rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#718096", textTransform: "uppercase" }}>Identité</div>
                            <div style={{ fontSize: "0.92rem", fontWeight: "600", color: "#2d3748", marginTop: "2px" }}>{form.first_name} {form.last_name}</div>
                            {form.nin && <div style={{ fontSize: "0.78rem", color: "#718096" }}>NIN: {form.nin}</div>}
                          </div>
                          <button type="button" onClick={() => setStep(2)} style={{ background: "none", border: "none", color: "#0fa29b", fontSize: "0.8rem", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Edit2 size={12} /> Modifier
                          </button>
                        </div>

                        {/* Profil Summary */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#718096", textTransform: "uppercase" }}>Profil</div>
                            <div style={{ fontSize: "0.92rem", fontWeight: "600", color: "#0fa29b", marginTop: "2px" }}>
                              {form.role === 'DOCTOR' && `Médecin ${form.specialty ? `• ${form.specialty}` : ''}`}
                              {form.role === 'PATIENT' && `Patient • Groupe ${form.blood_type}`}
                              {form.role === 'INSPECTOR' && `Inspecteur • ${form.wilaya}`}
                              {form.role === 'HEALTH_AUTHORITY' && `Autorité Sanitaire • ${form.authority_position}`}
                            </div>
                            {form.facility && <div style={{ fontSize: "0.78rem", color: "#718096" }}>{form.facility}</div>}
                          </div>
                          <button type="button" onClick={() => setStep(3)} style={{ background: "none", border: "none", color: "#0fa29b", fontSize: "0.8rem", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Edit2 size={12} /> Modifier
                          </button>
                        </div>
                      </div>

                      {/* Documents & Legal Consent Section */}
                      <div style={{ padding: "1rem", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                        <div style={{ fontSize: "0.8rem", fontWeight: "700", color: "#062C54", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Documents & Consentement
                        </div>

                        <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "0.85rem", color: "#2d3748", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={agreeTerms}
                            onChange={(e) => {
                              setAgreeTerms(e.target.checked);
                              if (errors.form) {
                                setErrors((err) => {
                                  const copy = { ...err };
                                  delete copy.form;
                                  return copy;
                                });
                              }
                            }}
                            style={{ marginTop: "3px", width: "16px", height: "16px", accentColor: "#0fa29b" }}
                          />
                          <span>
                            J'accepte les{" "}
                            <Link to="/terms" target="_blank" style={{ color: "#0fa29b", fontWeight: "700", textDecoration: "underline" }}>
                              Conditions d'utilisation
                            </Link>{" "}
                            et la{" "}
                            <Link to="/privacy" target="_blank" style={{ color: "#0fa29b", fontWeight: "700", textDecoration: "underline" }}>
                              Politique de confidentialité
                            </Link>
                            . *
                          </span>
                        </label>

                        <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "0.85rem", color: "#2d3748", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={agreeSecurity}
                            onChange={(e) => setAgreeSecurity(e.target.checked)}
                            style={{ marginTop: "3px", width: "16px", height: "16px", accentColor: "#0fa29b" }}
                          />
                          <span>
                            J'ai pris connaissance des informations relatives à la{" "}
                            <Link to="/security" target="_blank" style={{ color: "#0fa29b", fontWeight: "700", textDecoration: "underline" }}>
                              Sécurité
                            </Link>{" "}
                            de la plateforme.
                          </span>
                        </label>
                      </div>

                      {/* Security Trust Note */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.78rem", color: "#64748b", padding: "0.25rem 0" }}>
                        <Lock size={14} color="#0fa29b" />
                        <span>Vos informations sont transmises via un canal chiffré et sécurisé.</span>
                      </div>

                      {/* Cloudflare Turnstile Anti-Robot Verification */}
                      <TurnstileWidget
                        ref={turnstileWidgetRef}
                        onVerify={(token) => {
                          setTurnstileToken(token);
                          if (errors.form) {
                            setErrors((err) => {
                              const copy = { ...err };
                              delete copy.form;
                              return copy;
                            });
                          }
                        }}
                        onExpire={() => setTurnstileToken("")}
                        onError={() => setTurnstileToken("")}
                      />

                      <div style={{ display: "flex", gap: "1rem" }}>
                        <button type="button" onClick={prevStep} style={{ flex: 1, padding: "0.85rem", borderRadius: "10px", border: "1.5px solid #cbd5e1", backgroundColor: "transparent", color: "#062C54", fontWeight: "600", cursor: "pointer" }}>
                          Retour
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          style={{
                            flex: 2,
                            padding: "0.85rem",
                            borderRadius: "10px",
                            border: "none",
                            backgroundColor: "#0fa29b",
                            color: "white",
                            fontWeight: "700",
                            fontSize: "0.95rem",
                            cursor: loading ? "wait" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            boxShadow: "0 4px 14px rgba(15, 162, 155, 0.3)",
                            opacity: loading ? 0.75 : 1
                          }}
                        >
                          <span>{loading ? "Création en cours..." : "Créer mon compte"}</span>
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </form>

                {/* Login Link */}
                <div style={{ marginTop: "2rem", textAlign: "center" }}>
                  <p style={{ color: "#718096", fontSize: "0.9rem" }}>
                    Vous avez déjà un compte ?{" "}
                    <Link to="/login" style={{ color: "#0fa29b", textDecoration: "none", fontWeight: "700" }}>
                      Se connecter →
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hidden { display: none !important; }
        @media (min-width: 768px) {
          .md\\:flex { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
