import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { validateCurrentSession } from "@/lib/auth";
import { normalizeWilayaCode } from "@/lib/wilayas";
import { formatDateTime } from "@/lib/utils";
import { isPrivateClinic } from "@/lib/facilities";
import { 
  FileCheck, 
  Search, 
  Filter, 
  Building2, 
  Stethoscope, 
  Clock, 
  Check, 
  X, 
  Lock, 
  MapPin, 
  RefreshCw, 
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  History
} from "lucide-react";

export const Route = createFileRoute("/inspector/requests")({
  head: () => ({
    meta: [
      { title: "Centre de Validation & Demandes — Inspectorat Rased" },
    ],
  }),
  component: InspectorRequestsPage,
});

const COLORS = {
  navy: "#062C54",
  teal: "#0fa29b",
  lightTeal: "#e6f5f4",
  text: "#2d3748",
  muted: "#718096",
  border: "#e2e8f0",
  bgLight: "#f8fafc"
};

export function InspectorRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [inspectorWilaya, setInspectorWilaya] = useState<string | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  
  // Active Tab: ALL_PENDING, DOCTORS_ONLY, CLINICS_ONLY, HISTORY
  const [activeTab, setActiveTab] = useState<"ALL_PENDING" | "DOCTORS_ONLY" | "CLINICS_ONLY" | "HISTORY">("ALL_PENDING");

  // Rejection Modal State
  const [rejectingDoctor, setRejectingDoctor] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processingAction, setProcessingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const authResult = await validateCurrentSession(["INSPECTOR"]);
      if (!authResult.authorized || !authResult.user) return;

      // 1. Fetch Inspector Wilaya
      const { data: inspRec } = await supabase
        .from("inspectors")
        .select("wilaya")
        .eq("user_id", authResult.user.id)
        .maybeSingle();

      if (inspRec?.wilaya) {
        setInspectorWilaya(inspRec.wilaya);
        const normCode = normalizeWilayaCode(inspRec.wilaya);

        // 2. Fetch Facilities in Inspector's Wilaya strictly
        const { data: facsData } = await supabase
          .from("facilities")
          .select("*")
          .ilike("wilaya", `%${normCode}%`);

        const facList = facsData || [];
        const facIds = facList.map(f => f.id);

        let docsData: any[] = [];
        if (facIds.length > 0) {
          // 3. Fetch Doctors attached to facilities in this Wilaya
          const { data: fetchDocs } = await supabase
            .from("doctors")
            .select(`
              *,
              users:user_id (first_name, last_name, email),
              facility:facility_id (id, name, facility_type, wilaya, address)
            `)
            .in("facility_id", facIds)
            .order("created_at", { ascending: false });

          docsData = fetchDocs || [];
        }

        // 4. Fetch Unlisted Private Clinic Requests for this Wilaya
        let formattedUnlisted: any[] = [];
        try {
          const { data: unlistedReqs } = await supabase
            .from("unlisted_clinic_requests")
            .select(`
              *,
              users:user_id (id, first_name, last_name, email)
            `)
            .ilike("wilaya", `%${normCode}%`)
            .order("created_at", { ascending: false });

          if (unlistedReqs) {
            formattedUnlisted = unlistedReqs.map((u) => ({
              id: u.id,
              is_unlisted_clinic_req: true,
              status: u.status === 'APPROVED' ? 'ACCEPTED' : u.status,
              created_at: u.created_at,
              specialty: u.specialty,
              nin: u.nin,
              phone: u.phone,
              order_number: u.order_number,
              users: u.users ? {
                first_name: u.users.first_name,
                last_name: u.users.last_name,
                email: u.users.email
              } : null,
              facility: {
                id: null,
                name: u.clinic_name,
                facility_type: u.facility_type || 'Clinique privée',
                wilaya: u.wilaya,
                address: u.address || 'Adresse non renseignée'
              },
              raw: u
            }));
          }
        } catch (unlistedErr) {
          console.warn("unlisted_clinic_requests table query deferred:", unlistedErr);
        }

        // Merge standard doctor requests and unlisted clinic requests
        const combined = [...formattedUnlisted, ...docsData].sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );

        setRequests(combined);
      }
    } catch (err) {
      console.error("Error loading requests for inspector:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // Handle Accept Doctor / Clinic Request
  const handleAcceptRequest = async (doc: any) => {
    setProcessingAction(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      if (doc.is_unlisted_clinic_req) {
        const raw = doc.raw;
        const authResult = await validateCurrentSession(["INSPECTOR"]);

        // 1. Create or retrieve existing private clinic facility
        let facilityId: string | null = null;
        const { data: existingFac } = await supabase
          .from("facilities")
          .select("id")
          .eq("name", raw.clinic_name.trim())
          .eq("facility_type", "Clinique privée")
          .maybeSingle();

        if (existingFac) {
          facilityId = existingFac.id;
        } else {
          const { data: newFac, error: facErr } = await supabase
            .from("facilities")
            .insert([{
              name: raw.clinic_name.trim(),
              facility_type: "Clinique privée",
              wilaya: raw.wilaya,
              address: raw.address || "Adresse non renseignée",
              created_by: authResult.user?.id
            }])
            .select("id")
            .single();

          if (facErr || !newFac) throw new Error("Erreur lors de l'enregistrement de la clinique privée.");
          facilityId = newFac.id;
        }

        // 2. Link or create doctor record linked to user_id and new facility_id
        const userId = raw.user_id;
        const { data: existingDoc } = await supabase
          .from("doctors")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (!existingDoc) {
          const { error: docErr } = await supabase
            .from("doctors")
            .insert([{
              user_id: userId,
              nin: raw.nin,
              specialty: raw.specialty,
              facility_id: facilityId,
              order_number: raw.order_number,
              phone: raw.phone,
              status: "ACCEPTED",
              verified_by_facility: facilityId,
              verified_at: new Date().toISOString()
            }]);

          if (docErr) throw new Error(docErr.message || "Erreur lors de la création du profil médecin.");
        } else {
          await supabase
            .from("doctors")
            .update({
              facility_id: facilityId,
              order_number: raw.order_number,
              status: "ACCEPTED",
              verified_by_facility: facilityId,
              verified_at: new Date().toISOString()
            })
            .eq("id", existingDoc.id);
        }

        // 3. Mark unlisted clinic request as APPROVED
        await supabase
          .from("unlisted_clinic_requests")
          .update({
            status: "APPROVED",
            reviewed_by: authResult.user?.id,
            reviewed_at: new Date().toISOString()
          })
          .eq("id", raw.id);

        const docName = raw.users ? `${raw.users.first_name} ${raw.users.last_name}` : "Médecin";
        setActionSuccess(`La clinique privée "${raw.clinic_name}" et Dr. ${docName} ont été validés et homologués avec succès.`);
        await loadRequests();
        return;
      }

      // Existing doctor status update
      const { error } = await supabase
        .from("doctors")
        .update({
          status: "ACCEPTED",
          verified_by_facility: doc.facility_id || null,
          verified_at: new Date().toISOString()
        })
        .eq("id", doc.id);

      if (error) throw error;

      setActionSuccess(`La demande du Dr. ${doc.users?.first_name} ${doc.users?.last_name} a été acceptée avec succès.`);
      await loadRequests();
    } catch (err: any) {
      setActionError(err.message || "Erreur lors de la validation de la demande.");
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle Reject Doctor Request
  const handleConfirmReject = async () => {
    if (!rejectingDoctor) return;
    if (!rejectReason.trim()) {
      setActionError("Veuillez spécifier le motif du refus.");
      return;
    }

    setProcessingAction(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      if (rejectingDoctor.is_unlisted_clinic_req) {
        const raw = rejectingDoctor.raw;
        const authResult = await validateCurrentSession(["INSPECTOR"]);

        await supabase
          .from("unlisted_clinic_requests")
          .update({
            status: "REJECTED",
            reviewed_by: authResult.user?.id,
            reviewed_at: new Date().toISOString(),
            rejection_reason: rejectReason
          })
          .eq("id", raw.id);

        setActionSuccess(`La demande d'homologation de la clinique "${raw.clinic_name}" a été refusée.`);
        setRejectingDoctor(null);
        setRejectReason("");
        await loadRequests();
        return;
      }

      const { error } = await supabase
        .from("doctors")
        .update({
          status: "REJECTED"
        })
        .eq("id", rejectingDoctor.id);

      if (error) throw error;

      setActionSuccess(`La demande du Dr. ${rejectingDoctor.users?.first_name} ${rejectingDoctor.users?.last_name} a été refusée.`);
      setRejectingDoctor(null);
      setRejectReason("");
      await loadRequests();
    } catch (err: any) {
      setActionError(err.message || "Erreur lors du refus de la demande.");
    } finally {
      setProcessingAction(false);
    }
  };

  // Filter requests according to active tab
  const pendingRequests = requests.filter(r => r.status === "PENDING");
  const historyRequests = requests.filter(r => r.status === "ACCEPTED" || r.status === "REJECTED");

  const displayedRequests = requests.filter(r => {
    if (activeTab === "ALL_PENDING") return r.status === "PENDING";
    if (activeTab === "DOCTORS_ONLY") return r.status === "PENDING" && !isPrivateClinic(r.facility?.facility_type);
    if (activeTab === "CLINICS_ONLY") return r.status === "PENDING" && isPrivateClinic(r.facility?.facility_type);
    if (activeTab === "HISTORY") return r.status === "ACCEPTED" || r.status === "REJECTED";
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", backgroundColor: "white", padding: "24px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: "#FEF3C7", color: "#B45309" }}>
              <FileCheck size={22} />
            </div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "900", color: COLORS.navy, margin: 0, letterSpacing: "-0.02em" }}>
              Centre de Validation & Demandes
            </h1>
          </div>
          <p style={{ fontSize: "0.88rem", color: COLORS.muted, margin: 0 }}>
            Instruction des dossiers d'inscription des médecins et homologation des cliniques privées.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#FEF3C7", color: "#B45309", border: "1px solid #FDE68A", padding: "8px 14px", borderRadius: "12px", fontSize: "0.85rem", fontWeight: "800" }}>
            <MapPin size={16} />
            <span>Wilaya {inspectorWilaya || "—"}</span>
            <Lock size={12} style={{ marginLeft: "2px" }} />
          </div>

          <button onClick={loadRequests} disabled={loading} style={{ background: "white", border: `1px solid ${COLORS.border}`, padding: "10px", borderRadius: "12px", cursor: "pointer", color: COLORS.navy }}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* FEEDBACK ALERTS */}
      {actionSuccess && (
        <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "12px 16px", borderRadius: "12px", fontSize: "0.88rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldCheck size={18} /> {actionSuccess}
        </div>
      )}
      {actionError && (
        <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "12px 16px", borderRadius: "12px", fontSize: "0.88rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldAlert size={18} /> {actionError}
        </div>
      )}

      {/* SECTION TABS */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: "12px" }}>
        <button
          onClick={() => setActiveTab("ALL_PENDING")}
          style={{
            padding: "10px 16px",
            borderRadius: "10px",
            border: "none",
            backgroundColor: activeTab === "ALL_PENDING" ? COLORS.navy : "transparent",
            color: activeTab === "ALL_PENDING" ? "white" : COLORS.muted,
            fontWeight: "700",
            fontSize: "0.88rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <Clock size={16} /> Demandes en attente ({pendingRequests.length})
        </button>

        <button
          onClick={() => setActiveTab("DOCTORS_ONLY")}
          style={{
            padding: "10px 16px",
            borderRadius: "10px",
            border: "none",
            backgroundColor: activeTab === "DOCTORS_ONLY" ? COLORS.navy : "transparent",
            color: activeTab === "DOCTORS_ONLY" ? "white" : COLORS.muted,
            fontWeight: "700",
            fontSize: "0.88rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <Stethoscope size={16} /> Secteur Public
        </button>

        <button
          onClick={() => setActiveTab("CLINICS_ONLY")}
          style={{
            padding: "10px 16px",
            borderRadius: "10px",
            border: "none",
            backgroundColor: activeTab === "CLINICS_ONLY" ? COLORS.navy : "transparent",
            color: activeTab === "CLINICS_ONLY" ? "white" : COLORS.muted,
            fontWeight: "700",
            fontSize: "0.88rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <Building2 size={16} /> Cliniques Privées
        </button>

        <button
          onClick={() => setActiveTab("HISTORY")}
          style={{
            padding: "10px 16px",
            borderRadius: "10px",
            border: "none",
            backgroundColor: activeTab === "HISTORY" ? COLORS.navy : "transparent",
            color: activeTab === "HISTORY" ? "white" : COLORS.muted,
            fontWeight: "700",
            fontSize: "0.88rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <History size={16} /> Historique ({historyRequests.length})
        </button>
      </div>

      {/* REQUESTS LIST CONTAINER */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {loading ? (
          <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, textAlign: "center", color: COLORS.muted }}>
            Chargement des demandes de validation...
          </div>
        ) : displayedRequests.length === 0 ? (
          <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, textAlign: "center" }}>
            <UserCheck size={40} color={COLORS.teal} style={{ margin: "0 auto 12px auto" }} />
            <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: COLORS.navy, margin: 0 }}>
              Aucune demande dans cette catégorie
            </h3>
            <p style={{ fontSize: "0.88rem", color: COLORS.muted, marginTop: "6px" }}>
              Tous les dossiers de la Wilaya {inspectorWilaya || ""} ont été traités.
            </p>
          </div>
        ) : (
          displayedRequests.map((req, idx) => {
            const isPrivate = isPrivateClinic(req.facility?.facility_type);
            const reqCode = `#REQ-${String(idx + 1).padStart(3, "0")}`;
            const isPending = req.status === "PENDING";

            return (
              <div
                key={req.id}
                style={{
                  backgroundColor: "white",
                  borderRadius: "18px",
                  border: `1.5px solid ${isPending ? "#FDE68A" : COLORS.border}`,
                  boxShadow: isPending ? "0 4px 20px rgba(180, 83, 9, 0.05)" : "0 2px 10px rgba(0,0,0,0.02)",
                  padding: "24px"
                }}
              >
                {/* REQUEST CARD HEADER */}
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: "14px", marginBottom: "18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "0.88rem", fontWeight: "900", color: COLORS.navy, backgroundColor: COLORS.bgLight, padding: "4px 10px", borderRadius: "8px", border: `1px solid ${COLORS.border}` }}>
                      {reqCode}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: COLORS.muted }}>
                      Soumis le {req.created_at ? formatDateTime(req.created_at) : "Date non spécifiée"}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: "800",
                      padding: "4px 12px",
                      borderRadius: "8px",
                      backgroundColor: req.status === "ACCEPTED" ? "#f0fdf4" : req.status === "REJECTED" ? "#fef2f2" : "#fefce8",
                      color: req.status === "ACCEPTED" ? "#166534" : req.status === "REJECTED" ? "#991b1b" : "#854d0e",
                      border: `1px solid ${req.status === "ACCEPTED" ? "#bbf7d0" : req.status === "REJECTED" ? "#fecaca" : "#fef08a"}`
                    }}
                  >
                    {req.status === "ACCEPTED" ? "Demande Acceptée" : req.status === "REJECTED" ? "Demande Refusée" : "En attente de vérification"}
                  </span>
                </div>

                {/* DUAL SIDE CONTENT: DOCTOR & FACILITY INFORMATION */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }} className="md:grid-cols-2">
                  
                  {/* LEFT COLUMN: DOCTOR INFO */}
                  <div style={{ backgroundColor: COLORS.bgLight, padding: "16px 20px", borderRadius: "14px", border: `1px solid ${COLORS.border}` }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: "900", color: COLORS.teal, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Stethoscope size={16} /> Information Médecin
                    </div>

                    <div style={{ fontSize: "1.1rem", fontWeight: "900", color: COLORS.navy }}>
                      Dr. {req.users?.first_name} {req.users?.last_name}
                    </div>

                    <div style={{ fontSize: "0.85rem", fontWeight: "700", color: COLORS.teal, marginTop: "2px" }}>
                      Spécialité: {req.specialty}
                    </div>

                    <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.82rem", color: COLORS.text }}>
                      <div>NIN: <strong>{req.nin || "Non renseigné"}</strong></div>
                      <div>Email: <strong>{req.users?.email || "Non renseigné"}</strong></div>
                      <div>Téléphone: <strong>{req.phone || "Non renseigné"}</strong></div>
                      {isPrivate && (
                        <div style={{ marginTop: "4px", backgroundColor: "white", padding: "6px 10px", borderRadius: "8px", border: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                          Numéro d'ordre des médecins: <strong>{req.order_number || "Non fourni"}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: FACILITY / CLINIC INFO */}
                  <div style={{ backgroundColor: COLORS.bgLight, padding: "16px 20px", borderRadius: "14px", border: `1px solid ${COLORS.border}` }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: "900", color: COLORS.navy, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Building2 size={16} /> Établissement demandé
                    </div>

                    <div style={{ fontSize: "1.1rem", fontWeight: "900", color: COLORS.navy }}>
                      {req.facility?.name || "Clinique ou Établissement"}
                    </div>

                    <div style={{ fontSize: "0.85rem", fontWeight: "700", color: isPrivate ? "#0fa29b" : COLORS.navy, marginTop: "2px" }}>
                      Type: {req.facility?.facility_type || "Clinique privée"}
                    </div>

                    <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.82rem", color: COLORS.text }}>
                      <div>Wilaya: <strong>{req.facility?.wilaya || inspectorWilaya}</strong></div>
                      <div>Adresse: <strong>{req.facility?.address || "Adresse non renseignée"}</strong></div>
                      <div style={{ marginTop: "4px", fontSize: "0.78rem", color: COLORS.muted }}>
                        Rattachement territorial sous la juridiction de la Wilaya {inspectorWilaya}
                      </div>
                    </div>
                  </div>

                </div>

                {/* REVIEW ACTION BUTTONS FOR PENDING REQUESTS */}
                {isPending && (
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px", paddingTop: "16px", borderTop: `1px solid ${COLORS.border}` }}>
                    <button
                      onClick={() => setRejectingDoctor(req)}
                      disabled={processingAction}
                      style={{
                        backgroundColor: "#fef2f2",
                        color: "#991b1b",
                        border: "1px solid #fecaca",
                        padding: "10px 20px",
                        borderRadius: "10px",
                        fontWeight: "700",
                        fontSize: "0.88rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <X size={16} /> Refuser
                    </button>

                    <button
                      onClick={() => handleAcceptRequest(req)}
                      disabled={processingAction}
                      style={{
                        backgroundColor: COLORS.teal,
                        color: "white",
                        border: "none",
                        padding: "10px 24px",
                        borderRadius: "10px",
                        fontWeight: "800",
                        fontSize: "0.88rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 4px 14px rgba(15, 162, 155, 0.3)"
                      }}
                    >
                      <Check size={16} /> Accepter
                    </button>
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

      {/* REJECTION CONFIRMATION MODAL */}
      {rejectingDoctor && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(6, 44, 84, 0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 50 }}>
          <div style={{ backgroundColor: "white", borderRadius: "20px", width: "100%", maxWidth: "480px", padding: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "900", color: "#991b1b", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertTriangle size={20} /> Refuser la demande
              </h3>
              <button onClick={() => setRejectingDoctor(null)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.muted }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: "0.88rem", color: COLORS.text, marginBottom: "14px" }}>
              Vous êtes sur le point de refuser la demande d'inscription de <strong>Dr. {rejectingDoctor.users?.first_name} {rejectingDoctor.users?.last_name}</strong> pour l'établissement <strong>{rejectingDoctor.facility?.name}</strong>.
            </p>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "700", color: COLORS.navy, marginBottom: "4px" }}>
                Motif du refus *
              </label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${COLORS.border}`, fontSize: "0.9rem", outline: "none", marginBottom: "8px" }}
              >
                <option value="">Sélectionner un motif...</option>
                <option value="Numéro d'ordre invalide ou non conforme">Numéro d'ordre invalide ou non conforme</option>
                <option value="Établissement non reconnu dans la Wilaya">Établissement non reconnu dans la Wilaya</option>
                <option value="Informations administratives erronées">Informations administratives erronées</option>
                <option value="Non-conformité de la spécialité médicale">Non-conformité de la spécialité médicale</option>
              </select>

              <textarea
                placeholder="Ou précisez le motif détaillé du refus..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${COLORS.border}`, fontSize: "0.88rem", outline: "none" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setRejectingDoctor(null)}
                disabled={processingAction}
                style={{ backgroundColor: COLORS.bgLight, color: COLORS.navy, border: `1px solid ${COLORS.border}`, padding: "10px 16px", borderRadius: "10px", fontWeight: "700", cursor: "pointer" }}
              >
                Annuler
              </button>

              <button
                onClick={handleConfirmReject}
                disabled={processingAction}
                style={{ backgroundColor: "#991b1b", color: "white", border: "none", padding: "10px 20px", borderRadius: "10px", fontWeight: "700", cursor: "pointer" }}
              >
                {processingAction ? "Enregistrement..." : "Confirmer le refus"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
