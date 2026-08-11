import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Login } from "@/components/Login";
import { supabase } from "@/lib/supabase";
import { 
  Clock, 
  XCircle, 
  CheckCircle2, 
  Building2, 
  Mail, 
  Phone, 
  HelpCircle, 
  ArrowLeft,
  ShieldAlert
} from "lucide-react";

const COLORS = {
  navy: "#062C54",
  teal: "#0fa29b",
  lightTeal: "#e6f5f4",
  text: "#2d3748",
  muted: "#718096",
  border: "#e2e8f0",
};

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Connexion — Rased" },
      {
        name: "description",
        content:
          "Accédez à l'espace professionnel Rased : alertes en direct, couverture par wilaya et suivi des événements sanitaires déclarés.",
      },
      { property: "og:title", content: "Connexion — Rased" },
      {
        property: "og:description",
        content: "Espace professionnel du réseau national de veille sanitaire.",
      },
    ],
  }),
  component: LoginPage,
});

import { useEffect } from "react";
import { validateCurrentSession, getRoleDashboardPath } from "@/lib/auth";
import { MedicalRadarCanvas, type RadarState } from "@/components/medical/MedicalRadarCanvas";
import { Activity, ShieldCheck, Cpu } from "lucide-react";

function LoginPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<null | { role: string; demo: boolean }>(null);
  const [radarState, setRadarState] = useState<RadarState>('idle');
  const [loadingStepText, setLoadingStepText] = useState<string>('');
  
  // Doctor verification status state
  const [doctorState, setDoctorState] = useState<null | {
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    doctor: any;
    latestActionMessage?: string;
  }>(null);

  // Redirect if user is already authenticated
  useEffect(() => {
    const checkExistingAuth = async () => {
      const authResult = await validateCurrentSession();
      if (authResult.authorized && authResult.user) {
        const dest = getRoleDashboardPath(authResult.user.role);
        navigate({ to: dest as any });
      }
    };
    checkExistingAuth();
  }, []);

  const handleStateChange = (state: RadarState, text?: string) => {
    setRadarState(state);
    if (text) setLoadingStepText(text);
  };

  const handleAuthenticated = async (role: string, userDetails?: { id?: string; email?: string }, demo = false) => {
    const normRole = role.toUpperCase();
    
    if (normRole === "SUPERADMIN") {
      navigate({ to: "/superadmin" });
      return;
    } 
    
    if (normRole === "HEALTH_AUTHORITY") {
      navigate({ to: "/health-authority" });
      return;
    }

    if (normRole === "DOCTOR" && userDetails?.id) {
      try {
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
          .eq('user_id', userDetails.id)
          .maybeSingle();

        if (docData) {
          let latestMessage = "";
          try {
            const { data: actionLogs } = await supabase
              .from('doctor_verification_actions')
              .select('message')
              .eq('doctor_id', docData.id)
              .order('created_at', { ascending: false })
              .limit(1);

            if (actionLogs && actionLogs.length > 0 && actionLogs[0]) {
              latestMessage = actionLogs[0].message || "";
            }
          } catch (logErr) {}

          if (docData.status === 'ACCEPTED') {
            navigate({ to: "/doctor" });
            return;
          }

          if (docData.status === 'PENDING') {
            setDoctorState({
              status: 'PENDING',
              doctor: docData,
              latestActionMessage: latestMessage
            });
            return;
          }

          if (docData.status === 'REJECTED') {
            setDoctorState({
              status: 'REJECTED',
              doctor: docData,
              latestActionMessage: latestMessage
            });
            return;
          }
        }
      } catch (err) {
        console.error("Error verifying doctor status on login:", err);
      }
    }

    setSession({ role, demo });
  };

  // 1. Render Doctor Pending Verification Screen
  if (doctorState?.status === 'PENDING') {
    const doc = doctorState.doctor;
    return (
      <div className="site">
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 140px)", backgroundColor: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
          <div style={{ backgroundColor: "white", borderRadius: "24px", maxWidth: "600px", width: "100%", padding: "40px", boxShadow: "0 20px 40px rgba(0,0,0,0.06)", border: `1px solid ${COLORS.border}` }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "#FEF3C7", color: "#D97706", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
              <Clock size={32} />
            </div>

            <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: COLORS.navy, marginBottom: "12px" }}>
              Vérification de compte en cours
            </h2>

            <p style={{ fontSize: "0.98rem", color: COLORS.text, lineHeight: "1.6", marginBottom: "24px" }}>
              Votre compte médecin a été enregistré avec succès. Cependant, votre profil professionnel est actuellement <strong>en attente de vérification</strong> par l'autorité de santé responsable de votre établissement.
            </p>

            <div style={{ backgroundColor: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: "14px", padding: "16px", marginBottom: "24px" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "#B45309", textTransform: "uppercase", letterSpacing: "0.05em" }}>Statut Actuel</div>
              <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#D97706", marginTop: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#D97706" }} />
                En attente de vérification
              </div>

              {doctorState.latestActionMessage && (
                <div style={{ marginTop: "10px", fontSize: "0.88rem", color: "#92400E", borderTop: "1px solid #FDE68A", paddingTop: "8px" }}>
                  <strong>Note de l'autorité :</strong> "{doctorState.latestActionMessage}"
                </div>
              )}
            </div>

            {doc.facility && (
              <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: "14px", padding: "18px", marginBottom: "24px", backgroundColor: "#F8FAFC" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: "700", color: COLORS.navy, marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Building2 size={16} color={COLORS.teal} /> Établissement de rattachement
                </div>
                <div style={{ fontWeight: "700", color: COLORS.navy }}>{doc.facility.name}</div>
                <div style={{ fontSize: "0.85rem", color: COLORS.muted }}>{doc.facility.facility_type} • Wilaya de {doc.facility.wilaya}</div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "0.85rem", color: COLORS.muted, display: "flex", alignItems: "center", gap: "6px" }}>
                <HelpCircle size={16} /> Besoin d'assistance ? Contactez l'autorité de santé compétente pour votre établissement.
              </div>

              <button
                onClick={() => setDoctorState(null)}
                style={{
                  marginTop: "8px",
                  padding: "12px 20px",
                  borderRadius: "10px",
                  border: `1px solid ${COLORS.border}`,
                  backgroundColor: "white",
                  color: COLORS.navy,
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px"
                }}
              >
                <ArrowLeft size={16} /> Retour à la connexion
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // 2. Render Doctor Rejected Screen
  if (doctorState?.status === 'REJECTED') {
    const doc = doctorState.doctor;
    return (
      <div className="site">
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 140px)", backgroundColor: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
          <div style={{ backgroundColor: "white", borderRadius: "24px", maxWidth: "600px", width: "100%", padding: "40px", boxShadow: "0 20px 40px rgba(0,0,0,0.06)", border: `1px solid #FECACA` }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "#FEE2E2", color: "#DC2626", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
              <XCircle size={32} />
            </div>

            <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#991B1B", marginBottom: "12px" }}>
              Compte Médecin Non Approuvé
            </h2>

            <p style={{ fontSize: "0.98rem", color: COLORS.text, lineHeight: "1.6", marginBottom: "24px" }}>
              Votre demande d'inscription à la plateforme n'a pas été approuvée par l'autorité de santé responsable.
            </p>

            <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "14px", padding: "18px", marginBottom: "24px" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "#991B1B", textTransform: "uppercase", letterSpacing: "0.05em" }}>Statut de l'inscription</div>
              <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#DC2626", marginTop: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#DC2626" }} />
                Demande Rejetée
              </div>

              {doctorState.latestActionMessage ? (
                <div style={{ marginTop: "12px", fontSize: "0.9rem", color: "#7F1D1D", backgroundColor: "white", padding: "12px", borderRadius: "8px", border: "1px solid #FECACA" }}>
                  <strong>Motif spécifié par l'autorité :</strong>
                  <div style={{ marginTop: "4px", fontStyle: "italic" }}>"{doctorState.latestActionMessage}"</div>
                </div>
              ) : (
                <div style={{ marginTop: "8px", fontSize: "0.85rem", color: "#991B1B" }}>
                  Veuillez contacter l'autorité de santé responsable de votre établissement pour obtenir des explications ou soumettre une nouvelle demande.
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button
                onClick={() => alert("Veuillez contacter la Direction de la Santé (DSP) de votre wilaya de rattachement.")}
                style={{
                  padding: "14px 20px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: COLORS.navy,
                  color: "white",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px"
                }}
              >
                <Mail size={18} /> Contacter l'Autorité de Santé
              </button>

              <button
                onClick={() => setDoctorState(null)}
                style={{
                  padding: "12px 20px",
                  borderRadius: "10px",
                  border: `1px solid ${COLORS.border}`,
                  backgroundColor: "white",
                  color: COLORS.navy,
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px"
                }}
              >
                <ArrowLeft size={16} /> Retour à la connexion
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // 3. Render Session Placeholder if logged in
  if (session) {
    return (
      <div className="site">
        <Navbar />
        <main style={{ display: "flex", minHeight: "calc(100vh - 140px)" }}>
          <div style={{ flex: 1, backgroundColor: COLORS.navy, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <h2>Bienvenue, {session.role}</h2>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="site">
      <Navbar />
      <main
        style={{
          display: "flex",
          minHeight: "calc(100vh - 140px)",
          width: "100%",
          fontFamily: "'Inter', sans-serif",
          backgroundColor: "#F8FAFC"
        }}
      >
        {/* Left Panel: Medical Radar Visual Identity */}
        <div
          className="hidden md:flex"
          style={{
            flex: "1.1",
            backgroundColor: COLORS.navy,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "3rem",
            overflow: "hidden",
            borderRight: "1px solid rgba(255,255,255,0.08)"
          }}
        >
          {/* Top Medical Identity Badge */}
          <div style={{ zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: COLORS.teal, color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Activity size={22} />
              </div>
              <span style={{ fontSize: "1.4rem", fontWeight: "900", color: "white", letterSpacing: "0.04em" }}>
                RASED <span style={{ color: COLORS.teal, fontWeight: "400" }}>RADAR</span>
              </span>
            </div>
            <p style={{ fontSize: "0.88rem", color: "#94A3B8", letterSpacing: "0.02em" }}>
              Réseau National de Surveillance et de Veille Épidémiologique
            </p>
          </div>

          {/* Center Canvas Radar Visualization */}
          <div style={{ flex: 1, position: "relative", margin: "1rem 0", minHeight: "360px" }}>
            <MedicalRadarCanvas state={radarState} loadingStep={loadingStepText} />
          </div>

          {/* Bottom Technical Status Bar */}
          <div style={{ zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1.2rem", fontSize: "0.78rem", color: "#94A3B8" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Cpu size={14} color={COLORS.teal} /> ALGERIA HEALTH INTELLIGENCE NETWORK
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <ShieldCheck size={14} color="#38BDF8" /> SHA-256 ENCRYPTED NODE
            </div>
          </div>
        </div>

        {/* Right Panel: Clean Interactive Login Form */}
        <div
          style={{
            flex: "1",
            backgroundColor: "#ffffff",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "2.5rem 1.5rem",
            position: "relative",
          }}
        >
          <div style={{ width: "100%", maxWidth: "440px" }}>
            <Login onAuthenticated={handleAuthenticated} onStateChange={handleStateChange} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
