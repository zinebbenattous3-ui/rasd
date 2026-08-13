import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { validateCurrentSession } from "@/lib/auth";
import { normalizeWilayaCode } from "@/lib/wilayas";
import { MedicalProofModal } from "@/components/MedicalProofModal";
import { 
  Activity, 
  Search, 
  Filter, 
  Building2, 
  Eye, 
  RefreshCw, 
  Lock, 
  MapPin, 
  AlertTriangle, 
  X, 
  FileText, 
  Calendar,
  Image as ImageIcon
} from "lucide-react";

export const Route = createFileRoute("/inspector/health-events")({
  head: () => ({
    meta: [
      { title: "Événements de Santé — Inspectorat Rased" },
    ],
  }),
  component: InspectorHealthEventsPage,
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

function formatDateTime(isoString?: string): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} à ${hours}:${minutes}`;
  } catch {
    return isoString;
  }
}

export function InspectorHealthEventsPage() {
  const [loading, setLoading] = useState(true);
  const [inspectorWilaya, setInspectorWilaya] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const authResult = await validateCurrentSession(["INSPECTOR"]);
      if (!authResult.authorized || !authResult.user) return;

      const { data: inspRec } = await supabase
        .from("inspectors")
        .select("wilaya")
        .eq("user_id", authResult.user.id)
        .maybeSingle();

      if (inspRec?.wilaya) {
        setInspectorWilaya(inspRec.wilaya);
        const normCode = normalizeWilayaCode(inspRec.wilaya);

        const { data: facs } = await supabase
          .from("facilities")
          .select("id")
          .ilike("wilaya", `%${normCode}%`);

        const facIds = (facs || []).map(f => f.id);

        if (facIds.length > 0) {
          const { data: evData } = await supabase
            .from("health_events")
            .select(`
              *,
              facility:facility_id (id, name, facility_type, wilaya),
              reportable_diseases:reportable_disease_id (name, code),
              doctor:doctor_id (
                specialty,
                users:user_id (first_name, last_name, email)
              )
            `)
            .in("facility_id", facIds)
            .order("created_at", { ascending: false });

          setEvents(evData || []);
        } else {
          setEvents([]);
        }
      }
    } catch (err) {
      console.error("Error loading health events for inspector:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredEvents = events.filter((e) => {
    const diseaseName = e.reportable_diseases?.name || "";
    const facName = e.facility?.name || "";
    const matchesSearch = 
      diseaseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      facName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity = severityFilter === "ALL" || e.severity === severityFilter;

    return matchesSearch && matchesSeverity;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: "900", color: COLORS.navy, letterSpacing: "-0.02em", margin: 0 }}>
            Événements de Santé Signalés
          </h1>
          <p style={{ color: COLORS.muted, fontSize: "0.92rem", marginTop: "4px" }}>
            Registre et surveillance épidémiologique des cas déclarés dans la Wilaya {inspectorWilaya || "—"}.
          </p>
        </div>

        <button onClick={loadData} disabled={loading} style={{ background: "white", border: `1px solid ${COLORS.border}`, padding: "10px", borderRadius: "14px", cursor: "pointer", color: COLORS.navy }}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* FILTERS */}
      <div style={{ backgroundColor: "white", padding: "18px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: "240px", position: "relative" }}>
          <Search size={16} color={COLORS.muted} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Rechercher par maladie, établissement..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", padding: "10px 14px 10px 40px", borderRadius: "12px", border: `1px solid ${COLORS.border}`, fontSize: "0.88rem", outline: "none", backgroundColor: COLORS.bgLight }}
          />
        </div>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          style={{ padding: "10px 14px", borderRadius: "12px", border: `1px solid ${COLORS.border}`, fontSize: "0.88rem", outline: "none", backgroundColor: COLORS.bgLight, color: COLORS.navy, fontWeight: "600" }}
        >
          <option value="ALL">Toutes les gravités</option>
          <option value="CRITICAL">Critique</option>
          <option value="HIGH">Élevée</option>
          <option value="MEDIUM">Moyenne</option>
          <option value="LOW">Faible</option>
        </select>

        <div style={{ fontSize: "0.82rem", color: COLORS.muted, fontWeight: "700", marginLeft: "auto" }}>
          {filteredEvents.length} signalement(s)
        </div>
      </div>

      {/* EVENTS TABLE / CARDS */}
      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: COLORS.navy }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 12px auto", color: COLORS.teal }} />
          <div style={{ fontWeight: "700" }}>Chargement des signalements...</div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, textAlign: "center", color: COLORS.muted }}>
          <Activity size={40} color={COLORS.muted} style={{ margin: "0 auto 12px auto" }} />
          <div style={{ fontSize: "1rem", fontWeight: "700", color: COLORS.navy }}>Aucun événement de santé répertorié</div>
        </div>
      ) : (
        <div style={{ backgroundColor: "white", borderRadius: "18px", border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ backgroundColor: COLORS.bgLight, borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                <th style={{ padding: "14px 18px", fontWeight: "800" }}>Date & Heure</th>
                <th style={{ padding: "14px 18px", fontWeight: "800" }}>Pathologie / Maladie</th>
                <th style={{ padding: "14px 18px", fontWeight: "800" }}>Établissement</th>
                <th style={{ padding: "14px 18px", fontWeight: "800" }}>Niveau Gravité</th>
                <th style={{ padding: "14px 18px", fontWeight: "800" }}>Médecin Déclarant</th>
                <th style={{ padding: "14px 18px", fontWeight: "800", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((ev) => (
                <tr key={ev.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: "14px 18px", color: COLORS.navy, fontWeight: "600" }}>
                    {formatDateTime(ev.created_at)}
                  </td>
                  <td style={{ padding: "14px 18px", fontWeight: "800", color: COLORS.navy }}>
                    {ev.reportable_diseases?.name || "Non spécifié"}
                  </td>
                  <td style={{ padding: "14px 18px", color: COLORS.muted }}>
                    {ev.facility?.name || "—"}
                  </td>
                  <td style={{ padding: "14px 18px" }}>
                    <span style={{
                      padding: "4px 10px",
                      borderRadius: "999px",
                      fontSize: "0.75rem",
                      fontWeight: "800",
                      backgroundColor: ev.severity === "CRITICAL" ? "#FEE2E2" : ev.severity === "HIGH" ? "#FFEDD5" : COLORS.lightTeal,
                      color: ev.severity === "CRITICAL" ? "#DC2626" : ev.severity === "HIGH" ? "#EA580C" : COLORS.teal
                    }}>
                      {ev.severity}
                    </span>
                  </td>
                  <td style={{ padding: "14px 18px", color: COLORS.navy }}>
                    Dr. {ev.doctor?.users?.first_name || ""} {ev.doctor?.users?.last_name || "Anonyme"}
                  </td>
                  <td style={{ padding: "14px 18px", textAlign: "right" }}>
                    <button
                      onClick={() => setSelectedEvent(ev)}
                      style={{ backgroundColor: COLORS.navy, color: "white", border: "none", padding: "6px 12px", borderRadius: "8px", fontWeight: "700", fontSize: "0.8rem", cursor: "pointer" }}
                    >
                      Consulter
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedEvent && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(6,44,84,0.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(4px)" }}>
          <div style={{ backgroundColor: "white", borderRadius: "20px", maxWidth: "600px", width: "100%", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", backgroundColor: COLORS.navy, color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "800", margin: 0 }}>Fiche d'Événement #{selectedEvent.id.substring(0, 8)}</h3>
              <button onClick={() => setSelectedEvent(null)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}><X size={22} /></button>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "14px", fontSize: "0.9rem" }}>
              <div><strong>Pathologie:</strong> {selectedEvent.reportable_diseases?.name}</div>
              <div><strong>Gravité:</strong> {selectedEvent.severity}</div>
              <div><strong>Établissement:</strong> {selectedEvent.facility?.name} (Wilaya {selectedEvent.facility?.wilaya})</div>
              <div><strong>Médecin déclarant:</strong> Dr. {selectedEvent.doctor?.users?.first_name} {selectedEvent.doctor?.users?.last_name}</div>
              <div><strong>Date du signalement:</strong> {formatDateTime(selectedEvent.created_at)}</div>
              {(selectedEvent.patient_proof_url || selectedEvent.proof_url) && (
                <div>
                  <button onClick={() => setSelectedProofUrl(selectedEvent.patient_proof_url || selectedEvent.proof_url)} style={{ backgroundColor: COLORS.teal, color: "white", border: "none", padding: "8px 14px", borderRadius: "8px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                    <ImageIcon size={16} /> Consulter la Preuve Médicale Attachée
                  </button>
                </div>
              )}
            </div>

            <div style={{ padding: "14px 24px", borderTop: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bgLight, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setSelectedEvent(null)} style={{ backgroundColor: COLORS.navy, color: "white", padding: "8px 18px", borderRadius: "10px", fontWeight: "700", border: "none", cursor: "pointer" }}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* PROOF VIEWER MODAL */}
      <MedicalProofModal
        proofUrl={selectedProofUrl}
        onClose={() => setSelectedProofUrl(null)}
      />

    </div>
  );
}
