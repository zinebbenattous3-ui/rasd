import React, { useEffect, useRef } from "react";

export type NetworkState = 'initial' | 'email-entered' | 'role-selected' | 'validated' | 'error' | 'done';

interface MedicalNetworkCanvasProps {
  state: NetworkState;
  selectedRole?: string;
}

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  r: number;
  color: string;
  roleKey?: string;
  pulseRadius: number;
}

interface Signal {
  fromIndex: number;
  toIndex: number;
  progress: number; // 0 to 1
  speed: number;
  color: string;
}

export function MedicalNetworkCanvas({ state, selectedRole }: MedicalNetworkCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const setCanvasSize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = parent.clientWidth * dpr;
        canvas.height = parent.clientHeight * dpr;
        ctx.scale(dpr, dpr);
      }
    };
    setCanvasSize();
    window.addEventListener("resize", setCanvasSize);

    // Conceptual Nodes around central RASED hub
    const nodes: Node[] = [
      { id: "hub", label: "RASED HUB", x: 0, y: 0, r: 24, color: "#0fa29b", pulseRadius: 0 },
      { id: "doctor", label: "MÉDECIN", roleKey: "DOCTOR", x: -0.45, y: -0.35, r: 16, color: "#38bdf8", pulseRadius: 0 },
      { id: "patient", label: "PATIENT", roleKey: "PATIENT", x: 0.45, y: -0.35, r: 16, color: "#34d399", pulseRadius: 0 },
      { id: "facility", label: "ÉTABLISSEMENT", x: -0.45, y: 0.35, r: 16, color: "#818cf8", pulseRadius: 0 },
      { id: "authority", label: "AUTORITÉ", roleKey: "HEALTH_AUTHORITY", x: 0.45, y: 0.35, r: 16, color: "#fbbf24", pulseRadius: 0 },
      { id: "inspector", label: "INSPECTEUR", roleKey: "INSPECTOR", x: 0, y: -0.5, r: 14, color: "#f472b6", pulseRadius: 0 },
      { id: "event", label: "ÉVÉNEMENT", x: 0, y: 0.5, r: 14, color: "#a78bfa", pulseRadius: 0 },
    ];

    // Node connections
    const links = [
      [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
      [1, 3], [2, 4], [3, 6], [1, 5]
    ];

    // Dynamic signals along links
    const signals: Signal[] = [
      { fromIndex: 1, toIndex: 0, progress: 0.1, speed: 0.008, color: "#38bdf8" },
      { fromIndex: 0, toIndex: 2, progress: 0.4, speed: 0.009, color: "#34d399" },
      { fromIndex: 3, toIndex: 0, progress: 0.7, speed: 0.007, color: "#818cf8" },
      { fromIndex: 0, toIndex: 4, progress: 0.2, speed: 0.01, color: "#fbbf24" },
    ];

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const centerX = width / 2;
      const centerY = height / 2;
      const scale = Math.min(width, height) * 0.42;

      ctx.clearRect(0, 0, width, height);

      // 1. Draw Connection Lines
      ctx.lineWidth = state === 'done' ? 2 : 1.2;
      links.forEach(([from, to]) => {
        if (from === undefined || to === undefined) return;
        const n1 = nodes[from];
        const n2 = nodes[to];
        if (!n1 || !n2) return;

        const x1 = centerX + n1.x * scale;
        const y1 = centerY + n1.y * scale;
        const x2 = centerX + n2.x * scale;
        const y2 = centerY + n2.y * scale;

        ctx.strokeStyle = state === 'error' ? "rgba(248, 113, 113, 0.25)" : "rgba(15, 162, 155, 0.25)";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      // 2. Animate Signal Particles
      let currentSpeedMultiplier = 1;
      if (state === 'email-entered') currentSpeedMultiplier = 1.6;
      if (state === 'done') currentSpeedMultiplier = 2.2;

      signals.forEach((s) => {
        const n1 = nodes[s.fromIndex];
        const n2 = nodes[s.toIndex];
        if (!n1 || !n2) return;

        s.progress += s.speed * currentSpeedMultiplier;
        if (s.progress > 1) s.progress = 0;

        const p1X = centerX + n1.x * scale;
        const p1Y = centerY + n1.y * scale;
        const p2X = centerX + n2.x * scale;
        const p2Y = centerY + n2.y * scale;

        const sx = p1X + (p2X - p1X) * s.progress;
        const sy = p1Y + (p2Y - p1Y) * s.progress;

        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Draw Nodes & Highlight Active Roles
      nodes.forEach((n) => {
        const nx = centerX + n.x * scale;
        const ny = centerY + n.y * scale;
        const isSelected = selectedRole && n.roleKey === selectedRole.toUpperCase();

        // Pulse radius animation
        n.pulseRadius += 0.3;
        if (n.pulseRadius > (isSelected ? 22 : 12)) n.pulseRadius = 2;

        ctx.strokeStyle = isSelected ? "#0fa29b" : n.color;
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.globalAlpha = 1 - n.pulseRadius / (isSelected ? 22 : 12);
        ctx.beginPath();
        ctx.arc(nx, ny, n.r + n.pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Core Node Circle
        ctx.fillStyle = isSelected ? "#0fa29b" : (n.id === "hub" ? "#062C54" : "rgba(6, 44, 84, 0.9)");
        ctx.strokeStyle = isSelected ? "#38bdf8" : n.color;
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.beginPath();
        ctx.arc(nx, ny, isSelected ? n.r + 4 : n.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Node Label
        ctx.font = isSelected ? "bold 11px system-ui, sans-serif" : "10px system-ui, sans-serif";
        ctx.fillStyle = isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.75)";
        ctx.textAlign = "center";
        ctx.fillText(n.label, nx, ny + n.r + 14);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", setCanvasSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, selectedRole]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />

      {/* Overlay Status Badge */}
      <div
        style={{
          position: "absolute",
          bottom: "1.5rem",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "rgba(6, 44, 84, 0.88)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(15, 162, 155, 0.3)",
          borderRadius: "999px",
          padding: "6px 16px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "0.75rem",
          color: "white",
          letterSpacing: "0.05em",
          boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: state === 'error' ? '#ef4444' : state === 'done' ? '#10b981' : '#0fa29b',
            boxShadow: `0 0 10px ${state === 'error' ? '#ef4444' : state === 'done' ? '#10b981' : '#0fa29b'}`,
            animation: "pulse 1.5s infinite"
          }}
        />
        <span style={{ fontWeight: "700", textTransform: "uppercase" }}>
          {state === 'initial' && 'RESEAU OPERATIONNEL • CONNEXION NATIONALE'}
          {state === 'email-entered' && 'VERIFICATION DU CANAL EN COURS...'}
          {state === 'role-selected' && `PROFIL SELECTIONNE : ${selectedRole || 'ACTEUR DE SANTE'}`}
          {state === 'validated' && 'INFORMATIONS VALIDEES ✓'}
          {state === 'error' && 'CORRECTION REQUISE'}
          {state === 'done' && 'RATTACHEMENT AU RESEAU COMPLETE ✓'}
        </span>
      </div>
    </div>
  );
}
