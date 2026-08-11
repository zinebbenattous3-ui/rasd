import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { storeSession } from "@/lib/auth";

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
}

export function Login({ onAuthenticated }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Saisissez votre email.";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      next.email = "Format d'email invalide.";
    if (!password) next.password = "Saisissez votre mot de passe.";
    else if (password.length < 6) next.password = "Au moins 6 caractères.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    
    // 1. Try RPC authentication
    const { data: userData, error: userError } = await supabase.rpc('login_user', {
      email_input: email.trim(),
      password_input: password,
    });

    if (!userError && userData) {
      if (userData.is_active === false) {
        setLoading(false);
        setErrors({ form: "Votre compte est désactivé. Veuillez contacter un administrateur." });
        return;
      }
      storeSession(userData.id, userData.role);
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

    setLoading(false);

    if (directError || !directUser) {
      setErrors({ form: "Identifiant ou mot de passe incorrect." });
      return;
    }

    if (directUser.is_active === false) {
      setErrors({ form: "Votre compte est désactivé. Veuillez contacter un administrateur." });
      return;
    }

    storeSession(directUser.id, directUser.role);
    onAuthenticated(directUser.role, { id: directUser.id, email: email.trim() });
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: COLORS.navy, marginBottom: '0.5rem' }}>
          Connexion Professionnelle
        </h2>
        <p style={{ color: COLORS.muted, fontSize: '0.95rem' }}>
          Accédez à votre espace Rased
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {errors.form && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.85rem', backgroundColor: '#FEF2F2', border: '1px solid #F87171', color: '#B91C1C', borderRadius: '8px', fontSize: '0.9rem' }}>
            <AlertCircle size={18} style={{ marginTop: '0.1rem', flexShrink: 0 }} />
            <span>{errors.form}</span>
          </div>
        )}

        <div>
          <label htmlFor="email" style={{ display: 'block', fontSize: '0.85rem', color: COLORS.muted, marginBottom: '0.5rem', fontWeight: '500' }}>Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((err) => { const { email, ...rest } = err; return rest; });
            }}
            placeholder="votre@email.com"
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
          <label htmlFor="password" style={{ display: 'block', fontSize: '0.85rem', color: COLORS.muted, marginBottom: '0.5rem', fontWeight: '500' }}>Mot de passe</label>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((err) => { const { password, ...rest } = err; return rest; });
              }}
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
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <span style={{ color: '#e53e3e', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>{errors.password}</span>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          <input
            id="remember"
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            style={{ accentColor: COLORS.teal, width: '16px', height: '16px' }}
          />
          <label htmlFor="remember" style={{ fontSize: '0.85rem', color: COLORS.muted, cursor: 'pointer' }}>
            Rester connecté
          </label>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <button type="submit" disabled={loading} style={{
            width: '100%',
            backgroundColor: COLORS.navy,
            color: 'white',
            border: 'none',
            padding: '0.875rem',
            borderRadius: '30px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            boxShadow: '0 4px 14px rgba(6,44,84,0.3)',
            transition: 'transform 0.1s'
          }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </div>
      </form>

      <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
        <p style={{ color: COLORS.muted, fontSize: '0.9rem' }}>
          Pas encore de compte ?{' '}
          <button 
            onClick={() => onAuthenticated("demo", undefined, true)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: COLORS.teal, 
              fontWeight: '600', 
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'inherit'
            }}
          >
            Découvrir la plateforme
          </button>
        </p>
      </div>

      {/* Inline styles for basic animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
