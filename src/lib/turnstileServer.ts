import { createServerFn } from "@tanstack/react-start";

export interface VerifyTurnstilePayload {
  token: string;
}

export interface VerifyTurnstileResponse {
  success: boolean;
  error?: string;
}

/**
 * Server Function: Verifies a Cloudflare Turnstile token on the backend
 * using Cloudflare's siteverify API and the secret key.
 * 
 * SECURITY: TURNSTILE_SECRET_KEY is strictly server-side and never exposed to the client.
 */
export const verifyTurnstileToken = createServerFn({ method: "POST" })
  .validator((data: VerifyTurnstilePayload) => data)
  .handler(async ({ data }): Promise<VerifyTurnstileResponse> => {
    const token = data?.token;
    if (!token || typeof token !== "string" || !token.trim()) {
      return {
        success: false,
        error: "Vérification Turnstile manquante. Veuillez valider le contrôle anti-robot."
      };
    }

    // Access TURNSTILE_SECRET_KEY strictly on the server
    const secretKey =
      process.env["TURNSTILE_SECRET_KEY"] ||
      (import.meta as any).env?.TURNSTILE_SECRET_KEY;

    if (!secretKey) {
      console.error("[Turnstile Server] TURNSTILE_SECRET_KEY is not defined in server environment.");
      return {
        success: false,
        error: "Erreur de configuration serveur (TURNSTILE_SECRET_KEY manquante)."
      };
    }

    try {
      const formData = new URLSearchParams();
      formData.append("secret", secretKey);
      formData.append("response", token);

      const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formData.toString()
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Échec de communication avec Cloudflare Turnstile (HTTP ${response.status}).`
        };
      }

      const resData = await response.json();

      if (resData.success === true) {
        return { success: true };
      } else {
        const errorCodes = Array.isArray(resData["error-codes"]) ? resData["error-codes"].join(", ") : "inconnu";
        console.warn(`[Turnstile Server] Verification failed for token. Error codes: ${errorCodes}`);
        return {
          success: false,
          error: "La vérification anti-robot Cloudflare Turnstile a échoué. Veuillez réessayer."
        };
      }
    } catch (err: any) {
      console.error("[Turnstile Server] Network exception during siteverify:", err);
      return {
        success: false,
        error: err.message || "Erreur de connexion au serveur de vérification Turnstile."
      };
    }
  });
