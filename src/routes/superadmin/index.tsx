import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/utils";
import { validateCurrentSession } from "@/lib/auth";
import { ALGERIA_WILAYAS_69 } from "@/lib/wilayas";
import {
  Users,
  Stethoscope,
  Building2,
  ShieldCheck,
  Activity,
  AlertTriangle,
  UserCheck,
  Briefcase,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  TrendingUp,
  Filter,
  Layers,
  ShieldAlert
} from "lucide-react";

export const Route = createFileRoute("/superadmin/")({
  head: () => ({
    meta: [
      { title: "Tableau de Bord Superadmin — RASED" },
      { name: "description", content: "Vue d'ensemble en temps réel et métriques de la plateforme nationale RASED." }
    ],
  }),
  component: SuperadminDashboard,
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

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: "#FEF2F2", text: "#991B1B", border: "#FCA5A5" },
  HIGH: { bg: "#FFF7ED", text: "#C2410C", border: "#FDBA74" },
  MEDIUM: { bg: "#FEFCE8", text: "#854D0E", border: "#FDE047" },
  LOW: { bg: "#F0FDF4", text: "#166534", border: "#86EFAC" },
};

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: "Superadministrateur",
  HEALTH_AUTHORITY: "Autorité de Santé",
  INSPECTOR: "Inspecteur",
  DOCTOR: "Médecin",
  PATIENT: "Patient",
};

const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: "#6366F1",
  HEALTH_AUTHORITY: "#F59E0B",
  INSPECTOR: "#8B5CF6",
  DOCTOR: "#0fa29b",
  PATIENT: "#3B82F6",
};

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalDoctors: number;
  totalPatients: number;
  totalInspectors: number;
  totalHealthAuthorities: number;
  totalFacilities: number;
  totalHealthEvents: number;
  criticalEvents: number;
  highEvents: number;
  mediumEvents: number;
  lowEvents: number;
  totalDiseases: number;
  roleCounts: Record<string, number>;
  facilityTypeCounts: Record<string, number>;
  topWilayas: { wilaya: string; count: number }[];
  recentActivities: {
    id: string;
    type: "EVENT" | "USER";
    title: string;
    subtitle: string;
    badgeText: string;
    badgeColor: { bg: string; text: string; border: string };
    timestamp: string;
  }[];
}

function StatCard({
  title,
  count,
  subtext,
  icon: Icon,
  color
}: {
  title: string;
  count: number | string;
  subtext?: string;
  icon: any;
  color: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "14px",
        padding: "1.25rem 1.5rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        border: `1px solid ${COLORS.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(6,44,84,0.08)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.03)";
      }}
    >
      <div>
        <p style={{ color: COLORS.muted, fontSize: "0.78rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.35rem 0" }}>
          {title}
        </p>
        <h3 style={{ color: COLORS.navy, fontSize: "1.8rem", fontWeight: "800", margin: 0, lineHeight: 1.1 }}>
          {typeof count === "number" ? count.toLocaleString("fr-FR") : count}
        </h3>
        {subtext && (
          <p style={{ color: COLORS.muted, fontSize: "0.75rem", margin: "0.35rem 0 0 0", fontWeight: "500" }}>
            {subtext}
          </p>
        )}
      </div>
      <div style={{ backgroundColor: color + "15", color: color, padding: "0.9rem", borderRadius: "12px", display: "flex", flexShrink: 0 }}>
        <Icon size={26} strokeWidth={2.3} />
      </div>
    </div>
  );
}

function SuperadminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Using centralized formatDateTime utility from @/lib/utils

  const loadDashboardData = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Verify SUPERADMIN session
      const authResult = await validateCurrentSession(["SUPERADMIN"]);
      if (!authResult.authorized) return;

      // 2. Execute parallel Supabase queries
      const [
        usersRes,
        doctorsRes,
        patientsRes,
        inspectorsRes,
        authoritiesRes,
        facilitiesRes,
        eventsRes,
        diseasesRes,
        recentUsersRes,
        recentEventsRes
      ] = await Promise.all([
        supabase.from("users").select("id, role, is_active"),
        supabase.from("doctors").select("id", { count: "exact", head: true }),
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("inspectors").select("id", { count: "exact", head: true }),
        supabase.from("health_authorities").select("id", { count: "exact", head: true }),
        supabase.from("facilities").select("id, facility_type, wilaya"),
        supabase.from("health_events").select("id, severity, created_at, reportable_diseases(name), facilities(name, wilaya)").order("created_at", { ascending: false }).limit(100),
        supabase.from("reportable_diseases").select("id", { count: "exact", head: true }),
        supabase.from("users").select("id, first_name, last_name, email, role, is_active, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("health_events").select("id, severity, description, created_at, reportable_diseases(name), facilities(name, wilaya)").order("created_at", { ascending: false }).limit(5)
      ]);

      if (usersRes.error) throw usersRes.error;
      if (facilitiesRes.error) throw facilitiesRes.error;

      const allUsers = usersRes.data || [];
      const totalUsers = allUsers.length;
      const activeUsers = allUsers.filter((u) => u.is_active).length;
      const inactiveUsers = totalUsers - activeUsers;

      // Role distribution
      const roleCounts: Record<string, number> = {
        PATIENT: 0,
        DOCTOR: 0,
        INSPECTOR: 0,
        HEALTH_AUTHORITY: 0,
        SUPERADMIN: 0
      };
      allUsers.forEach((u) => {
        if (u.role) {
          const current = roleCounts[u.role] || 0;
          roleCounts[u.role] = current + 1;
        }
      });

      // Facility Type Breakdown
      const allFacilities = facilitiesRes.data || [];
      const facilityTypeCounts: Record<string, number> = {};
      allFacilities.forEach((f) => {
        const type = f.facility_type || "Non spécifié";
        facilityTypeCounts[type] = (facilityTypeCounts[type] || 0) + 1;
      });

      // Health events severities and wilaya aggregation
      const allEvents = eventsRes.data || [];
      let criticalEvents = 0;
      let highEvents = 0;
      let mediumEvents = 0;
      let lowEvents = 0;
      const wilayaEventCounts: Record<string, number> = {};

      allEvents.forEach((ev: any) => {
        if (ev.severity === "CRITICAL") criticalEvents++;
        else if (ev.severity === "HIGH") highEvents++;
        else if (ev.severity === "MEDIUM") mediumEvents++;
        else if (ev.severity === "LOW") lowEvents++;

        const fac = Array.isArray(ev.facilities) ? ev.facilities[0] : ev.facilities;
        if (fac && fac.wilaya) {
          wilayaEventCounts[fac.wilaya] = (wilayaEventCounts[fac.wilaya] || 0) + 1;
        }
      });

      // Top Wilayas by activity
      const topWilayas = Object.entries(wilayaEventCounts)
        .map(([wilaya, count]) => {
          const wObj = ALGERIA_WILAYAS_69.find((w) => w.code === wilaya);
          const label = wObj ? `${wObj.code} — ${wObj.name}` : wilaya;
          return { wilaya: label, count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Recent Activity Feed
      const activities: DashboardStats["recentActivities"] = [];

      const defaultSevStyle = SEVERITY_COLORS["LOW"] || { bg: "#F0FDF4", text: "#166534", border: "#86EFAC" };

      (recentEventsRes.data || []).forEach((ev: any) => {
        const diseaseObj = Array.isArray(ev.reportable_diseases) ? ev.reportable_diseases[0] : ev.reportable_diseases;
        const facObj = Array.isArray(ev.facilities) ? ev.facilities[0] : ev.facilities;
        const diseaseName = diseaseObj?.name || "Événement de Santé";
        const facilityName = facObj?.name ? `(${facObj.name})` : "";
        const sevKey = (ev.severity || "LOW") as string;
        const sevStyle = SEVERITY_COLORS[sevKey] || defaultSevStyle;

        activities.push({
          id: `ev-${ev.id}`,
          type: "EVENT",
          title: `Signalement : ${diseaseName}`,
          subtitle: `${ev.description ? ev.description.substring(0, 70) + "..." : "Événement déclaré"} ${facilityName}`,
          badgeText: `Gravité : ${ev.severity}`,
          badgeColor: sevStyle,
          timestamp: ev.created_at
        });
      });

      (recentUsersRes.data || []).forEach((usr: any) => {
        const roleLabel = ROLE_LABELS[usr.role] || usr.role;
        activities.push({
          id: `usr-${usr.id}`,
          type: "USER",
          title: `Création de compte : ${usr.first_name} ${usr.last_name}`,
          subtitle: `Email : ${usr.email}`,
          badgeText: roleLabel,
          badgeColor: { bg: "#EEF2FF", text: "#3730A3", border: "#C7D2FE" },
          timestamp: usr.created_at
        });
      });

      // Sort activity stream by date descending
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setStats({
        totalUsers,
        activeUsers,
        inactiveUsers,
        totalDoctors: doctorsRes.count || 0,
        totalPatients: patientsRes.count || 0,
        totalInspectors: inspectorsRes.count || 0,
        totalHealthAuthorities: authoritiesRes.count || 0,
        totalFacilities: allFacilities.length,
        totalHealthEvents: allEvents.length,
        criticalEvents,
        highEvents,
        mediumEvents,
        lowEvents,
        totalDiseases: diseasesRes.count || 0,
        roleCounts,
        facilityTypeCounts,
        topWilayas,
        recentActivities: activities.slice(0, 8)
      });

      setLastUpdated(formatDateTime(new Date()));
    } catch (err: any) {
      console.error("[SuperadminDashboard] Error fetching statistics:", err);
      setErrorMsg("Impossible de charger les statistiques du serveur. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", paddingBottom: "3rem" }}>
      {/* Header Section */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "2rem",
          paddingBottom: "1rem",
          borderBottom: `1px solid ${COLORS.border}`
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: COLORS.navy, margin: "0 0 0.35rem 0", letterSpacing: "-0.02em" }}>
            Tableau de bord
          </h2>
          <p style={{ color: COLORS.muted, fontSize: "0.92rem", margin: 0 }}>
            Vue globale et métriques en temps réel de la plateforme RASED.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {lastUpdated && (
            <span style={{ fontSize: "0.8rem", color: COLORS.muted, display: "flex", alignItems: "center", gap: "5px" }}>
              <Clock size={14} color={COLORS.teal} /> Mise à jour : {lastUpdated}
            </span>
          )}
          <button
            onClick={loadDashboardData}
            disabled={loading}
            style={{
              backgroundColor: COLORS.teal,
              color: "white",
              border: "none",
              padding: "0.6rem 1.25rem",
              borderRadius: "10px",
              fontWeight: "600",
              fontSize: "0.88rem",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(15,162,155,0.2)",
              transition: "all 0.2s ease"
            }}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div style={{ backgroundColor: "#FEF2F2", color: "#991B1B", padding: "1.25rem", borderRadius: "12px", border: "1px solid #FCA5A5", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "12px" }}>
          <XCircle size={22} color="#DC2626" />
          <span style={{ fontSize: "0.92rem", fontWeight: "600" }}>{errorMsg}</span>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && !stats ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem", marginBottom: "2.5rem" }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              style={{
                height: "100px",
                backgroundColor: "white",
                borderRadius: "14px",
                border: `1px solid ${COLORS.border}`,
                padding: "1.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div style={{ width: "60%" }}>
                <div style={{ height: "12px", backgroundColor: "#e2e8f0", borderRadius: "4px", marginBottom: "10px" }} />
                <div style={{ height: "24px", width: "40%", backgroundColor: "#cbd5e1", borderRadius: "4px" }} />
              </div>
              <div style={{ width: "44px", height: "44px", backgroundColor: "#e2e8f0", borderRadius: "12px" }} />
            </div>
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Main Stat Cards Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "1.25rem", marginBottom: "2.5rem" }}>
            <StatCard
              title="Utilisateurs"
              count={stats.totalUsers}
              subtext={`${stats.activeUsers} actifs · ${stats.inactiveUsers} inactifs`}
              icon={Users}
              color={COLORS.teal}
            />
            <StatCard
              title="Médecins"
              count={stats.totalDoctors}
              subtext="Praticiens enregistrés"
              icon={Stethoscope}
              color="#3B82F6"
            />
            <StatCard
              title="Patients"
              count={stats.totalPatients}
              subtext="Dossiers patients"
              icon={UserCheck}
              color="#6366F1"
            />
            <StatCard
              title="Inspecteurs"
              count={stats.totalInspectors}
              subtext="Inspecteurs régionaux"
              icon={Briefcase}
              color="#8B5CF6"
            />
            <StatCard
              title="Autorités de Santé"
              count={stats.totalHealthAuthorities}
              subtext="Directions DSP / DSS"
              icon={ShieldCheck}
              color="#F59E0B"
            />
            <StatCard
              title="Établissements"
              count={stats.totalFacilities}
              subtext="Hôpitaux & Cliniques"
              icon={Building2}
              color="#0284C7"
            />
            <StatCard
              title="Événements de Santé"
              count={stats.totalHealthEvents}
              subtext={`${stats.criticalEvents} critiques · ${stats.highEvents} élevés`}
              icon={AlertTriangle}
              color="#DC2626"
            />
            <StatCard
              title="Maladies Déclarables"
              count={stats.totalDiseases}
              subtext="Pathologies surveillées"
              icon={Activity}
              color="#059669"
            />
          </div>

          {/* Visual Analytics & Breakdown Section */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "1.5rem", marginBottom: "2.5rem" }}>
            
            {/* User Roles Breakdown */}
            <div style={{ backgroundColor: "white", borderRadius: "14px", padding: "1.5rem", border: `1px solid ${COLORS.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: COLORS.navy, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <Users size={18} color={COLORS.teal} /> Répartition des Utilisateurs par Rôle
                </h3>
                <span style={{ fontSize: "0.78rem", fontWeight: "700", color: COLORS.teal, backgroundColor: COLORS.lightTeal, padding: "2px 8px", borderRadius: "999px" }}>
                  {stats.totalUsers} Total
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {Object.entries(ROLE_LABELS).map(([roleKey, label]) => {
                  const count = stats.roleCounts[roleKey] || 0;
                  const pct = stats.totalUsers > 0 ? Math.round((count / stats.totalUsers) * 100) : 0;
                  const color = ROLE_COLORS[roleKey] || COLORS.teal;

                  return (
                    <div key={roleKey}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", fontWeight: "600", color: COLORS.text, marginBottom: "4px" }}>
                        <span>{label}</span>
                        <span>{count} ({pct}%)</span>
                      </div>
                      <div style={{ width: "100%", height: "8px", backgroundColor: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            backgroundColor: color,
                            borderRadius: "999px",
                            transition: "width 0.4s ease"
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Health Events Severity Breakdown */}
            <div style={{ backgroundColor: "white", borderRadius: "14px", padding: "1.5rem", border: `1px solid ${COLORS.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: COLORS.navy, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertTriangle size={18} color="#DC2626" /> Événements de Santé par Gravité
                </h3>
                <span style={{ fontSize: "0.78rem", fontWeight: "700", color: "#DC2626", backgroundColor: "#FEF2F2", padding: "2px 8px", borderRadius: "999px" }}>
                  {stats.totalHealthEvents} Total
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
                <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "10px", padding: "1rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#991B1B", textTransform: "uppercase" }}>Critique</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#991B1B", marginTop: "2px" }}>{stats.criticalEvents}</div>
                </div>
                <div style={{ backgroundColor: "#FFF7ED", border: "1px solid #FDBA74", borderRadius: "10px", padding: "1rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#C2410C", textTransform: "uppercase" }}>Élevé</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#C2410C", marginTop: "2px" }}>{stats.highEvents}</div>
                </div>
                <div style={{ backgroundColor: "#FEFCE8", border: "1px solid #FDE047", borderRadius: "10px", padding: "1rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#854D0E", textTransform: "uppercase" }}>Moyen</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#854D0E", marginTop: "2px" }}>{stats.mediumEvents}</div>
                </div>
                <div style={{ backgroundColor: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: "10px", padding: "1rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#166534", textTransform: "uppercase" }}>Faible</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#166534", marginTop: "2px" }}>{stats.lowEvents}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Breakdown & Top Wilayas */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "1.5rem", marginBottom: "2.5rem" }}>
            
            {/* Facilities by Type */}
            <div style={{ backgroundColor: "white", borderRadius: "14px", padding: "1.5rem", border: `1px solid ${COLORS.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
              <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: COLORS.navy, margin: "0 0 1.25rem 0", display: "flex", alignItems: "center", gap: "8px" }}>
                <Building2 size={18} color="#0284C7" /> Établissements par Type
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                {Object.entries(stats.facilityTypeCounts).length === 0 ? (
                  <p style={{ fontSize: "0.85rem", color: COLORS.muted, fontStyle: "italic" }}>Aucun établissement répertorié.</p>
                ) : (
                  Object.entries(stats.facilityTypeCounts).map(([type, count]) => {
                    const pct = stats.totalFacilities > 0 ? Math.round((count / stats.totalFacilities) * 100) : 0;
                    return (
                      <div key={type}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", fontWeight: "600", color: COLORS.text, marginBottom: "4px" }}>
                          <span>{type}</span>
                          <span>{count} structures ({pct}%)</span>
                        </div>
                        <div style={{ width: "100%", height: "7px", backgroundColor: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", backgroundColor: "#0284C7", borderRadius: "999px" }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Top Wilayas by Event Activity */}
            <div style={{ backgroundColor: "white", borderRadius: "14px", padding: "1.5rem", border: `1px solid ${COLORS.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
              <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: COLORS.navy, margin: "0 0 1.25rem 0", display: "flex", alignItems: "center", gap: "8px" }}>
                <MapPin size={18} color="#8B5CF6" /> Wilayas à Forte Activité Épidémiologique
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {stats.topWilayas.length === 0 ? (
                  <p style={{ fontSize: "0.85rem", color: COLORS.muted, fontStyle: "italic" }}>Aucune donnée wilaya disponible.</p>
                ) : (
                  stats.topWilayas.map((item, idx) => (
                    <div key={item.wilaya} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", backgroundColor: COLORS.bgLight, borderRadius: "8px", border: `1px solid ${COLORS.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: "800", color: COLORS.teal, backgroundColor: COLORS.lightTeal, width: "22px", height: "22px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {idx + 1}
                        </span>
                        <span style={{ fontSize: "0.88rem", fontWeight: "600", color: COLORS.navy }}>{item.wilaya}</span>
                      </div>
                      <span style={{ fontSize: "0.82rem", fontWeight: "700", color: "#8B5CF6", backgroundColor: "#F3E8FF", padding: "2px 8px", borderRadius: "999px" }}>
                        {item.count} signalements
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity Feed Stream */}
          <div style={{ backgroundColor: "white", borderRadius: "14px", padding: "1.5rem 2rem", border: `1px solid ${COLORS.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: COLORS.navy, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Clock size={20} color={COLORS.teal} /> Dernières Activités de la Plateforme
              </h3>
              <span style={{ fontSize: "0.8rem", color: COLORS.muted }}>Horodatage exact</span>
            </div>

            {stats.recentActivities.length === 0 ? (
              <p style={{ color: COLORS.muted, fontStyle: "italic", fontSize: "0.9rem", margin: "1rem 0" }}>Aucune activité récente enregistrée.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {stats.recentActivities.map((act, idx) => (
                  <div
                    key={act.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "1rem",
                      padding: "0.9rem 1rem",
                      backgroundColor: idx % 2 === 0 ? COLORS.bgLight : "white",
                      borderRadius: "10px",
                      border: `1px solid ${COLORS.border}`
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1, minWidth: "280px" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          backgroundColor: act.type === "EVENT" ? "#FEF2F2" : "#EEF2FF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0
                        }}
                      >
                        {act.type === "EVENT" ? (
                          <AlertTriangle size={18} color="#DC2626" />
                        ) : (
                          <Users size={18} color="#4F46E5" />
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: "0.88rem", fontWeight: "700", color: COLORS.navy }}>
                          {act.title}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: COLORS.muted, marginTop: "2px" }}>
                          {act.subtitle}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          backgroundColor: act.badgeColor.bg,
                          color: act.badgeColor.text,
                          border: `1px solid ${act.badgeColor.border}`,
                          padding: "2px 10px",
                          borderRadius: "999px"
                        }}
                      >
                        {act.badgeText}
                      </span>
                      <span style={{ fontSize: "0.78rem", fontWeight: "600", color: COLORS.muted, display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={12} /> {formatDateTime(act.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
