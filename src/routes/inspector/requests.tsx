import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { validateCurrentSession } from "@/lib/auth";
import { 
  FileCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Lock, 
  Building2, 
  Stethoscope, 
  AlertCircle,
  Search
} from "lucide-react";

export const Route = createFileRoute("/inspector/requests")({
  head: () => ({
    meta: [
      { title: "Suivi des Demandes — Inspectorat Rased" },
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
  const [requests, setRequests] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadRequests = async () => {
    setLoading(true);
    try {
      const authResult = await validateCurrentSession(["INSPECTOR"]);
      if (!authResult.authorized || !authResult.user) return;

      // Query change requests
      const { data: reqData } = await supabase
        .from("doctor_facility_change_requests")
        .select(`
          *,
          doctor:doctor_id (
            specialty,
            users:user_id (first_name, last_name)
          ),
          current_facility:current_facility_id (name, wilaya),
          requested_facility:requested_facility_id (name, wilaya, facility_type)
        `)
        .order("created_at", { ascending: false });

      setRequests(reqData || []);
    } catch (err) {
      console.error("Error loading requests for inspector:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === "ALL") return true;
    return r.status === statusFilter;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: "900", color: COLORS.navy, letterSpacing: "-0.02em", margin: 0 }}>
            Suivi des Demandes Administratives
          </h1>
          <p style={{ color: COLORS.muted, fontSize: "0.92rem", marginTop: "4px" }}>
            Historique et statut des demandes d'affectations et modifications transmises au Superadmin.
          </p>
        </div>

        <button onClick={loadRequests} disabled={loading} style={{ background: "white", border: `1px solid ${COLORS.border}`, padding: "10px", borderRadius: "14px", cursor: "pointer", color: COLORS.navy }}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* STATUS FILTER TABS */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {[
          { key: "ALL", label: "Toutes les demandes" },
          { key: "PENDING", label: "En attente" },
          { key: "APPROVED", label: "Approuvées" },
          { key: "REJECTED", label: "Rejetées" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            style={{
              padding: "10px 18px",
              borderRadius: "12px",
              border: `1px solid ${statusFilter === tab.key ? COLORS.teal : COLORS.border}`,
              backgroundColor: statusFilter === tab.key ? COLORS.lightTeal : "white",
              color: statusFilter === tab.key ? COLORS.teal : COLORS.navy,
              fontWeight: "800",
              fontSize: "0.85rem",
              cursor: "pointer"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* REQUESTS LIST */}
      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: COLORS.navy }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 12px auto", color: COLORS.teal }} />
          <div style={{ fontWeight: "700" }}>Chargement des demandes...</div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, textAlign: "center", color: COLORS.muted }}>
          <FileCheck size={40} color={COLORS.muted} style={{ margin: "0 auto 12px auto" }} />
          <div style={{ fontSize: "1rem", fontWeight: "700", color: COLORS.navy }}>Aucune demande enregistrée</div>
          <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>Les demandes d'affectation soumises au Superadmin apparaîtront ici.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {filteredRequests.map((req) => {
            const docName = req.doctor?.users ? `Dr. ${req.doctor.users.first_name} ${req.doctor.users.last_name}` : "Praticien";
            const targetFac = req.requested_facility?.name || "Clinique / Établissement";

            return (
              <div
                key={req.id}
                style={{
                  backgroundColor: "white",
                  borderRadius: "18px",
                  border: `1px solid ${COLORS.border}`,
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.02)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "700", textTransform: "uppercase" }}>
                      Demande d'affectation médecin
                    </div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: COLORS.navy, margin: "4px 0 0 0" }}>
                      {docName} ➔ {targetFac}
                    </h3>
                    <div style={{ fontSize: "0.8rem", color: COLORS.muted, marginTop: "4px" }}>
                      Transmise le {new Date(req.created_at).toLocaleDateString("fr-FR")} à {new Date(req.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>

                  <div>
                    {req.status === "PENDING" && (
                      <span style={{ backgroundColor: "#FEF3C7", color: "#B45309", border: "1px solid #FCD34D", padding: "6px 14px", borderRadius: "999px", fontSize: "0.8rem", fontWeight: "800", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <Clock size={14} /> En attente de validation
                      </span>
                    )}

                    {req.status === "APPROVED" && (
                      <span style={{ backgroundColor: "#DCFCE7", color: "#15803D", border: "1px solid #86EFAC", padding: "6px 14px", borderRadius: "999px", fontSize: "0.8rem", fontWeight: "800", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <CheckCircle2 size={14} /> Approuvée
                      </span>
                    )}

                    {req.status === "REJECTED" && (
                      <span style={{ backgroundColor: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5", padding: "6px 14px", borderRadius: "999px", fontSize: "0.8rem", fontWeight: "800", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <XCircle size={14} /> Rejetée
                      </span>
                    )}
                  </div>
                </div>

                {req.reason && (
                  <div style={{ backgroundColor: COLORS.bgLight, padding: "12px 16px", borderRadius: "12px", border: `1px solid ${COLORS.border}`, fontSize: "0.85rem", color: COLORS.text }}>
                    <strong>Motif soumis:</strong> « {req.reason} »
                  </div>
                )}

                {req.status === "REJECTED" && req.review_message && (
                  <div style={{ backgroundColor: "#FEF2F2", padding: "12px 16px", borderRadius: "12px", border: "1px solid #FCA5A5", fontSize: "0.85rem", color: "#991B1B", fontWeight: "700" }}>
                    <strong>Motif du rejet (Superadmin):</strong> {req.review_message}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
