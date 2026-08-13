import React from "react";
import { Shield, RefreshCw } from "lucide-react";

const COLORS = {
  navy: "#062C54",
  teal: "#0fa29b",
  bgLight: "#f8fafc",
  muted: "#718096"
};

export function AuthLoadingScreen({ message = "Vérification de la session en cours..." }: { message?: string }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: COLORS.bgLight,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.25rem",
          padding: "2.5rem 3rem",
          backgroundColor: "white",
          borderRadius: "24px",
          boxShadow: "0 20px 40px -15px rgba(6, 44, 84, 0.08)",
          border: "1px solid #e2e8f0",
          maxWidth: "420px",
          width: "90%",
          textAlign: "center"
        }}
      >
        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "18px",
            backgroundColor: "#e6f5f4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: COLORS.teal,
            position: "relative"
          }}
        >
          <Shield size={32} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center" }}>
          <div
            style={{
              fontSize: "1.2rem",
              fontWeight: "800",
              color: COLORS.navy,
              letterSpacing: "-0.01em"
            }}
          >
            Rased Platform
          </div>
          <div
            style={{
              fontSize: "0.88rem",
              fontWeight: "500",
              color: COLORS.muted,
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <RefreshCw size={14} className="animate-spin" style={{ color: COLORS.teal }} />
            <span>{message}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
