import React from "react";
import { Activity, ShieldCheck, MapPin, AlertTriangle, Building2 } from "lucide-react";

export function HeroNetworkVisual() {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "440px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Background Subtle Radar Grid */}
      <div 
        style={{ 
          position: "absolute", 
          inset: 0, 
          borderRadius: "24px", 
          background: "radial-gradient(circle at 50% 50%, rgba(15, 162, 155, 0.12) 0%, rgba(6, 44, 84, 0.4) 70%, rgba(6, 44, 84, 0.8) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(8px)",
          overflow: "hidden"
        }} 
      />

      {/* Radar Concentric Circles */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 500" aria-hidden="true" style={{ position: "absolute", width: "100%", height: "100%" }}>
        <circle cx="250" cy="250" r="80" fill="none" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx="250" cy="250" r="140" fill="none" stroke="rgba(15, 162, 155, 0.2)" strokeWidth="1" />
        <circle cx="250" cy="250" r="200" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" strokeDasharray="6 6" />

        {/* Radar Sweeping Line Animation */}
        <g style={{ transformOrigin: "250px 250px", animation: "radarSweep 8s linear infinite" }}>
          <line x1="250" y1="250" x2="250" y2="40" stroke="url(#radarGradient)" strokeWidth="2" />
        </g>

        {/* Connection Network Lines */}
        <line x1="250" y1="250" x2="140" y2="130" stroke="rgba(15, 162, 155, 0.3)" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="250" y1="250" x2="360" y2="160" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="250" y1="250" x2="160" y2="340" stroke="rgba(15, 162, 155, 0.3)" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="250" y1="250" x2="350" y2="330" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="1.5" strokeDasharray="3 3" />

        <defs>
          <linearGradient id="radarGradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="rgba(15, 162, 155, 0.1)" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
        </defs>
      </svg>

      {/* Central Node Badge */}
      <div 
        style={{ 
          position: "relative", 
          zIndex: 10, 
          width: "90px", 
          height: "90px", 
          borderRadius: "50%", 
          backgroundColor: "#062C54", 
          border: "3px solid #0fa29b", 
          display: "flex", 
          flexDirection: "column",
          alignItems: "center", 
          justifyContent: "center",
          boxShadow: "0 0 35px rgba(15, 162, 155, 0.4)",
          color: "white"
        }}
      >
        <Activity size={30} color="#38BDF8" style={{ animation: "pulseSlow 2.5s ease-in-out infinite" }} />
        <span style={{ fontSize: "0.68rem", fontWeight: "800", letterSpacing: "0.08em", color: "#38BDF8", marginTop: "4px" }}>
          RASED
        </span>
      </div>

      {/* Satellite Node 1: Wilaya d'Alger */}
      <div 
        style={{ 
          position: "absolute", 
          top: "18%", 
          left: "14%", 
          zIndex: 10,
          backgroundColor: "rgba(6, 44, 84, 0.85)", 
          border: "1px solid rgba(15, 162, 155, 0.4)",
          borderRadius: "14px",
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "white",
          boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
          backdropFilter: "blur(6px)",
          animation: "floatSlow 4s ease-in-out infinite"
        }}
      >
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10B981", boxShadow: "0 0 8px #10B981" }} />
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: "800", color: "#94A3B8" }}>Wilaya d'Alger</div>
          <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "white" }}>16 CHU / Polycliniques</div>
        </div>
      </div>

      {/* Satellite Node 2: Live Alert Badge */}
      <div 
        style={{ 
          position: "absolute", 
          top: "22%", 
          right: "10%", 
          zIndex: 10,
          backgroundColor: "rgba(6, 44, 84, 0.9)", 
          border: "1px solid rgba(245, 158, 11, 0.5)",
          borderRadius: "14px",
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "white",
          boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
          backdropFilter: "blur(6px)",
          animation: "floatSlow 5s ease-in-out infinite 1s"
        }}
      >
        <AlertTriangle size={16} color="#F59E0B" />
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: "800", color: "#F59E0B" }}>Surveillance Active</div>
          <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "white" }}>Fil d'alertes réactif</div>
        </div>
      </div>

      {/* Satellite Node 3: Wilaya d'Oran */}
      <div 
        style={{ 
          position: "absolute", 
          bottom: "18%", 
          left: "18%", 
          zIndex: 10,
          backgroundColor: "rgba(6, 44, 84, 0.85)", 
          border: "1px solid rgba(56, 189, 248, 0.4)",
          borderRadius: "14px",
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "white",
          boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
          backdropFilter: "blur(6px)",
          animation: "floatSlow 4.5s ease-in-out infinite 0.5s"
        }}
      >
        <Building2 size={16} color="#38BDF8" />
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: "800", color: "#94A3B8" }}>Wilaya d'Oran</div>
          <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "white" }}>Établissements connectés</div>
        </div>
      </div>

      {/* Satellite Node 4: Secure Data Node */}
      <div 
        style={{ 
          position: "absolute", 
          bottom: "15%", 
          right: "12%", 
          zIndex: 10,
          backgroundColor: "rgba(6, 44, 84, 0.9)", 
          border: "1px solid rgba(15, 162, 155, 0.5)",
          borderRadius: "14px",
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "white",
          boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
          backdropFilter: "blur(6px)",
          animation: "floatSlow 5.5s ease-in-out infinite 1.5s"
        }}
      >
        <ShieldCheck size={16} color="#0fa29b" />
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: "800", color: "#0fa29b" }}>NIN Interopérable</div>
          <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "white" }}>Identification sécurisée</div>
        </div>
      </div>

      <style>{`
        @keyframes radarSweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes pulseSlow {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
        @media (prefers-reduced-motion: reduce) {
          svg, div {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
