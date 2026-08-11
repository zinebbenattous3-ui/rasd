import React, { useEffect, useRef } from "react";

export type RadarState = 'idle' | 'focus-email' | 'focus-password' | 'loading' | 'success' | 'error';

interface MedicalRadarCanvasProps {
  state: RadarState;
  loadingStep?: string;
}

interface Blip {
  x: number;
  y: number;
  r: number;
  maxR: number;
  alpha: number;
  label: string;
  color: string;
}

export function MedicalRadarCanvas({ state }: MedicalRadarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let angle = 0;

    // Responsive scaling
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

    // Dynamic blips pool
    const blips: Blip[] = [
      { x: -0.3, y: 0.25, r: 2, maxR: 12, alpha: 0.8, label: "FACILITY", color: "#0fa29b" },
      { x: 0.45, y: -0.35, r: 2, maxR: 10, alpha: 0.9, label: "EVENT", color: "#38bdf8" },
      { x: 0.2, y: 0.5, r: 2, maxR: 14, alpha: 0.7, label: "DOCTOR", color: "#818cf8" },
      { x: -0.5, y: -0.2, r: 2, maxR: 16, alpha: 0.65, label: "PATIENT", color: "#34d399" }
    ];

    let pulseRadius = 0;

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.38;

      ctx.clearRect(0, 0, width, height);

      // Determine animation attributes based on state
      let sweepSpeed = 0.015;
      let sweepColor = "rgba(15, 162, 155, ";
      let ringColor = "rgba(15, 162, 155, 0.15)";
      let axisColor = "rgba(255, 255, 255, 0.12)";

      if (state === 'focus-email') {
        sweepSpeed = 0.025;
        sweepColor = "rgba(56, 189, 248, ";
        ringColor = "rgba(56, 189, 248, 0.25)";
      } else if (state === 'focus-password') {
        sweepSpeed = 0.012;
        sweepColor = "rgba(129, 140, 248, ";
        ringColor = "rgba(129, 140, 248, 0.22)";
      } else if (state === 'loading') {
        sweepSpeed = 0.045;
        sweepColor = "rgba(15, 162, 155, ";
        ringColor = "rgba(15, 162, 155, 0.35)";
      } else if (state === 'success') {
        sweepSpeed = 0.005;
        sweepColor = "rgba(52, 211, 153, ";
        ringColor = "rgba(52, 211, 153, 0.4)";
      } else if (state === 'error') {
        sweepSpeed = 0.02;
        sweepColor = "rgba(248, 113, 113, ";
        ringColor = "rgba(248, 113, 113, 0.3)";
      }

      angle += sweepSpeed;
      if (angle >= Math.PI * 2) angle = 0;

      // 1. Background Grid & Nodes Constellation
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 1;

      // Concentric Rings
      const ringRatios = [0.25, 0.5, 0.75, 1];
      ringRatios.forEach((ratio) => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * ratio, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Crosshairs & Degree ticks
      ctx.strokeStyle = axisColor;
      ctx.beginPath();
      ctx.moveTo(centerX - radius - 15, centerY);
      ctx.lineTo(centerX + radius + 15, centerY);
      ctx.moveTo(centerX, centerY - radius - 15);
      ctx.lineTo(centerX, centerY + radius + 15);
      ctx.stroke();

      // Sub-diagonal grid ticks
      const diagDist = radius * 0.9;
      ctx.beginPath();
      ctx.moveTo(centerX - diagDist, centerY - diagDist);
      ctx.lineTo(centerX + diagDist, centerY + diagDist);
      ctx.moveTo(centerX + diagDist, centerY - diagDist);
      ctx.lineTo(centerX - diagDist, centerY + diagDist);
      ctx.stroke();

      // 2. Rotating Radar Sweep (Trailing Gradient Arc)
      const sweepAngle = Math.PI / 3; // 60 degrees
      const gradient = ctx.createConicalGradient
        ? ctx.createConicalGradient(angle, centerX, centerY)
        : null;

      if (gradient) {
        gradient.addColorStop(0, `${sweepColor}0.45)`);
        gradient.addColorStop(0.15, `${sweepColor}0.15)`);
        gradient.addColorStop(0.3, `${sweepColor}0.02)`);
        gradient.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Fallback arc sweep
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, angle - sweepAngle, angle);
        ctx.fillStyle = `${sweepColor}0.2)`;
        ctx.fill();
        ctx.restore();
      }

      // Sweep Leading Edge Line
      ctx.strokeStyle = `${sweepColor}0.95)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius
      );
      ctx.stroke();

      // 3. Network Constellation Connections
      ctx.strokeStyle = "rgba(15, 162, 155, 0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < blips.length; i++) {
        const b1 = blips[i];
        const p1X = centerX + b1.x * radius;
        const p1Y = centerY + b1.y * radius;
        for (let j = i + 1; j < blips.length; j++) {
          const b2 = blips[j];
          const p2X = centerX + b2.x * radius;
          const p2Y = centerY + b2.y * radius;
          ctx.moveTo(p1X, p1Y);
          ctx.lineTo(p2X, p2Y);
        }
      }
      ctx.stroke();

      // 4. Detection Points & Expanding Ripples
      blips.forEach((b) => {
        const px = centerX + b.x * radius;
        const py = centerY + b.y * radius;

        // Calculate angle relative to radar sweep
        const blipAngle = Math.atan2(b.y, b.x) + Math.PI;
        const angleDiff = Math.abs((angle % (Math.PI * 2)) - blipAngle);

        if (angleDiff < 0.3) {
          b.r += 0.4;
          if (b.r > b.maxR) b.r = 2;
        }

        // Ripple ring
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = Math.max(0, 1 - b.r / b.maxR);
        ctx.beginPath();
        ctx.arc(px, py, b.r * 1.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Core Point
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();

        // Label tag
        ctx.font = "9px system-ui, monospace";
        ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
        ctx.fillText(b.label, px + 8, py + 3);
      });

      // 5. Center Heartbeat Medical Pulse (◉)
      pulseRadius += (state === 'loading' ? 0.8 : 0.4);
      if (pulseRadius > 18) pulseRadius = 4;

      ctx.strokeStyle = state === 'error' ? '#f87171' : state === 'success' ? '#34d399' : '#0fa29b';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 1 - pulseRadius / 18;
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.fillStyle = state === 'error' ? '#ef4444' : state === 'success' ? '#10b981' : '#0fa29b';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
      ctx.fill();

      // Outer bounding ring tick marks
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", setCanvasSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [state]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />

      {/* Overlay Status Badge */}
      <div
        style={{
          position: "absolute",
          bottom: "2rem",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "rgba(6, 44, 84, 0.85)",
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
            backgroundColor: state === 'error' ? '#ef4444' : state === 'success' ? '#10b981' : '#0fa29b',
            boxShadow: `0 0 10px ${state === 'error' ? '#ef4444' : state === 'success' ? '#10b981' : '#0fa29b'}`,
            animation: "pulse 1.5s infinite"
          }}
        />
        <span style={{ fontWeight: "700", textTransform: "uppercase" }}>
          {state === 'idle' && 'SYSTEM OPERATIONAL • VEILLE ACTIVE'}
          {state === 'focus-email' && 'ACQUISITION D\'IDENTIFIANTS • CANAL SECURISE'}
          {state === 'focus-password' && 'PROTOCOLE CHIFFRE 256-BIT ACTIVE'}
          {state === 'loading' && 'AUTHENTIFICATION EN COURS...'}
          {state === 'success' && 'ACCES AUTORISE • REDIRECTION'}
          {state === 'error' && 'ECHEC AUTHENTIFICATION • ALERTE'}
        </span>
      </div>
    </div>
  );
}
