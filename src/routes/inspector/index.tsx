import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Shield, 
  Building2, 
  BarChart3, 
  ArrowRight, 
  RefreshCw, 
  AlertTriangle, 
  Stethoscope, 
  Activity, 
  MapPin, 
  FileCheck, 
  Clock, 
  TrendingUp, 
  Lock,
  PieChart,
  Layers
} from "lucide-react";
import { validateCurrentSession } from "@/lib/auth";
import { ALGERIA_WILAYAS_69 } from "@/lib/wilayas";

export const Route = createFileRoute("/inspector/")({
  component: InspectorDashboardPage,
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

export function InspectorDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [inspector, setInspector] = useState<any>(null);
  const [stats, setStats] = useState({
    totalFacilities: 0,
    newFacilitiesMonth: 0,
    totalDoctors: 0,
    totalEvents: 0,
    criticalEvents: 0,
    pendingRequests: 0,
  });

  const [severityBreakdown, setSeverityBreakdown] = useState<{ [key: string]: number }>({
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0
  });

  const [topDiseases, setTopDiseases] = useState<{ name: string; count: number }[]>([]);
  const [facilityBreakdown, setFacilityBreakdown] = useState<{ name: string; count: number }[]>([]);
  const [eventsTimeline, setEventsTimeline] = useState<{ month: string; count: number }[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const auth = await validateCurrentSession(["INSPECTOR"]);
      if (auth.user) {
        // Fetch Inspector Record
        const { data: inspRec } = await supabase
          .from("inspectors")
          .select("*")
          .eq("user_id", auth.user.id)
          .maybeSingle();

        if (inspRec?.wilaya) {
          setInspector(inspRec);
          const wilaya = inspRec.wilaya;

          // 1. Fetch Facilities in Inspector's Wilaya
          const { data: facs } = await supabase
            .from("facilities")
            .select("id, name, created_at, wilaya")
            .eq("wilaya", wilaya);

          const facList = facs || [];
          const facIds = facList.map(f => f.id);

          // Calculate facilities added this month
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0,0,0,0);
          const newMonthCount = facList.filter(f => new Date(f.created_at) >= startOfMonth).length;

          // 2. Fetch Active Doctors in Facilities within Wilaya
          let activeDoctorsCount = 0;
          if (facIds.length > 0) {
            const { count } = await supabase
              .from("doctors")
              .select("id", { count: "exact", head: true })
              .in("facility_id", facIds);
            activeDoctorsCount = count || 0;
          }

          // 3. Fetch Health Events in Inspector's Wilaya
          let events: any[] = [];
          if (facIds.length > 0) {
            const { data: evData } = await supabase
              .from("health_events")
              .select(`
                id,
                severity,
                created_at,
                facility_id,
                reportable_diseases:reportable_disease_id(name)
              `)
              .in("facility_id", facIds);
            events = evData || [];
          }

          const criticalCount = events.filter(e => e.severity === "CRITICAL").length;
          const highCount = events.filter(e => e.severity === "HIGH").length;
          const mediumCount = events.filter(e => e.severity === "MEDIUM").length;
          const lowCount = events.filter(e => e.severity === "LOW").length;

          setSeverityBreakdown({
            CRITICAL: criticalCount,
            HIGH: highCount,
            MEDIUM: mediumCount,
            LOW: lowCount
          });

          // Top Reported Diseases
          const diseaseCounts: { [key: string]: number } = {};
          events.forEach(e => {
            const diseaseName = e.reportable_diseases?.name || "Non spécifié";
            diseaseCounts[diseaseName] = (diseaseCounts[diseaseName] || 0) + 1;
          });
          const sortedDiseases = Object.entries(diseaseCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
          setTopDiseases(sortedDiseases);

          // Facility Event Breakdown
          const facEventCounts: { [key: string]: number } = {};
          events.forEach(e => {
            const facObj = facList.find(f => f.id === e.facility_id);
            const facName = facObj ? facObj.name : "Établissement inconnu";
            facEventCounts[facName] = (facEventCounts[facName] || 0) + 1;
          });
          const sortedFacilities = Object.entries(facEventCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
          setFacilityBreakdown(sortedFacilities);

          // 4. Fetch Pending Change Requests submitted by this Inspector
          const { count: reqCount } = await supabase
            .from("doctor_assignments" as any) // Ledger or requests
            .select("id", { count: "exact", head: true })
            .eq("status", "PENDING");

          setStats({
            totalFacilities: facList.length,
            newFacilitiesMonth: newMonthCount,
            totalDoctors: activeDoctorsCount,
            totalEvents: events.length,
            criticalEvents: criticalCount,
            pendingRequests: reqCount || 0,
          });
        }
      }
    } catch (err) {
      console.error("Inspector dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const wilayaInfo = ALGERIA_WILAYAS_69.find(w => w.code === inspector?.wilaya);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* HEADER BANNER WITH WILAYA SCOPE */}
      <div 
        style={{ 
          backgroundColor: COLORS.navy, 
          borderRadius: "20px", 
          padding: "28px 32px", 
          color: "white",
          boxShadow: "0 10px 30px rgba(6, 44, 84, 0.12)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px"
        }}
      >
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "rgba(15, 162, 155, 0.2)", color: "#34d399", padding: "4px 14px", borderRadius: "999px", fontSize: "0.8rem", fontWeight: "800", marginBottom: "10px" }}>
            <Shield size={14} /> Inspectorat Régional de Santé publique
          </div>
          <h1 style={{ fontSize: "1.85rem", fontWeight: "900", margin: "0 0 6px 0", letterSpacing: "-0.01em" }}>
            Tableau de bord
          </h1>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.92rem", maxWidth: "600px" }}>
            Vue d'ensemble de la situation sanitaire de votre Wilaya.
          </p>

          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "14px", backgroundColor: "rgba(255,255,255,0.1)", padding: "6px 14px", borderRadius: "10px", fontSize: "0.85rem", fontWeight: "700" }}>
            <MapPin size={16} color={COLORS.teal} />
            <span>📍 Wilaya {inspector?.wilaya || "—"} {wilayaInfo ? `(${wilayaInfo.name})` : ""}</span>
            <Lock size={12} color="#f59e0b" style={{ marginLeft: "4px" }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={loadData} disabled={loading} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", padding: "12px", borderRadius: "12px", cursor: "pointer" }}>
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <Link
            to="/inspector/reports"
            style={{
              backgroundColor: COLORS.teal,
              color: "white",
              border: "none",
              padding: "12px 20px",
              borderRadius: "12px",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.9rem",
              textDecoration: "none",
              boxShadow: "0 4px 16px rgba(15, 162, 155, 0.4)"
            }}
          >
            <BarChart3 size={18} />
            Rapports & Observatoire
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* 4 SPECIFIED SUMMARY KPI CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        
        {/* CARD 1: ÉTABLISSEMENTS */}
        <div style={{ backgroundColor: "white", padding: "20px 24px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em" }}>ÉTABLISSEMENTS</span>
            <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
              <Building2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: "900", color: COLORS.navy, marginTop: "8px" }}>
            {stats.totalFacilities}
          </div>
          <div style={{ fontSize: "0.78rem", color: COLORS.teal, fontWeight: "700", marginTop: "4px" }}>
            +{stats.newFacilitiesMonth} ce mois
          </div>
        </div>

        {/* CARD 2: MÉDECINS ACTIFS */}
        <div style={{ backgroundColor: "white", padding: "20px 24px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em" }}>MÉDECINS ACTIFS</span>
            <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: "#E0F2FE", color: "#0284C7" }}>
              <Stethoscope size={18} />
            </div>
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: "900", color: COLORS.navy, marginTop: "8px" }}>
            {stats.totalDoctors}
          </div>
          <div style={{ fontSize: "0.78rem", color: COLORS.muted, marginTop: "4px" }}>
            Enregistrés dans la Wilaya
          </div>
        </div>

        {/* CARD 3: ÉVÉNEMENTS */}
        <div style={{ backgroundColor: "white", padding: "20px 24px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em" }}>ÉVÉNEMENTS</span>
            <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: "#FEE2E2", color: "#DC2626" }}>
              <Activity size={18} />
            </div>
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: "900", color: COLORS.navy, marginTop: "8px" }}>
            {stats.totalEvents}
          </div>
          <div style={{ fontSize: "0.78rem", color: "#DC2626", fontWeight: "700", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
            <AlertTriangle size={12} /> {stats.criticalEvents} critiques
          </div>
        </div>

        {/* CARD 4: DEMANDES */}
        <div style={{ backgroundColor: "white", padding: "20px 24px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em" }}>DEMANDES</span>
            <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: "#FEF3C7", color: "#B45309" }}>
              <FileCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: "900", color: COLORS.navy, marginTop: "8px" }}>
            {stats.pendingRequests}
          </div>
          <div style={{ fontSize: "0.78rem", color: "#B45309", fontWeight: "700", marginTop: "4px" }}>
            En attente de validation
          </div>
        </div>

      </div>

      {/* EPIDEMIOLOGICAL ANALYTICS SECTION */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }} className="lg:grid-cols-2">
        
        {/* CHART 1: SEVERITY DISTRIBUTION */}
        <div style={{ backgroundColor: "white", borderRadius: "18px", border: `1px solid ${COLORS.border}`, padding: "22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
            <div style={{ fontSize: "1rem", fontWeight: "800", color: COLORS.navy, display: "flex", alignItems: "center", gap: "8px" }}>
              <PieChart size={18} color={COLORS.teal} /> Répartition par Gravité Sanitaire
            </div>
            <span style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "600" }}>Wilaya {inspector?.wilaya}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { key: "CRITICAL", label: "CRITIQUE", color: "#DC2626", bg: "#FEF2F2", count: severityBreakdown["CRITICAL"] || 0 },
              { key: "HIGH", label: "ÉLEVÉE", color: "#EA580C", bg: "#FFEDD5", count: severityBreakdown["HIGH"] || 0 },
              { key: "MEDIUM", label: "MOYENNE", color: "#D97706", bg: "#FEF3C7", count: severityBreakdown["MEDIUM"] || 0 },
              { key: "LOW", label: "FAIBLE", color: "#2563EB", bg: "#EFF6FF", count: severityBreakdown["LOW"] || 0 },
            ].map((sev) => {
              const cnt = sev.count || 0;
              const pct = stats.totalEvents > 0 ? Math.round((cnt / stats.totalEvents) * 100) : 0;
              return (
                <div key={sev.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: "700", marginBottom: "4px" }}>
                    <span style={{ color: sev.color }}>● {sev.label}</span>
                    <span style={{ color: COLORS.navy }}>{cnt} cas ({pct}%)</span>
                  </div>
                  <div style={{ width: "100%", height: "8px", borderRadius: "999px", backgroundColor: "#F1F5F9", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", backgroundColor: sev.color, borderRadius: "999px", transition: "width 0.5s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CHART 2: DISEASE DISTRIBUTION */}
        <div style={{ backgroundColor: "white", borderRadius: "18px", border: `1px solid ${COLORS.border}`, padding: "22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
            <div style={{ fontSize: "1rem", fontWeight: "800", color: COLORS.navy, display: "flex", alignItems: "center", gap: "8px" }}>
              <Layers size={18} color={COLORS.teal} /> Pathologies Déclarées Prédominantes
            </div>
            <span style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "600" }}>Top 5</span>
          </div>

          {topDiseases.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: COLORS.muted, fontSize: "0.88rem" }}>
              Aucun signalement épidémiologique enregistré pour l'instant.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {topDiseases.map((d, idx) => {
                const pct = stats.totalEvents > 0 ? Math.round((d.count / stats.totalEvents) * 100) : 0;
                return (
                  <div key={idx}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: "700", marginBottom: "4px" }}>
                      <span style={{ color: COLORS.navy }}>{idx + 1}. {d.name}</span>
                      <span style={{ color: COLORS.teal }}>{d.count} cas ({pct}%)</span>
                    </div>
                    <div style={{ width: "100%", height: "8px", borderRadius: "999px", backgroundColor: "#F1F5F9", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", backgroundColor: COLORS.teal, borderRadius: "999px", transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* QUICK ACCESS LINKS */}
      <div style={{ backgroundColor: "white", borderRadius: "18px", border: `1px solid ${COLORS.border}`, padding: "22px" }}>
        <div style={{ fontSize: "1rem", fontWeight: "800", color: COLORS.navy, marginBottom: "14px" }}>
          Actions & Navigation Inspection
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
          <Link
            to={"/inspector/facilities" as any}
            style={{ padding: "16px", borderRadius: "12px", border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bgLight, textDecoration: "none", color: COLORS.navy, fontWeight: "700", display: "flex", alignItems: "center", gap: "10px" }}
          >
            <Building2 size={20} color={COLORS.teal} />
            <div>
              <div>Établissements</div>
              <div style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "500" }}>Annuaire territorial</div>
            </div>
          </Link>

          <Link
            to={"/inspector/doctors" as any}
            style={{ padding: "16px", borderRadius: "12px", border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bgLight, textDecoration: "none", color: COLORS.navy, fontWeight: "700", display: "flex", alignItems: "center", gap: "10px" }}
          >
            <Stethoscope size={20} color="#0284C7" />
            <div>
              <div>Médecins</div>
              <div style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "500" }}>Effectifs & Cliniques</div>
            </div>
          </Link>

          <Link
            to={"/inspector/requests" as any}
            style={{ padding: "16px", borderRadius: "12px", border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bgLight, textDecoration: "none", color: COLORS.navy, fontWeight: "700", display: "flex", alignItems: "center", gap: "10px" }}
          >
            <FileCheck size={20} color="#B45309" />
            <div>
              <div>Demandes</div>
              <div style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "500" }}>Suivi des validations</div>
            </div>
          </Link>

          <Link
            to={"/inspector/history" as any}
            style={{ padding: "16px", borderRadius: "12px", border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bgLight, textDecoration: "none", color: COLORS.navy, fontWeight: "700", display: "flex", alignItems: "center", gap: "10px" }}
          >
            <Clock size={20} color="#6B21A8" />
            <div>
              <div>Historique</div>
              <div style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "500" }}>Journal des actions</div>
            </div>
          </Link>
        </div>
      </div>

    </div>
  );
}
