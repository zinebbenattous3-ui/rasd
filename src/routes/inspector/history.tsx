import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/utils";
import { validateCurrentSession } from "@/lib/auth";
import { normalizeWilayaCode } from "@/lib/wilayas";
import { DatePicker } from "@/components/ui/date-picker";
import { UnifiedSelect } from "@/components/ui/UnifiedSelect";
import { 
  History, 
  Clock, 
  Activity, 
  Building2, 
  Stethoscope, 
  RefreshCw, 
  MapPin, 
  Lock,
  Search,
  Filter,
  X,
  RotateCcw
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

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const [appliedTypeFilter, setAppliedTypeFilter] = useState("ALL");

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
        const normCode = normalizeWilayaCode(inspRec.wilaya);

        // Fetch facilities in Wilaya
        const { data: facs } = await supabase
          .from("facilities")
          .select("id, name, created_at")
          .ilike("wilaya", `%${normCode}%`);

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
            details: `Structure sanitaire enregistrée dans la Wilaya ${inspRec.wilaya}`,
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
            .limit(30);

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

  const handleApplyFilters = () => {
    setAppliedSearchQuery(searchQuery);
    setAppliedTypeFilter(typeFilter);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setTypeFilter("ALL");
    setAppliedSearchQuery("");
    setAppliedTypeFilter("ALL");
  };

  const filteredItems = timelineItems.filter((item) => {
    const matchesSearch = 
      !appliedSearchQuery ||
      item.title.toLowerCase().includes(appliedSearchQuery.toLowerCase()) ||
      item.entity.toLowerCase().includes(appliedSearchQuery.toLowerCase()) ||
      item.details.toLowerCase().includes(appliedSearchQuery.toLowerCase());

    const matchesType = appliedTypeFilter === "ALL" || item.type === appliedTypeFilter;

    return matchesSearch && matchesType;
  });

  const activeChips = [];
  if (appliedSearchQuery) {
    activeChips.push({
      key: "search",
      label: `Recherche: "${appliedSearchQuery}"`,
      clear: () => { setSearchQuery(""); setAppliedSearchQuery(""); }
    });
  }
  if (appliedTypeFilter !== "ALL") {
    activeChips.push({
      key: "type",
      label: `Type: ${appliedTypeFilter === "FACILITY" ? "Établissements" : "Signalements Sanitaires"}`,
      clear: () => { setTypeFilter("ALL"); setAppliedTypeFilter("ALL"); }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", backgroundColor: "white", padding: "24px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
              <History size={22} />
            </div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "900", color: COLORS.navy, margin: 0, letterSpacing: "-0.02em" }}>
              Historique & Journal des Activités
            </h1>
          </div>
          <p style={{ fontSize: "0.88rem", color: COLORS.muted, margin: 0 }}>
            Chronologie complète des actions, déclarations et mouvements sanitaires dans la Wilaya {inspectorWilaya || "—"}.
          </p>
        </div>

        <button onClick={loadHistory} disabled={loading} style={{ background: "white", border: `1px solid ${COLORS.border}`, padding: "10px", borderRadius: "12px", cursor: "pointer", color: COLORS.navy }}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* UNIFIED RASED FILTER PANEL */}
      <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: "16px", marginBottom: "20px" }}>
          <Filter size={18} color={COLORS.teal} />
          <h2 style={{ fontSize: "1rem", fontWeight: "800", color: COLORS.navy, margin: 0 }}>
            Filtres & Journal Chronologique
          </h2>
        </div>

        {/* ACTIVE FILTER CHIPS */}
        {activeChips.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "18px", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: "700", color: COLORS.muted }}>Filtres actifs:</span>
            {activeChips.map(chip => (
              <span key={chip.key} style={{ backgroundColor: COLORS.lightTeal, color: COLORS.teal, border: `1px solid ${COLORS.teal}40`, padding: "4px 10px", borderRadius: "999px", fontSize: "0.78rem", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                {chip.label}
                <X size={14} style={{ cursor: "pointer" }} onClick={chip.clear} />
              </span>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
          
          {/* SEARCH */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
              Recherche dans le journal
            </label>
            <div style={{ position: "relative" }}>
              <Search size={16} color={COLORS.muted} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                placeholder="Événement, établissement, pathologie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", padding: "10px 14px 10px 40px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.88rem", outline: "none", backgroundColor: COLORS.bgLight }}
              />
            </div>
          </div>

          {/* EVENT TYPE */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
              Type d'Activité
            </label>
            <UnifiedSelect
              icon={Filter}
              value={typeFilter}
              onChange={(val: string) => setTypeFilter(val)}
              placeholder="Tous les types d'événements"
              options={[
                { value: "ALL", label: "Tous les types d'événements" },
                { value: "EVENT", label: "Signalements Sanitaires" },
                { value: "FACILITY", label: "Enregistrements d'Établissements" }
              ]}
            />
          </div>

          {/* WILAYA (LOCKED) */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
              Wilaya (Verrouillée)
            </label>
            <div style={{ padding: "10px 14px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, backgroundColor: "#F1F5F9", color: COLORS.navy, fontWeight: "700", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <Lock size={15} color="#B45309" />
              <span>Wilaya {inspectorWilaya || "—"}</span>
            </div>
          </div>

        </div>

        {/* ACTION BAR */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", paddingTop: "16px", borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: "0.82rem", color: COLORS.muted, fontWeight: "700" }}>
            {filteredItems.length} enregistrement(s)
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleResetFilters}
              style={{ backgroundColor: "white", border: `1px solid ${COLORS.border}`, padding: "8px 16px", borderRadius: "10px", fontSize: "0.85rem", fontWeight: "700", color: COLORS.navy, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <RotateCcw size={14} /> Réinitialiser
            </button>
            <button
              onClick={handleApplyFilters}
              style={{ backgroundColor: COLORS.navy, border: "none", padding: "8px 20px", borderRadius: "10px", fontSize: "0.85rem", fontWeight: "800", color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Filter size={14} /> Appliquer les filtres
            </button>
          </div>
        </div>
      </div>

      {/* TIMELINE */}
      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: COLORS.navy }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 12px auto", color: COLORS.teal }} />
          <div style={{ fontWeight: "700" }}>Chargement du journal d'activités...</div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, textAlign: "center", color: COLORS.muted }}>
          <History size={40} color={COLORS.muted} style={{ margin: "0 auto 12px auto" }} />
          <div style={{ fontSize: "1rem", fontWeight: "700", color: COLORS.navy }}>Aucun événement d'historique trouvé</div>
          <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>Ajustez vos filtres de recherche.</div>
        </div>
      ) : (
        <div style={{ backgroundColor: "white", borderRadius: "20px", border: `1px solid ${COLORS.border}`, padding: "28px", boxShadow: "0 4px 16px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px", position: "relative" }}>
            
            {/* Timeline line */}
            <div style={{ position: "absolute", left: "20px", top: "10px", bottom: "10px", width: "2px", backgroundColor: COLORS.border, zIndex: 1 }} />

            {filteredItems.map((item) => {
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
                        <Clock size={12} /> {formatDateTime(item.date)}
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
