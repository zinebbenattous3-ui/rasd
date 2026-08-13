import { useState, useEffect } from "react";
import { X, ExternalLink, Download, FileText, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
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
  const [error, setError] = useState<boolean>(false);
  const [isPdf, setIsPdf] = useState<boolean>(false);

  const loadUrl = async () => {
    if (!proofPath) return;
    setLoading(true);
    setError(false);
    try {
      const url = await getSecureProofUrl(proofPath);
      if (!url) {
        setError(true);
        setLoading(false);
        return;
      }
      setResolvedUrl(url);

      const cleanLower = url.toLowerCase().split("?")[0] || "";
      if (cleanLower.endsWith(".pdf") || cleanLower.includes("application/pdf")) {
        setIsPdf(true);
      } else {
        setIsPdf(false);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
          maxWidth: "850px",
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
            {resolvedUrl && !error && (
              <>
                <a
                  href={resolvedUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    textDecoration: "none",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.2)"
                  }}
                >
                  <ExternalLink size={14} /> Ouvrir
                </a>
                <a
                  href={resolvedUrl}
                  download
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    textDecoration: "none",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    backgroundColor: COLORS.teal,
                  }}
                >
                  <Download size={14} /> Télécharger
                </a>
              </>
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
        <div style={{ padding: "24px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "380px", backgroundColor: COLORS.bgLight }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", color: COLORS.navy }}>
              <Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} color={COLORS.teal} />
              <span style={{ fontSize: "0.88rem", fontWeight: "700" }}>Chargement sécurisé du document...</span>
            </div>
          ) : error || !resolvedUrl ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", color: "#DC2626", textAlign: "center", padding: "2rem" }}>
              <AlertTriangle size={36} color="#DC2626" />
              <span style={{ fontSize: "1rem", fontWeight: "800", color: COLORS.navy }}>Impossible de charger la preuve médicale.</span>
              <span style={{ fontSize: "0.85rem", color: "#64748B", maxWidth: "400px" }}>
                Le document demandé est indisponible ou l'accès sécurisé n'a pas pu être validé.
              </span>
              <button
                onClick={loadUrl}
                style={{
                  marginTop: "8px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  backgroundColor: COLORS.navy,
                  color: "white",
                  fontSize: "0.85rem",
                  fontWeight: "700",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                <RefreshCw size={14} /> Réessayer
              </button>
            </div>
          ) : isPdf ? (
            <iframe
              src={resolvedUrl}
              title="Preuve Médicale PDF"
              style={{ width: "100%", height: "550px", borderRadius: "12px", border: `1px solid ${COLORS.border}` }}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", width: "100%" }}>
              <img
                src={resolvedUrl}
                alt="Preuve médicale"
                onError={() => setError(true)}
                style={{ maxWidth: "100%", maxHeight: "520px", borderRadius: "12px", objectFit: "contain", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
