import { supabase } from "@/lib/supabase";
import { storeSession } from "@/lib/auth";

export interface GoogleAuthResult {
  success: boolean;
  reason?: 'CANCELLED' | 'INVALID_GOOGLE_TOKEN' | 'NO_ACCOUNT' | 'ACCOUNT_INACTIVE' | 'DOCTOR_PENDING' | 'DOCTOR_REJECTED' | 'SERVER_ERROR';
  message?: string;
  user?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    is_active: boolean;
  };
  doctorData?: any;
}

/**
 * Load Google Identity Services (GIS) script dynamically if not present
 */
export function loadGoogleGsiScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && (window as any).google?.accounts) {
      resolve(true);
      return;
    }

    const existingScript = document.getElementById("google-gsi-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

/**
 * Verify Google Token (ID Token or Access Token) against Google's tokeninfo API
 */
export async function verifyGoogleToken(token: string): Promise<{
  valid: boolean;
  email?: string;
  error?: string;
}> {
  const configuredClientId = ((import.meta.env["VITE_GOOGLE_CLIENT_ID"] as string | undefined) || "").trim();

  try {
    // 1. Try verifying as ID Token via Google's tokeninfo API
    let res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
    let data: any = null;

    if (res.ok) {
      data = await res.json();
    } else {
      // 2. Fallback: try verifying as Access Token
      res = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`);
      if (res.ok) {
        data = await res.json();
      }
    }

    if (!data || data.error || !data.email) {
      return { valid: false, error: "Jeton Google non valide ou expiré." };
    }

    // 3. Verify Audience (aud or azp) matches VITE_GOOGLE_CLIENT_ID if configured
    if (configuredClientId) {
      const audMatch = data.aud === configuredClientId || data.azp === configuredClientId;
      if (!audMatch) {
        console.warn("Google Client ID mismatch in token verification:", { aud: data.aud, azp: data.azp, expected: configuredClientId });
        return { valid: false, error: "Jeton Google non destiné à cette application." };
      }
    }

    // 4. Verify email status
    const isVerified = data.email_verified === true || data.email_verified === "true" || data.verified_email === true;
    if (!isVerified) {
      return { valid: false, error: "L'adresse email Google n'est pas vérifiée." };
    }

    // 5. Verify Expiration
    if (data.exp) {
      const currentEpoch = Math.floor(Date.now() / 1000);
      if (parseInt(data.exp, 10) < currentEpoch) {
        return { valid: false, error: "Jeton Google expiré." };
      }
    }

    return {
      valid: true,
      email: data.email.trim().toLowerCase()
    };
  } catch (err) {
    console.error("Error verifying Google token:", err);
    return { valid: false, error: "Erreur de communication avec les serveurs de vérification Google." };
  }
}

/**
 * Full backend verification & authentication process for Google login
 */
export async function authenticateWithGoogleCredential(token: string): Promise<GoogleAuthResult> {
  // Step 1: Server-side token verification with Google
  const verification = await verifyGoogleToken(token);

  if (!verification.valid || !verification.email) {
    return {
      success: false,
      reason: 'INVALID_GOOGLE_TOKEN',
      message: verification.error || "Impossible de terminer la connexion avec Google. Veuillez réessayer."
    };
  }

  const verifiedEmail = verification.email;

  try {
    // Step 2: Query database for existing account matching verified Google email
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, is_active')
      .eq('email', verifiedEmail)
      .maybeSingle();

    if (error || !user) {
      return {
        success: false,
        reason: 'NO_ACCOUNT',
        message: "Cette adresse Google n'est associée à aucun compte RASED."
      };
    }

    // Step 3: Check account active status
    if (user.is_active === false) {
      return {
        success: false,
        reason: 'ACCOUNT_INACTIVE',
        message: "Votre compte RASED est actuellement désactivé. Contactez l'administration pour plus d'informations."
      };
    }

    // Step 4: If DOCTOR role, verify doctor status (PENDING / ACCEPTED / REJECTED)
    if (user.role === 'DOCTOR') {
      const { data: docData } = await supabase
        .from('doctors')
        .select(`
          *,
          facility:facility_id (
            name,
            facility_type,
            wilaya,
            address
          )
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (docData) {
        if (docData.status === 'PENDING') {
          return {
            success: false,
            reason: 'DOCTOR_PENDING',
            doctorData: docData,
            message: "Votre demande d'accès est toujours en cours de vérification. Veuillez patienter."
          };
        }

        if (docData.status === 'REJECTED') {
          return {
            success: false,
            reason: 'DOCTOR_REJECTED',
            doctorData: docData,
            message: "Votre demande d'accès a été refusée. Contactez l'administration pour plus d'informations."
          };
        }
      }
    }

    // Step 5: Store authenticated RASED session (same token & cookie architecture)
    storeSession(user.id, user.role);

    return {
      success: true,
      user
    };
  } catch (err: any) {
    console.error("Google Auth backend query error:", err);
    return {
      success: false,
      reason: 'SERVER_ERROR',
      message: "Une erreur est survenue lors de l'authentification. Veuillez réessayer."
    };
  }
}
