import { useState, useEffect } from "react";
import { X, ExternalLink, Download, FileText, Loader2 } from "lucide-react";
import { getSecureProofUrl } from "@/lib/supabase";

interface MedicalProofModalProps {
  proofPath: string | null;
  onClose: () => void;
}

const COLORS = {
  navy: "#062C54",
  teal: "#0fa29b",
  border: "#e2e8f0",
  bgLight: "#f8fafc",
};

export function MedicalProofModal({ proofPath, onClose }: MedicalProofModalProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPdf, setIsPdf] = useState<boolean>(false);

  useEffect(() => {
    async function loadUrl() {
      if (!proofPath) return;
      setLoading(true);
      const url = await getSecureProofUrl(proofPath);
      setResolvedUrl(url);

      const cleanLower = url.toLowerCase();
      if (cleanLower.includes(".pdf") || cleanLower.includes("application/pdf")) {
        setIsPdf(true);
      } else {
        setIsPdf(false);
      }
      setLoading(false);
    }
    loadUrl();
  }, [proofPath]);

  if (!proofPath) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(6,44,84,0.75)",
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "18px",
          maxWidth: "800px",
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          border: `1px solid ${COLORS.border}`,
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: "16px 24px",
            backgroundColor: COLORS.navy,
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FileText size={20} color={COLORS.teal} />
            <div>
              <div style={{ fontWeight: "800", fontSize: "1rem" }}>Preuve Médicale Attachée</div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Document d'inspection sanitaire sécurisé</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {resolvedUrl && (
              <a
                href={resolvedUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "#cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.8rem",
                  textDecoration: "none",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(255,255,255,0.1)",
                }}
              >
                <ExternalLink size={14} /> Ouvrir
              </a>
            )}

            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "white",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* MODAL CONTENT BODY */}
        <div style={{ padding: "24px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "350px", backgroundColor: COLORS.bgLight }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", color: COLORS.navy }}>
              <Loader2 size={32} className="animate-spin" color={COLORS.teal} />
              <span style={{ fontSize: "0.88rem", fontWeight: "700" }}>Chargement sécurisé du document...</span>
            </div>
          ) : resolvedUrl ? (
            isPdf ? (
              <iframe
                src={resolvedUrl}
                title="Preuve Médicale PDF"
                style={{ width: "100%", height: "550px", borderRadius: "12px", border: `1px solid ${COLORS.border}` }}
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                <img
                  src={resolvedUrl}
                  alt="Preuve médicale"
                  style={{ maxWidth: "100%", maxHeight: "500px", borderRadius: "12px", objectFit: "contain", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}
                />
              </div>
            )
          ) : (
            <div style={{ color: "#ef4444", fontSize: "0.9rem", fontWeight: "700" }}>Impossible d'accéder au document médical sécurisé.</div>
          )}
        </div>
      </div>
    </div>
  );
}
