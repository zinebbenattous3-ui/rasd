import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

export interface TurnstileWidgetRef {
  reset: () => void;
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (err?: string) => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: (errorCode?: string) => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

export const TurnstileWidget = forwardRef<TurnstileWidgetRef, TurnstileWidgetProps>(
  ({ onVerify, onExpire, onError }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);

    const siteKey = (import.meta as any).env?.VITE_TURNSTILE_SITE_KEY || "";

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.reset(widgetIdRef.current);
          } catch (e) {
            console.warn("[TurnstileWidget] Error resetting Turnstile widget:", e);
          }
        }
      }
    }));

    useEffect(() => {
      if (!siteKey) {
        console.error("[TurnstileWidget] VITE_TURNSTILE_SITE_KEY is missing in frontend env.");
        return;
      }

      let isMounted = true;

      const renderWidget = () => {
        if (!isMounted || !containerRef.current || !window.turnstile) return;
        
        // Remove existing widget if already rendered
        if (widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch (_) {}
          widgetIdRef.current = null;
        }

        try {
          const id = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => {
              if (isMounted) onVerify(token);
            },
            "expired-callback": () => {
              if (isMounted && onExpire) onExpire();
            },
            "error-callback": (errCode?: string) => {
              if (isMounted && onError) onError(errCode);
            },
            theme: "light"
          });
          widgetIdRef.current = id;
        } catch (e: any) {
          console.error("[TurnstileWidget] Render error:", e);
        }
      };

      // Check if script is already present
      if (window.turnstile) {
        renderWidget();
      } else {
        const existingScript = document.getElementById("cf-turnstile-script");
        if (!existingScript) {
          const script = document.createElement("script");
          script.id = "cf-turnstile-script";
          script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
          script.async = true;
          script.defer = true;
          script.onload = () => {
            if (isMounted) renderWidget();
          };
          document.head.appendChild(script);
        } else {
          existingScript.addEventListener("load", renderWidget);
        }
      }

      return () => {
        isMounted = false;
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch (_) {}
        }
      };
    }, [siteKey]);

    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "12px 0" }}>
        <div ref={containerRef} />
        {!siteKey && (
          <div style={{ color: "#DC2626", fontSize: "0.8rem", marginTop: "4px" }}>
            ⚠️ Clé VITE_TURNSTILE_SITE_KEY manquante.
          </div>
        )}
      </div>
    );
  }
);

TurnstileWidget.displayName = "TurnstileWidget";
