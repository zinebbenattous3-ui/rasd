import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { validateNIN } from "dz-nin-checker";
import authImage from "@/assets/auth-illustration.png";
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";


export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Créer un compte Médecin — Rased" },
      {
        name: "description",
        content: "Demandez un accès professionnel à Rased en tant que médecin déclarant.",
      },
    ],
  }),
  component: SignupPage,
});

type Errors = Partial<Record<"first_name" | "last_name" | "email" | "nin" | "password" | "specialty" | "phone" | "form", string>>;

// Colors based on the Rased logo
const COLORS = {
  navy: "#062C54",
  teal: "#0fa29b",
  lightTeal: "#e6f5f4",
  text: "#2d3748",
  muted: "#718096",
  border: "#e2e8f0"
};

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

const normalizeString = (str: string) => 
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function SignupPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    professional_email: "",
    password: "",
    first_name: "",
    last_name: "",
    nin: "",
    specialty: "",
    facility: "",
    facility_id: "",
    phone: "",
  });
  // Hold parsed NIN details for a quick preview
  const [ninDetails, setNinDetails] = useState<null | { nationality: string; sex: string; year: string }>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSpecialtyDropdown, setShowSpecialtyDropdown] = useState(false);
  const [showFacilityDropdown, setShowFacilityDropdown] = useState(false);
  const [facilitiesList, setFacilitiesList] = useState<any[]>([]);

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

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    // Clear any existing error for this field
    if (errors[key as keyof Errors]) {
      setErrors((e) => ({ ...e, [key]: undefined }));
    }
    // Reset NIN preview when NIN changes
    if (key === "nin") {
      setNinDetails(null);
    }
  }
  

  function nextStep() {
    const next: Errors = {};
    if (step === 1) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.professional_email)) next.email = "Email invalide.";
      if (form.password.length < 8) next.password = "Au moins 8 caractères.";
    } else if (step === 2) {
      if (!form.first_name.trim()) next.first_name = "Prénom requis.";
      if (!form.last_name.trim()) next.last_name = "Nom requis.";
      if (!form.nin.trim()) {
        next.nin = "NIN requis.";
      } else if (!/^\d{8,18}$/.test(form.nin)) {
        next.nin = "Entre 8 et 18 chiffres.";
      } else {
        const ninResult = validateNIN(form.nin);
        if (!ninResult.isValid) {
          next.nin = ninResult.error || "NIN invalide.";
        } else {
          setNinDetails({
            nationality: ninResult.nationality,
            sex: ninResult.sex,
            year: ninResult.year,
          });
        }
      }
    }

    setErrors(next);
    if (Object.keys(next).length === 0) {
      setStep((s) => s + 1);
    }
  }

  function prevStep() {
    setStep((s) => s - 1);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (!form.specialty.trim()) next.specialty = "Spécialité requise.";
    if (!form.phone.trim()) {
      next.phone = "Téléphone requis.";
    } else if (!/^\d{10}$/.test(form.phone)) {
      next.phone = "Téléphone doit contenir 10 chiffres.";
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setLoading(true);

    try {
      // 1. Try RPC registration procedure
      const { data, error } = await supabase.rpc('register_doctor', {
        email_input: form.professional_email.trim(),
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

      // 2. Fallback to direct table insertion (users as single source of truth for identity)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([{
          email: form.professional_email.trim().toLowerCase(),
          password_hash: form.password,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          role: 'DOCTOR',
          is_active: true
        }])
        .select('id')
        .single();

      if (userError || !userData) {
        setLoading(false);
        if (userError?.code === '23505') {
          setErrors({ form: "Cet email est déjà utilisé par un autre compte." });
        } else {
          setErrors({ form: userError?.message || error?.message || "Erreur lors de la création du compte." });
        }
        return;
      }

      // Create doctor record linked via user_id
      const { error: doctorError } = await supabase
        .from('doctors')
        .insert([{
          user_id: userData.id,
          nin: form.nin.trim(),
          specialty: form.specialty.trim(),
          facility_id: form.facility_id || null,
          phone: form.phone.trim(),
          status: 'PENDING'
        }]);

      setLoading(false);

      if (doctorError) {
        // Rollback user if doctor insert fails
        await supabase.from('users').delete().eq('id', userData.id);
        setErrors({ form: doctorError.message || "Erreur lors de l'enregistrement du profil médecin." });
      } else {
        setDone(true);
      }
    } catch (err: any) {
      setLoading(false);
      setErrors({ form: err.message || "Erreur de connexion" });
    }
  }

  return (
    <div className="site">
      <Navbar />

      <main style={{ display: 'flex', minHeight: 'calc(100vh - 140px)', width: '100%', fontFamily: "'Inter', sans-serif", margin: 0, padding: 0 }}>
        {/* Left Panel - Branding / Illustration */}
        <div style={{
          flex: 1,
          backgroundColor: COLORS.navy,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2rem',
          color: 'white'
        }} className="hidden md:flex auth-left-panel">
          <div style={{ maxWidth: '400px', textAlign: 'center' }}>
            {/* The generated illustration */}
            <img
              src={authImage}
              alt="Healthcare Illustration"
              style={{ width: '100%', height: 'auto', marginBottom: '2rem', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
            />
            <h2 style={{ fontSize: '1.75rem', fontWeight: '600', marginBottom: '1rem', color: '#ffffff' }}>
              Rejoignez le Réseau Rased
            </h2>
            <p style={{ fontSize: '1rem', lineHeight: '1.6', opacity: 0.9, color: COLORS.lightTeal }}>
              Contribuez à la veille sanitaire nationale. Déclarez les événements de santé de manière sécurisée et rapide.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '2rem' }}>
              <div style={{ width: '24px', height: '6px', borderRadius: '4px', backgroundColor: COLORS.teal }} />
              <div style={{ width: '8px', height: '6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
              <div style={{ width: '8px', height: '6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div style={{
          flex: 1,
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2rem',
          position: 'relative'
        }}>

          <div style={{ width: '100%', maxWidth: '420px' }}>
            {done ? (
              <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease-out' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1.5rem', color: COLORS.teal }}>✓</div>
                <h2 style={{ fontSize: '1.75rem', color: COLORS.navy, marginBottom: '1rem', fontWeight: '600' }}>
                  Demande en attente
                </h2>
                <p style={{ color: COLORS.muted, marginBottom: '2rem', lineHeight: '1.6', fontSize: '1rem' }}>
                  Votre compte médecin a été créé avec succès. Son statut est actuellement <strong>En attente</strong>.
                  Il doit être vérifié par votre établissement avant l'activation. Un email sera envoyé à <strong>{form.professional_email}</strong>.
                </p>
                <Link to="/" style={{
                  display: 'inline-block',
                  backgroundColor: COLORS.navy,
                  color: 'white',
                  padding: '0.875rem 2rem',
                  borderRadius: '30px',
                  textDecoration: 'none',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}>
                  Retour à l'accueil
                </Link>
              </div>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: COLORS.navy, marginBottom: '0.5rem' }}>
                    Inscription Médecin
                  </h2>
                  <p style={{ color: COLORS.muted, fontSize: '0.95rem' }}>
                    Veuillez remplir vos informations
                  </p>

                  {/* Step Indicator */}
                  <div style={{ marginTop: '1.5rem' }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: '600', color: COLORS.teal, marginBottom: '0.5rem' }}>
                      Étape {step} sur 3
                    </p>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      {[1, 2, 3].map((i) => (
                        <div key={i} style={{
                          height: '4px', width: '40px', borderRadius: '2px',
                          background: i <= step ? COLORS.teal : COLORS.lightTeal,
                          transition: 'background 0.3s'
                        }} />
                      ))}
                    </div>
                  </div>
                </div>

                <form onSubmit={step === 3 ? handleSubmit : (e) => e.preventDefault()} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {errors.form && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.85rem', backgroundColor: '#FEF2F2', border: '1px solid #F87171', color: '#B91C1C', borderRadius: '8px', fontSize: '0.9rem', animation: 'fadeIn 0.3s' }}>
                      <AlertCircle size={18} style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                      <span>{errors.form}</span>
                    </div>
                  )}

                  {step === 1 && (
                    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: COLORS.muted, marginBottom: '0.5rem', fontWeight: '500' }}>Email</label>
                        <input
                          type="email"
                          value={form.professional_email}
                          onChange={(e) => update("professional_email", e.target.value)}
                          placeholder="Dr. Exemple"
                          style={{
                            width: '100%',
                            padding: '0.5rem 0',
                            border: 'none',
                            borderBottom: `2px solid ${COLORS.border}`,
                            outline: 'none',
                            fontSize: '1rem',
                            color: COLORS.text,
                            transition: 'border-color 0.2s'
                          }}
                          onFocus={(e) => e.target.style.borderBottom = `2px solid ${COLORS.teal}`}
                          onBlur={(e) => e.target.style.borderBottom = `2px solid ${COLORS.border}`}
                        />
                        {errors.email && <span style={{ color: '#e53e3e', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>{errors.email}</span>}
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: COLORS.muted, marginBottom: '0.5rem', fontWeight: '500' }}>Mot de passe</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showPassword ? "text" : "password"}
                            value={form.password}
                            onChange={(e) => update("password", e.target.value)}
                            placeholder="••••••••"
                            style={{
                              width: '100%',
                              padding: '0.5rem 2.5rem 0.5rem 0',
                              border: 'none',
                              borderBottom: `2px solid ${COLORS.border}`,
                              outline: 'none',
                              fontSize: '1rem',
                              color: COLORS.text,
                              transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderBottom = `2px solid ${COLORS.teal}`}
                            onBlur={(e) => e.target.style.borderBottom = `2px solid ${COLORS.border}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                              position: 'absolute',
                              right: '0',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              color: COLORS.muted,
                              cursor: 'pointer',
                              padding: '0.25rem'
                            }}
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        {errors.password && <span style={{ color: '#e53e3e', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>{errors.password}</span>}
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '0.85rem', color: COLORS.muted, marginBottom: '0.5rem', fontWeight: '500' }}>Prénom</label>
                          <input
                            type="text"
                            value={form.first_name}
                            onChange={(e) => update("first_name", e.target.value)}
                            style={{ width: '100%', padding: '0.5rem 0', border: 'none', borderBottom: `2px solid ${COLORS.border}`, outline: 'none', fontSize: '1rem', color: COLORS.text }}
                            onFocus={(e) => e.target.style.borderBottom = `2px solid ${COLORS.teal}`}
                            onBlur={(e) => e.target.style.borderBottom = `2px solid ${COLORS.border}`}
                          />
                          {errors.first_name && <span style={{ color: '#e53e3e', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>{errors.first_name}</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '0.85rem', color: COLORS.muted, marginBottom: '0.5rem', fontWeight: '500' }}>Nom</label>
                          <input
                            type="text"
                            value={form.last_name}
                            onChange={(e) => update("last_name", e.target.value)}
                            style={{ width: '100%', padding: '0.5rem 0', border: 'none', borderBottom: `2px solid ${COLORS.border}`, outline: 'none', fontSize: '1rem', color: COLORS.text }}
                            onFocus={(e) => e.target.style.borderBottom = `2px solid ${COLORS.teal}`}
                            onBlur={(e) => e.target.style.borderBottom = `2px solid ${COLORS.border}`}
                          />
                          {errors.last_name && <span style={{ color: '#e53e3e', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>{errors.last_name}</span>}
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: COLORS.muted, marginBottom: '0.5rem', fontWeight: '500' }}>NIN </label>
                        <input
                          type="text"
                          value={form.nin}
                          onChange={(e) => update("nin", e.target.value)}
                          placeholder="1000400000000000XX"
                          maxLength={18}
                          style={{ width: '100%', padding: '0.5rem 0', border: 'none', borderBottom: `2px solid ${COLORS.border}`, outline: 'none', fontSize: '1rem', color: COLORS.text }}
                          onFocus={(e) => e.target.style.borderBottom = `2px solid ${COLORS.teal}`}
                          onBlur={(e) => e.target.style.borderBottom = `2px solid ${COLORS.border}`}
                        />
                        {errors.nin && <span style={{ color: '#e53e3e', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>{errors.nin}</span>}
                        {ninDetails && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginTop: '0.75rem', padding: '0.85rem', backgroundColor: '#F0FDF4', border: '1px solid #86EFAC', color: '#166534', borderRadius: '8px', fontSize: '0.85rem', animation: 'fadeIn 0.3s' }}>
                            <CheckCircle2 size={18} style={{ marginTop: '0.1rem', flexShrink: 0, color: '#22C55E' }} />
                            <span>
                              NIN valide – <strong>{ninDetails.nationality}</strong>, {ninDetails.sex}, enregistré en <strong>{ninDetails.year}</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                      {/* Facility Combobox */}
                      <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: COLORS.muted, marginBottom: '0.5rem', fontWeight: '500' }}>Établissement de santé</label>
                        <input
                          type="text"
                          value={form.facility}
                          onChange={(e) => {
                            update("facility", e.target.value);
                            update("facility_id", "");
                            setShowFacilityDropdown(true);
                          }}
                          placeholder="Rechercher votre établissement (ex: CHU, EPH)..."
                          style={{ width: '100%', padding: '0.5rem 0', border: 'none', borderBottom: `2px solid ${COLORS.border}`, outline: 'none', fontSize: '1rem', color: COLORS.text }}
                          onFocus={(e) => {
                            e.target.style.borderBottom = `2px solid ${COLORS.teal}`;
                            setShowFacilityDropdown(true);
                          }}
                          onBlur={(e) => {
                            e.target.style.borderBottom = `2px solid ${COLORS.border}`;
                            setTimeout(() => setShowFacilityDropdown(false), 200);
                          }}
                        />
                        
                        {showFacilityDropdown && filteredFacilities.length > 0 && (
                          <ul style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            maxHeight: '220px',
                            overflowY: 'auto',
                            backgroundColor: 'white',
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: '8px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                            listStyle: 'none',
                            padding: '0.5rem 0',
                            margin: '0.25rem 0 0 0',
                            zIndex: 25
                          }}>
                            {filteredFacilities.map(fac => (
                              <li
                                key={fac.id}
                                onClick={() => {
                                  update("facility", fac.name);
                                  update("facility_id", fac.id);
                                  setShowFacilityDropdown(false);
                                }}
                                style={{
                                  padding: '0.6rem 1rem',
                                  cursor: 'pointer',
                                  fontSize: '0.95rem',
                                  color: COLORS.text,
                                  borderBottom: `1px solid ${COLORS.border}`,
                                  transition: 'background-color 0.1s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = COLORS.lightTeal}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <div style={{ fontWeight: '600', color: COLORS.navy }}>{fac.name}</div>
                                {fac.wilaya && (
                                  <div style={{ fontSize: '0.75rem', color: COLORS.muted }}>{fac.wilaya} • {fac.facility_type || 'Établissement'}</div>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: COLORS.muted, marginBottom: '0.5rem', fontWeight: '500' }}>Spécialité</label>
                        <input
                          type="text"
                          value={form.specialty}
                          onChange={(e) => {
                            update("specialty", e.target.value);
                            setShowSpecialtyDropdown(true);
                          }}
                          placeholder="Rechercher une spécialité..."
                          style={{ width: '100%', padding: '0.5rem 0', border: 'none', borderBottom: `2px solid ${COLORS.border}`, outline: 'none', fontSize: '1rem', color: COLORS.text }}
                          onFocus={(e) => {
                            e.target.style.borderBottom = `2px solid ${COLORS.teal}`;
                            setShowSpecialtyDropdown(true);
                          }}
                          onBlur={(e) => {
                            e.target.style.borderBottom = `2px solid ${COLORS.border}`;
                            // Delay to allow click on dropdown items
                            setTimeout(() => setShowSpecialtyDropdown(false), 200);
                          }}
                        />
                        {errors.specialty && <span style={{ color: '#e53e3e', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>{errors.specialty}</span>}
                        
                        {showSpecialtyDropdown && filteredSpecialties.length > 0 && (
                          <ul style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            maxHeight: '220px',
                            overflowY: 'auto',
                            backgroundColor: 'white',
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: '8px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                            listStyle: 'none',
                            padding: '0.5rem 0',
                            margin: '0.25rem 0 0 0',
                            zIndex: 25
                          }}>
                            {filteredSpecialties.map(spec => (
                              <li
                                key={spec}
                                onClick={() => {
                                  update("specialty", spec);
                                  setShowSpecialtyDropdown(false);
                                }}
                                style={{
                                  padding: '0.6rem 1rem',
                                  cursor: 'pointer',
                                  fontSize: '0.95rem',
                                  color: COLORS.text,
                                  borderBottom: `1px solid ${COLORS.border}`,
                                  transition: 'background-color 0.1s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = COLORS.lightTeal}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <div style={{ fontWeight: '600', color: COLORS.navy }}>{spec}</div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: COLORS.muted, marginBottom: '0.5rem', fontWeight: '500' }}>Téléphone</label>
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => update("phone", e.target.value)}
                          placeholder="05..."
                          maxLength={10}
                          style={{ width: '100%', padding: '0.5rem 0', border: 'none', borderBottom: `2px solid ${COLORS.border}`, outline: 'none', fontSize: '1rem', color: COLORS.text }}
                          onFocus={(e) => e.target.style.borderBottom = `2px solid ${COLORS.teal}`}
                          onBlur={(e) => e.target.style.borderBottom = `2px solid ${COLORS.border}`}
                        />
                        {errors.phone && <span style={{ color: '#e53e3e', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>{errors.phone}</span>}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center' }}>
                    {step > 1 && (
                      <button type="button" onClick={prevStep} style={{
                        flex: 1,
                        backgroundColor: 'transparent',
                        color: COLORS.navy,
                        border: `1px solid ${COLORS.navy}`,
                        padding: '0.875rem',
                        borderRadius: '30px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(6, 44, 84, 0.05)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        Retour
                      </button>
                    )}
                    {step < 3 ? (
                      <button type="button" onClick={nextStep} style={{
                        flex: step === 1 ? 'none' : 2,
                        width: step === 1 ? '100%' : 'auto',
                        backgroundColor: COLORS.navy,
                        color: 'white',
                        border: 'none',
                        padding: '0.875rem',
                        borderRadius: '30px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(6,44,84,0.3)',
                        transition: 'transform 0.1s'
                      }}
                        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        Suivant
                      </button>
                    ) : (
                      <button type="submit" disabled={loading} style={{
                        flex: 2,
                        backgroundColor: COLORS.teal,
                        color: 'white',
                        border: 'none',
                        padding: '0.875rem',
                        borderRadius: '30px',
                        fontWeight: '600',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        boxShadow: '0 4px 14px rgba(15,162,155,0.3)',
                        transition: 'transform 0.1s'
                      }}
                        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        {loading ? "Vérification..." : "S'inscrire"}
                      </button>
                    )}
                  </div>
                </form>

                <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
                  <p style={{ color: COLORS.muted, fontSize: '0.9rem' }}>
                    Vous avez déjà un compte ?{' '}
                    <Link to="/login" style={{ color: COLORS.teal, textDecoration: 'none', fontWeight: '600' }}>
                      Connectez-vous
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Inline styles for basic animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
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
