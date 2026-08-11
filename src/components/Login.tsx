import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, AlertCircle, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";
import { storeSession } from "@/lib/auth";
import type { RadarState } from "./medical/MedicalRadarCanvas";

const COLORS = {
  navy: "#062C54",
  teal: "#0fa29b",
  lightTeal: "#e6f5f4",
  text: "#2d3748",
  muted: "#718096",
  border: "#e2e8f0",
};

interface LoginProps {
  onAuthenticated: (role: string, userDetails?: { id?: string; email?: string }, demo?: boolean) => void;
  onStateChange?: (state: RadarState, stepText?: string) => void;
}

export function Login({ onAuthenticated, onStateChange }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  const [loadingStepText, setLoadingStepText] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const triggerState = (state: RadarState, text?: string) => {
    if (onStateChange) {
      onStateChange(state, text);
    }
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Saisissez votre adresse e-mail.";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      next.email = "Format d'adresse e-mail invalide.";
    if (!password) next.password = "Saisissez votre mot de passe.";
    else if (password.length < 6) next.password = "Le mot de passe doit comporter au moins 6 caractères.";

    setErrors(next);
    if (Object.keys(next).length > 0) {
      triggerState('error');
      return;
    }

    setLoading(true);
    setLoadingStepText("Vérification des identifiants...");
    triggerState('loading', "Vérification des identifiants...");
    
    // Simulate branded multi-step verification sequence without unnecessary delay
    await new Promise(r => setTimeout(r, 400));
    setLoadingStepText("Sécurisation de la session...");
    triggerState('loading', "Sécurisation de la session...");

    // 1. Try RPC authentication
    const { data: userData, error: userError } = await supabase.rpc('login_user', {
      email_input: email.trim(),
      password_input: password,
    });

    if (!userError && userData) {
      if (userData.is_active === false) {
        setLoading(false);
        setErrors({ form: "Votre compte est désactivé. Veuillez contacter l'administration Rased." });
        triggerState('error');
        return;
      }

      setLoadingStepText("Préparation de votre espace...");
      triggerState('loading', "Préparation de votre espace...");
      storeSession(userData.id, userData.role);
      
      await new Promise(r => setTimeout(r, 300));
      triggerState('success');
      setLoading(false);
      onAuthenticated(userData.role, { id: userData.id, email: email.trim() });
      return;
    }

    // 2. Fallback to direct query on centralized users table
    const { data: directUser, error: directError } = await supabase
      .from('users')
      .select('id, role, is_active')
      .eq('email', email.trim().toLowerCase())
      .eq('password_hash', password)
      .maybeSingle();

    if (directError || !directUser) {
      setLoading(false);
      setErrors({ form: "Impossible de vous connecter. Vérifiez votre adresse e-mail et votre mot de passe." });
      triggerState('error');
      return;
    }

    if (directUser.is_active === false) {
      setLoading(false);
      setErrors({ form: "Votre compte est désactivé. Veuillez contacter un administrateur." });
      triggerState('error');
      return;
    }

    setLoadingStepText("Préparation de votre espace...");
    triggerState('loading', "Préparation de votre espace...");
    storeSession(directUser.id, directUser.role);
    
    await new Promise(r => setTimeout(r, 300));
    triggerState('success');
    setLoading(false);
    onAuthenticated(directUser.role, { id: directUser.id, email: email.trim() });
  }

  return (
    <div style={{ width: '100%', animation: 'fadeIn 0.35s ease-out' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', backgroundColor: COLORS.lightTeal, color: COLORS.teal, borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700', marginBottom: '1rem' }}>
          <ShieldCheck size={16} /> PORTAIL NATIONAL DE SANTE
        </div>

        <h2 style={{ fontSize: '2rem', fontWeight: '800', color: COLORS.navy, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
          Bienvenue
        </h2>
        <p style={{ color: COLORS.muted, fontSize: '0.95rem', lineHeight: '1.5' }}>
          Connectez-vous à votre espace sécurisé du réseau national de surveillance sanitaire.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
        {errors.form && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: '12px', fontSize: '0.9rem', lineHeight: '1.4', animation: 'fadeIn 0.2s ease-out' }}>
            <AlertCircle size={20} style={{ marginTop: '0.05rem', flexShrink: 0, color: '#DC2626' }} />
            <div>
              <strong style={{ display: 'block', fontWeight: '700', marginBottom: '2px' }}>Erreur d'authentification</strong>
              <span>{errors.form}</span>
            </div>
          </div>
        )}

        {/* Email Field */}
        <div>
          <label htmlFor="email" style={{ display: 'block', fontSize: '0.85rem', color: COLORS.navy, marginBottom: '0.5rem', fontWeight: '600' }}>
            Adresse e-mail
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((err) => { const { email, ...rest } = err; return rest; });
            }}
            onFocus={() => triggerState('focus-email')}
            onBlur={() => triggerState('idle')}
            placeholder="praticien@sante.gov.dz"
            disabled={loading}
            autoComplete="username"
            style={{
              width: '100%',
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              border: `1.5px solid ${errors.email ? '#EF4444' : COLORS.border}`,
              backgroundColor: '#F8FAFC',
              outline: 'none',
              fontSize: '0.95rem',
              color: COLORS.text,
              transition: 'all 0.2s ease'
            }}
          />
          {errors.email && <span style={{ color: '#EF4444', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block', fontWeight: '500' }}>{errors.email}</span>}
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" style={{ display: 'block', fontSize: '0.85rem', color: COLORS.navy, marginBottom: '0.5rem', fontWeight: '600' }}>
            Mot de passe
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((err) => { const { password, ...rest } = err; return rest; });
              }}
              onFocus={() => triggerState('focus-password')}
              onBlur={() => triggerState('idle')}
              placeholder="••••••••••••"
              disabled={loading}
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '0.85rem 2.75rem 0.85rem 1rem',
                borderRadius: '12px',
                border: `1.5px solid ${errors.password ? '#EF4444' : COLORS.border}`,
                backgroundColor: '#F8FAFC',
                outline: 'none',
                fontSize: '0.95rem',
                color: COLORS.text,
                transition: 'all 0.2s ease'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: COLORS.muted,
                cursor: 'pointer',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center'
              }}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <span style={{ color: '#EF4444', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block', fontWeight: '500' }}>{errors.password}</span>}
        </div>

        {/* Remember Session Checkbox */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
          <label htmlFor="remember" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: COLORS.muted, cursor: 'pointer' }}>
            <input
              id="remember"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              style={{ accentColor: COLORS.teal, width: '16px', height: '16px', borderRadius: '4px' }}
            />
            Rester connecté sur cet appareil
          </label>
        </div>

        {/* Submit Button */}
        <div style={{ marginTop: '0.75rem' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              backgroundColor: COLORS.navy,
              color: 'white',
              border: 'none',
              padding: '0.95rem',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '1rem',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.9 : 1,
              boxShadow: '0 8px 20px rgba(6,44,84,0.25)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span>{loadingStepText || "Connexion en cours..."}</span>
              </>
            ) : (
              <>
                <span>Se connecter</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Demo Access Button */}
      <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: `1px solid ${COLORS.border}`, paddingTop: '1.5rem' }}>
        <p style={{ color: COLORS.muted, fontSize: '0.88rem' }}>
          Accès de démonstration ?{' '}
          <button
            onClick={() => onAuthenticated("demo", undefined, true)}
            style={{
              background: 'none',
              border: 'none',
              color: COLORS.teal,
              fontWeight: '700',
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'inherit',
              textDecoration: 'underline'
            }}
          >
            Découvrir la plateforme
          </button>
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
