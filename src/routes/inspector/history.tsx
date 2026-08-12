import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { validateCurrentSession } from "@/lib/auth";
import { 
  History, 
  Clock, 
  Activity, 
  Building2, 
  Stethoscope, 
  FileCheck, 
  RefreshCw, 
  MapPin, 
  Lock,
  ChevronRight
} from "lucide-react";

export const Route = createFileRoute("/inspector/history")({
  head: () => ({
    meta: [
      { title: "Historique d'Inspection — Inspectorat Rased" },
    ],
  }),
  component: InspectorHistoryPage,
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

export function InspectorHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [inspectorWilaya, setInspectorWilaya] = useState<string | null>(null);
  const [timelineItems, setTimelineItems] = useState<any[]>([]);

  const loadHistory = async () => {
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
        const wilaya = inspRec.wilaya;

        // Fetch facilities in Wilaya
        const { data: facs } = await supabase
          .from("facilities")
          .select("id, name, created_at")
          .eq("wilaya", wilaya);

        const facList = facs || [];
        const facIds = facList.map(f => f.id);

        const items: any[] = [];

        // 1. Facility Additions
        facList.forEach(fac => {
          items.push({
            id: `fac-${fac.id}`,
            date: new Date(fac.created_at),
            type: "FACILITY",
            title: "Établissement enregistré",
            entity: fac.name,
            details: `Structure sanitaire enregistrée dans la Wilaya ${wilaya}`,
            icon: Building2,
            color: COLORS.teal
          });
        });

        // 2. Health Events in Wilaya
        if (facIds.length > 0) {
          const { data: evData } = await supabase
            .from("health_events")
            .select(`
              id,
              severity,
              created_at,
              facility:facility_id (name),
              reportable_diseases:reportable_disease_id (name)
            `)
            .in("facility_id", facIds)
            .order("created_at", { ascending: false })
            .limit(20);

          (evData || []).forEach(ev => {
            const diseaseObj = Array.isArray(ev.reportable_diseases) ? ev.reportable_diseases[0] : ev.reportable_diseases;
            const facObj = Array.isArray(ev.facility) ? ev.facility[0] : ev.facility;

            items.push({
              id: `ev-${ev.id}`,
              date: new Date(ev.created_at),
              type: "EVENT",
              title: "Événement de santé déclaré",
              entity: diseaseObj?.name || "Pathologie",
              details: `Signalement niveau ${ev.severity} • ${facObj?.name || "Établissement"}`,
              icon: Activity,
              color: ev.severity === "CRITICAL" ? "#DC2626" : "#EA580C"
            });
          });
        }

        // Sort timeline items chronologically descending
        items.sort((a, b) => b.date.getTime() - a.date.getTime());
        setTimelineItems(items);
      }
    } catch (err) {
      console.error("Error loading history for inspector:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: "900", color: COLORS.navy, letterSpacing: "-0.02em", margin: 0 }}>
            📜 Historique & Journal des Activités
          </h1>
          <p style={{ color: COLORS.muted, fontSize: "0.92rem", marginTop: "4px" }}>
            Chronologie complète des actions, déclarations et mouvements sanitaires dans la Wilaya {inspectorWilaya || "—"}.
          </p>
        </div>

        <button onClick={loadHistory} disabled={loading} style={{ background: "white", border: `1px solid ${COLORS.border}`, padding: "10px", borderRadius: "14px", cursor: "pointer", color: COLORS.navy }}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* TIMELINE */}
      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: COLORS.navy }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 12px auto", color: COLORS.teal }} />
          <div style={{ fontWeight: "700" }}>Chargement du journal d'activités...</div>
        </div>
      ) : timelineItems.length === 0 ? (
        <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, textAlign: "center", color: COLORS.muted }}>
          <History size={40} color={COLORS.muted} style={{ margin: "0 auto 12px auto" }} />
          <div style={{ fontSize: "1rem", fontWeight: "700", color: COLORS.navy }}>Aucun historique disponible</div>
        </div>
      ) : (
        <div style={{ backgroundColor: "white", borderRadius: "20px", border: `1px solid ${COLORS.border}`, padding: "28px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px", position: "relative" }}>
            
            {/* Timeline line */}
            <div style={{ position: "absolute", left: "20px", top: "10px", bottom: "10px", width: "2px", backgroundColor: COLORS.border, zIndex: 1 }} />

            {timelineItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} style={{ display: "flex", gap: "18px", alignItems: "flex-start", position: "relative", zIndex: 2 }}>
                  <div style={{ width: "42px", height: "42px", borderRadius: "50%", backgroundColor: "white", border: `2px solid ${item.color}`, display: "flex", alignItems: "center", justifyContent: "center", color: item.color, flexShrink: 0 }}>
                    <Icon size={18} />
                  </div>

                  <div style={{ backgroundColor: COLORS.bgLight, padding: "16px 20px", borderRadius: "14px", border: `1px solid ${COLORS.border}`, flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                      <span style={{ fontSize: "0.88rem", fontWeight: "800", color: COLORS.navy }}>{item.title}</span>
                      <span style={{ fontSize: "0.78rem", color: COLORS.muted, fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={12} /> {item.date.toLocaleDateString("fr-FR")} à {item.date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <div style={{ fontSize: "0.92rem", fontWeight: "800", color: COLORS.teal, marginTop: "4px" }}>
                      {item.entity}
                    </div>

                    <div style={{ fontSize: "0.82rem", color: COLORS.muted, marginTop: "4px" }}>
                      {item.details}
                    </div>
                  </div>
                </div>
              );
            })}

          </div>
        </div>
      )}

    </div>
  );
}
