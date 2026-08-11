import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, AlertCircle, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";
import { storeSession, getStoredSession, clearSession } from "@/lib/auth";
import { loadGoogleGsiScript, authenticateWithGoogleCredential } from "@/lib/googleAuth";
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
  onDoctorStateChange?: (docState: { status: 'PENDING' | 'ACCEPTED' | 'REJECTED'; doctor: any; latestActionMessage?: string }) => void;
}

export function Login({ onAuthenticated, onStateChange, onDoctorStateChange }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [noAccountError, setNoAccountError] = useState(false);
  const [loadingStepText, setLoadingStepText] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Existing active session detection for "One Session Per Browser" rule
  const [existingSession, setExistingSession] = useState<{ userId: string; role: string } | null>(null);

  useEffect(() => {
    const sess = getStoredSession();
    if (sess && sess.userId && sess.role) {
      setExistingSession({ userId: sess.userId, role: sess.role });
    }
  }, []);

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
    setNoAccountError(false);

    if (Object.keys(next).length > 0) {
      triggerState('error');
      return;
    }

    setLoading(true);
    setLoadingStepText("Vérification des identifiants...");
    triggerState('loading', "Vérification des identifiants...");
    
    // Branded multi-step verification sequence
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
        setErrors({ form: "Votre compte RASED est actuellement désactivé. Contactez l'administration pour plus d'informations." });
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
      setErrors({ form: "Votre compte RASED est actuellement désactivé. Contactez l'administration pour plus d'informations." });
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

  // Google Authentication Handler
  const handleGoogleLogin = async () => {
    const googleClientId = ((import.meta.env["VITE_GOOGLE_CLIENT_ID"] as string | undefined) || "").trim();

    if (!googleClientId) {
      setErrors({ form: "Client ID Google non configuré dans l'environnement (VITE_GOOGLE_CLIENT_ID)." });
      triggerState('error');
      return;
    }

    setGoogleLoading(true);
    setNoAccountError(false);
    setErrors({});
    triggerState('loading', "Connexion avec Google...");

    const loaded = await loadGoogleGsiScript();
    if (!loaded || !(window as any).google?.accounts) {
      setGoogleLoading(false);
      setErrors({ form: "Impossible de charger le service d'authentification Google. Veuillez réessayer." });
      triggerState('error');
      return;
    }

    const google = (window as any).google;

    // Use interactive Google OAuth Token Client
    if (google.accounts.oauth2) {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: "email profile",
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            setGoogleLoading(false);
            if (tokenResponse.error === "access_denied") {
              setErrors({ form: "Connexion Google annulée." });
            } else {
              setErrors({ form: "Impossible de terminer la connexion avec Google. Veuillez réessayer." });
            }
            triggerState('error');
            return;
          }

          if (tokenResponse.access_token) {
            await processGoogleToken(tokenResponse.access_token);
          }
        },
        error_callback: () => {
          setGoogleLoading(false);
          setErrors({ form: "Connexion Google annulée." });
          triggerState('error');
        }
      });
      tokenClient.requestAccessToken();
    } else {
      // Fallback: Google ID Token Prompt
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response: any) => {
          if (response.credential) {
            await processGoogleToken(response.credential);
          } else {
            setGoogleLoading(false);
            setErrors({ form: "Connexion Google annulée." });
            triggerState('error');
          }
        }
      });
      google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setGoogleLoading(false);
        }
      });
    }
  };

  const processGoogleToken = async (token: string) => {
    setGoogleLoading(true);
    setLoadingStepText("Vérification auprès des serveurs Google...");
    triggerState('loading', "Vérification auprès des serveurs Google...");

    const result = await authenticateWithGoogleCredential(token);
    setGoogleLoading(false);

    if (!result.success) {
      if (result.reason === 'NO_ACCOUNT') {
        setNoAccountError(true);
        setErrors({ form: result.message || "Cette adresse Google n'est associée à aucun compte RASED." });
      } else if (result.reason === 'DOCTOR_PENDING' || result.reason === 'DOCTOR_REJECTED') {
        if (onDoctorStateChange) {
          onDoctorStateChange({
            status: result.reason === 'DOCTOR_PENDING' ? 'PENDING' : 'REJECTED',
            doctor: result.doctorData
          });
        } else {
          setErrors({ form: result.message ?? "Statut de compte non autorisé." });
        }
      } else {
        setErrors({ form: result.message || "Impossible de terminer la connexion avec Google. Veuillez réessayer." });
      }
      triggerState('error');
      return;
    }

    if (result.user) {
      triggerState('success');
      onAuthenticated(result.user.role, { id: result.user.id, email: result.user.email });
    }
  };

  // If a session is already present, render Single Session Protection Alert
  if (existingSession) {
    return (
      <div style={{ width: '100%', animation: 'fadeIn 0.35s ease-out' }}>
        <div style={{ padding: '1.75rem', backgroundColor: '#F0F9FF', border: '1.5px solid #BAE6FD', borderRadius: '18px', color: COLORS.navy }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <CheckCircle2 size={24} color="#0284C7" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: COLORS.navy }}>
              Compte déjà connecté
            </h3>
          </div>
          <p style={{ fontSize: '0.92rem', color: COLORS.text, lineHeight: '1.5', marginBottom: '20px' }}>
            Un compte RASED (<strong>{existingSession.role}</strong>) est actuellement actif sur ce navigateur. Pour changer de compte, veuillez d'abord vous déconnecter.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onAuthenticated(existingSession.role, { id: existingSession.userId })}
              style={{
                backgroundColor: COLORS.navy,
                color: 'white',
                border: 'none',
                padding: '11px 20px',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(6,44,84,0.2)'
              }}
            >
              Continuer avec ce compte →
            </button>
            <button
              onClick={async () => {
                await clearSession();
                setExistingSession(null);
              }}
              style={{
                backgroundColor: 'white',
                color: '#DC2626',
                border: '1.5px solid #FECACA',
                padding: '11px 20px',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    );
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

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {errors.form && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: '12px', fontSize: '0.9rem', lineHeight: '1.4', animation: 'fadeIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <AlertCircle size={20} style={{ marginTop: '0.05rem', flexShrink: 0, color: '#DC2626' }} />
              <div>
                <strong style={{ display: 'block', fontWeight: '700', marginBottom: '2px' }}>Erreur d'authentification</strong>
                <span>{errors.form}</span>
              </div>
            </div>

            {noAccountError && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', borderTop: '1px solid #FCA5A5', paddingTop: '10px' }}>
                <a
                  href="/signup"
                  style={{
                    backgroundColor: COLORS.navy,
                    color: 'white',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  Créer un compte →
                </a>
                <button
                  type="button"
                  onClick={() => { setErrors({}); setNoAccountError(false); }}
                  style={{
                    backgroundColor: 'white',
                    color: COLORS.navy,
                    border: `1px solid ${COLORS.border}`,
                    padding: '7px 12px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Réessayer
                </button>
              </div>
            )}
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
            disabled={loading || googleLoading}
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
              disabled={loading || googleLoading}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.1rem' }}>
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

        {/* Standard Submit Button */}
        <div style={{ marginTop: '0.5rem' }}>
          <button
            type="submit"
            disabled={loading || googleLoading}
            style={{
              width: '100%',
              backgroundColor: COLORS.navy,
              color: 'white',
              border: 'none',
              padding: '0.95rem',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '1rem',
              cursor: (loading || googleLoading) ? 'wait' : 'pointer',
              opacity: (loading || googleLoading) ? 0.8 : 1,
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

        {/* Visual Divider */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '0.35rem 0', gap: '0.75rem' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: COLORS.border }} />
          <span style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ou</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: COLORS.border }} />
        </div>

        {/* Google Authentication Button */}
        <div>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            style={{
              width: '100%',
              backgroundColor: 'white',
              color: COLORS.navy,
              border: `1.5px solid ${COLORS.border}`,
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '0.95rem',
              cursor: (loading || googleLoading) ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              transition: 'all 0.2s ease',
              opacity: (loading || googleLoading) ? 0.75 : 1
            }}
          >
            {googleLoading ? (
              <>
                <span style={{ display: 'inline-block', width: '16px', height: '16px', border: `2px solid ${COLORS.navy}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span>Connexion avec Google…</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continuer avec Google</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Demo Access Button */}
      <div style={{ marginTop: '1.75rem', textAlign: 'center', borderTop: `1px solid ${COLORS.border}`, paddingTop: '1.25rem' }}>
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
