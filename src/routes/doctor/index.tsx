import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/utils";
import { 
  Users, 
  Activity, 
  CheckCircle2, 
  Plus, 
  ChevronRight, 
  RefreshCw, 
  Stethoscope,
  Calendar,
  AlertTriangle,
  UserPlus,
  Building2,
  TrendingUp,
  HeartPulse,
  ShieldAlert,
  Droplet,
  BarChart2,
  ArrowUpRight,
  Sparkles,
  PieChart as PieChartIcon
} from "lucide-react";

export const Route = createFileRoute("/doctor/")({
  component: DoctorDashboardPage,
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

type TimeRange = "7D" | "30D" | "6M" | "12M";

interface PatientDemographics {
  femaleCount: number;
  maleCount: number;
  femalePct: number;
  malePct: number;
  totalUniquePatients: number;
}

interface BloodTypeDistribution {
  [key: string]: number;
}

interface DiseaseStat {
  id: string;
  name: string;
  count: number;
  pct: number;
}

interface SeverityDistribution {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  CRITICAL: number;
}

function DoctorDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [currentDoctor, setCurrentDoctor] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("6M");

  // Raw fetched datasets for current doctor
  const [doctorEvents, setDoctorEvents] = useState<any[]>([]);
  const [doctorPatientsMap, setDoctorPatientsMap] = useState<Map<string, any>>(new Map());

  // Today's formatted date string in French
  const todayFormatted = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }, []);

  // Fetch all Doctor scoped statistics
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch current Doctor identity & facility scope
      const { data: docData, error: docErr } = await supabase
        .from('doctors')
        .select(`
          *,
          users:user_id (
            id,
            email,
            first_name,
            last_name
          ),
          facility:facility_id (
            id,
            name,
            wilaya,
            facility_type
          )
        `)
        .limit(1)
        .maybeSingle();

      if (docErr) throw docErr;

      if (docData && docData.users) {
        const userObj = Array.isArray(docData.users) ? docData.users[0] : docData.users;
        const facObj = Array.isArray(docData.facility) ? docData.facility[0] : docData.facility;

        const doctorObj = {
          id: docData.id,
          userId: docData.user_id,
          firstName: userObj?.first_name || '',
          lastName: userObj?.last_name || '',
          specialty: docData.specialty,
          facilityId: docData.facility_id,
          facilityName: facObj?.name || 'Établissement non spécifié',
          facilityWilaya: facObj?.wilaya || 'Algérie'
        };
        setCurrentDoctor(doctorObj);

        // 2. Fetch all health events declared by THIS doctor
        const { data: eventsData, error: eventsErr } = await supabase
          .from('health_events')
          .select(`
            *,
            patient:patient_id (
              id,
              first_name,
              last_name,
              nin,
              gender,
              blood_type,
              date_of_birth
            ),
            reportable_disease:reportable_disease_id (
              id,
              name
            )
          `)
          .eq('doctor_id', docData.id)
          .order('created_at', { ascending: false });

        if (eventsErr) throw eventsErr;

        if (eventsData) {
          setDoctorEvents(eventsData);

          // Extract unique patient map
          const pMap = new Map<string, any>();
          eventsData.forEach(evt => {
            if (evt.patient_id) {
              const pObj = Array.isArray(evt.patient) ? evt.patient[0] : evt.patient;
              if (pObj && !pMap.has(evt.patient_id)) {
                pMap.set(evt.patient_id, pObj);
              }
            }
          });
          setDoctorPatientsMap(pMap);
        }
      }
    } catch (err) {
      console.error("Error loading Doctor dashboard statistics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // COMPUTED METRICS

  // 1. Unique Patients Count
  const totalUniquePatients = doctorPatientsMap.size;

  // 2. Events Count & Current Month Events Count
  const totalEvents = doctorEvents.length;
  const currentMonthEventsCount = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return doctorEvents.filter(e => new Date(e.created_at) >= startOfMonth).length;
  }, [doctorEvents]);

  // 3. New Patients Created This Month
  const currentMonthNewPatientsCount = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let count = 0;
    doctorEvents.forEach(e => {
      if (new Date(e.created_at) >= startOfMonth) {
        count++;
      }
    });
    return count;
  }, [doctorEvents]);

  // 4. Critical Events Count
  const criticalEventsCount = useMemo(() => {
    return doctorEvents.filter(e => e.severity === 'CRITICAL').length;
  }, [doctorEvents]);

  // 5. Severity Distribution
  const severityDist: SeverityDistribution = useMemo(() => {
    const dist = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    doctorEvents.forEach(e => {
      if (e.severity in dist) {
        dist[e.severity as keyof SeverityDistribution]++;
      }
    });
    return dist;
  }, [doctorEvents]);

  // 6. Top Declared Diseases
  const topDiseases: DiseaseStat[] = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    doctorEvents.forEach(evt => {
      const diseaseObj = Array.isArray(evt.reportable_disease) ? evt.reportable_disease[0] : evt.reportable_disease;
      const dName = diseaseObj?.name || 'Non spécifiée';
      const dId = evt.reportable_disease_id || dName;

      if (map.has(dName)) {
        map.get(dName)!.count++;
      } else {
        map.set(dName, { id: dId, name: dName, count: 1 });
      }
    });

    const sorted = Array.from(map.values()).sort((a, b) => b.count - a.count);
    return sorted.map(d => ({
      ...d,
      pct: totalEvents > 0 ? Math.round((d.count / totalEvents) * 100) : 0
    }));
  }, [doctorEvents, totalEvents]);

  const topDiseaseName = topDiseases.length > 0 ? topDiseases[0]?.name || "Aucune" : "Aucune";
  const topDiseaseCount = topDiseases.length > 0 ? topDiseases[0]?.count || 0 : 0;

  // 7. Patient Gender Demographics (Derived from unique patients)
  const demographics: PatientDemographics = useMemo(() => {
    let female = 0;
    let male = 0;
    doctorPatientsMap.forEach(p => {
      if (p.gender === 'F') female++;
      else if (p.gender === 'M') male++;
    });

    const total = female + male;
    return {
      femaleCount: female,
      maleCount: male,
      femalePct: total > 0 ? Math.round((female / total) * 100) : 0,
      malePct: total > 0 ? Math.round((male / total) * 100) : 0,
      totalUniquePatients: total
    };
  }, [doctorPatientsMap]);

  // 8. Blood Group Distribution (Derived from unique patients)
  const bloodTypeDist: { label: string; count: number; pct: number }[] = useMemo(() => {
    const knownGroups: Record<string, number> = {
      'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0
    };
    let totalKnown = 0;

    doctorPatientsMap.forEach(p => {
      if (p.blood_type && p.blood_type in knownGroups) {
        knownGroups[p.blood_type] = (knownGroups[p.blood_type] || 0) + 1;
        totalKnown++;
      }
    });

    const list = Object.entries(knownGroups).map(([type, count]) => ({
      label: type,
      count,
      pct: totalKnown > 0 ? Math.round((count / totalKnown) * 100) : 0
    }));

    // Sort by count descending
    return list.sort((a, b) => b.count - a.count);
  }, [doctorPatientsMap]);

  const dominantBloodGroup = bloodTypeDist.length > 0 && bloodTypeDist[0] && bloodTypeDist[0].count > 0 ? bloodTypeDist[0] : null;

  // 9. Time Series Activity Data
  const activityTimeSeries = useMemo(() => {
    const now = new Date();
    const points: { label: string; count: number }[] = [];

    if (timeRange === "7D") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayStr = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
        const count = doctorEvents.filter(e => {
          const ed = new Date(e.created_at);
          return ed.toDateString() === d.toDateString();
        }).length;
        points.push({ label: dayStr, count });
      }
    } else if (timeRange === "30D") {
      for (let i = 4; i >= 0; i--) {
        const dEnd = new Date(now);
        dEnd.setDate(dEnd.getDate() - i * 6);
        const dStart = new Date(dEnd);
        dStart.setDate(dStart.getDate() - 6);
        const label = `Sem. ${5 - i}`;
        const count = doctorEvents.filter(e => {
          const ed = new Date(e.created_at);
          return ed >= dStart && ed <= dEnd;
        }).length;
        points.push({ label, count });
      }
    } else {
      // 6M or 12M
      const monthsCount = timeRange === "12M" ? 12 : 6;
      for (let i = monthsCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = d.toLocaleDateString("fr-FR", { month: "short" });
        const count = doctorEvents.filter(e => {
          const ed = new Date(e.created_at);
          return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth();
        }).length;
        points.push({ label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1), count });
      }
    }
    return points;
  }, [doctorEvents, timeRange]);

  const maxActivityValue = Math.max(...activityTimeSeries.map(p => p.count), 1);

  // 10. Critical & High Priority Attention List
  const criticalAttentionEvents = useMemo(() => {
    return doctorEvents
      .filter(e => e.severity === 'CRITICAL' || e.severity === 'HIGH')
      .slice(0, 4);
  }, [doctorEvents]);

  // Derived Key Metrics
  const avgEventsPerPatient = totalUniquePatients > 0 ? (totalEvents / totalUniquePatients).toFixed(1) : "0.0";
  const criticalRate = totalEvents > 0 ? ((criticalEventsCount / totalEvents) * 100).toFixed(1) : "0.0";

  // Helper for masking patient ID for privacy
  const getMaskedPatientId = (patientObj: any) => {
    if (!patientObj) return "Patient #••••";
    if (patientObj.nin && patientObj.nin.length >= 4) {
      return `Patient #••••${patientObj.nin.slice(-4)}`;
    }
    return `Patient #${patientObj.id.slice(0, 6)}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1240px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* 1. COMPACT HERO HEADER SECTION */}
      <div 
        style={{
          backgroundColor: COLORS.navy,
          borderRadius: '20px',
          padding: '28px 32px',
          color: 'white',
          background: `linear-gradient(135deg, ${COLORS.navy} 0%, #0c3e70 100%)`,
          boxShadow: '0 10px 30px -5px rgba(6, 44, 84, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ backgroundColor: 'rgba(15, 162, 155, 0.2)', color: '#5eead4', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Stethoscope size={14} /> Espace Praticien Déclarant
            </span>
            <span style={{ fontSize: '0.8rem', color: '#94A3B8', textTransform: 'capitalize' }}>
              • {todayFormatted}
            </span>
          </div>

          <h1 style={{ fontSize: '1.85rem', fontWeight: '800', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Bonjour, Dr. {currentDoctor?.firstName || ''} {currentDoctor?.lastName || ''} 👋
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.92rem', color: '#CBD5E1', maxWidth: '650px' }}>
            Voici un aperçu synthétique et en temps réel de votre activité médicale et épidémiologique.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', fontSize: '0.85rem', color: '#93C5FD' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}>
              <Building2 size={15} color={COLORS.teal} />
              <span>🏥 {currentDoctor?.facilityName}</span>
            </div>
            {currentDoctor?.specialty && (
              <>
                <span>•</span>
                <span style={{ color: '#E2E8F0', fontWeight: '600' }}>Spécialité : {currentDoctor.specialty}</span>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            onClick={loadDashboardData}
            disabled={loading}
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '10px 16px',
              borderRadius: '10px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.85rem',
              transition: 'background-color 0.2s'
            }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Actualiser
          </button>
        </div>
      </div>

      {/* 2. KPI CARDS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        
        {/* Card 1: Patients Suivis */}
        <div style={{ backgroundColor: 'white', borderRadius: '18px', padding: '20px', border: `1px solid ${COLORS.border}`, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Patients suivis
            </span>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
              <Users size={18} />
            </div>
          </div>
          {loading ? (
            <div style={{ height: '36px', width: '80px', backgroundColor: '#E2E8F0', borderRadius: '8px', marginTop: '10px' }} className="animate-pulse" />
          ) : (
            <>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: COLORS.navy, marginTop: '8px', letterSpacing: '-0.02em' }}>
                {totalUniquePatients}
              </div>
              <div style={{ fontSize: '0.78rem', color: COLORS.teal, fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TrendingUp size={13} />
                <span>+{currentMonthNewPatientsCount} événements ce mois</span>
              </div>
            </>
          )}
        </div>

        {/* Card 2: Événements Déclarés */}
        <div style={{ backgroundColor: 'white', borderRadius: '18px', padding: '20px', border: `1px solid ${COLORS.border}`, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Événements déclarés
            </span>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>
              <Activity size={18} />
            </div>
          </div>
          {loading ? (
            <div style={{ height: '36px', width: '80px', backgroundColor: '#E2E8F0', borderRadius: '8px', marginTop: '10px' }} className="animate-pulse" />
          ) : (
            <>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: COLORS.navy, marginTop: '8px', letterSpacing: '-0.02em' }}>
                {totalEvents}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#1D4ED8', fontWeight: '700', marginTop: '4px' }}>
                {currentMonthEventsCount} déclarés ce mois
              </div>
            </>
          )}
        </div>

        {/* Card 3: Événements Critiques */}
        <div 
          style={{ 
            backgroundColor: criticalEventsCount > 0 ? '#FEF2F2' : 'white', 
            borderRadius: '18px', 
            padding: '20px', 
            border: `1px solid ${criticalEventsCount > 0 ? '#FCA5A5' : COLORS.border}`, 
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)' 
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: criticalEventsCount > 0 ? '#B91C1C' : COLORS.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Événements critiques
            </span>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: criticalEventsCount > 0 ? '#FEE2E2' : '#F1F5F9', color: criticalEventsCount > 0 ? '#DC2626' : COLORS.muted }}>
              <ShieldAlert size={18} />
            </div>
          </div>
          {loading ? (
            <div style={{ height: '36px', width: '80px', backgroundColor: '#E2E8F0', borderRadius: '8px', marginTop: '10px' }} className="animate-pulse" />
          ) : (
            <>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: criticalEventsCount > 0 ? '#DC2626' : COLORS.navy, marginTop: '8px', letterSpacing: '-0.02em' }}>
                {criticalEventsCount}
              </div>
              <div style={{ fontSize: '0.78rem', color: criticalEventsCount > 0 ? '#B91C1C' : COLORS.muted, fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {criticalEventsCount > 0 ? (
                  <>
                    <AlertTriangle size={13} color="#DC2626" />
                    <span>Attention requise ({criticalRate}% du total)</span>
                  </>
                ) : (
                  <span>✓ Aucune urgence critique</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Card 4: Maladie la Plus Déclarée */}
        <div style={{ backgroundColor: 'white', borderRadius: '18px', padding: '20px', border: `1px solid ${COLORS.border}`, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Maladie la plus déclarée
            </span>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#FEF3C7', color: '#D97706' }}>
              <HeartPulse size={18} />
            </div>
          </div>
          {loading ? (
            <div style={{ height: '36px', width: '80px', backgroundColor: '#E2E8F0', borderRadius: '8px', marginTop: '10px' }} className="animate-pulse" />
          ) : (
            <>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: COLORS.navy, marginTop: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={topDiseaseName}>
                {topDiseaseName}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#D97706', fontWeight: '700', marginTop: '4px' }}>
                {topDiseaseCount} événement{topDiseaseCount > 1 ? 's' : ''} enregistré{topDiseaseCount > 1 ? 's' : ''}
              </div>
            </>
          )}
        </div>

      </div>

      {/* 3. PATIENT DEMOGRAPHICS & BLOOD TYPES (2 COLUMNS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '20px' }}>
        
        {/* Gender Distribution Card */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', border: `1px solid ${COLORS.border}`, padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: COLORS.navy, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PieChartIcon size={18} color={COLORS.teal} /> Profil des patients
              </h3>
              <p style={{ fontSize: '0.8rem', color: COLORS.muted, margin: '2px 0 0 0' }}>Répartition par sexe de la population suivie</p>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: COLORS.teal, backgroundColor: COLORS.lightTeal, padding: '4px 10px', borderRadius: '999px' }}>
              {demographics.totalUniquePatients} uniques
            </span>
          </div>

          {loading ? (
            <div style={{ height: '140px', backgroundColor: '#F8FAFC', borderRadius: '14px' }} className="animate-pulse" />
          ) : demographics.totalUniquePatients === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: COLORS.muted, fontSize: '0.88rem' }}>
              Aucune donnée patient disponible pour le moment.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Segmented Donut / Progress Bar */}
              <div style={{ height: '20px', width: '100%', backgroundColor: '#F1F5F9', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
                <div 
                  style={{ 
                    width: `${demographics.femalePct}%`, 
                    backgroundColor: '#EC4899', 
                    transition: 'width 0.5s ease-out' 
                  }} 
                  title={`Femmes: ${demographics.femalePct}%`} 
                />
                <div 
                  style={{ 
                    width: `${demographics.malePct}%`, 
                    backgroundColor: '#3B82F6', 
                    transition: 'width 0.5s ease-out' 
                  }} 
                  title={`Hommes: ${demographics.malePct}%`} 
                />
              </div>

              {/* Legend & Stat Boxes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ backgroundColor: '#FDF2F8', border: '1px solid #FBCFE8', borderRadius: '14px', padding: '14px 18px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#DB2777', fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EC4899' }} />
                    Femmes
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#9D174D', marginTop: '4px' }}>
                    {demographics.femalePct}%
                  </div>
                  <div style={{ fontSize: '0.78rem', color: COLORS.muted, marginTop: '2px' }}>
                    {demographics.femaleCount} patientes
                  </div>
                </div>

                <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '14px', padding: '14px 18px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B82F6' }} />
                    Hommes
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1E40AF', marginTop: '4px' }}>
                    {demographics.malePct}%
                  </div>
                  <div style={{ fontSize: '0.78rem', color: COLORS.muted, marginTop: '2px' }}>
                    {demographics.maleCount} patients
                  </div>
                </div>
              </div>

              {/* Derived Population Insight */}
              <div style={{ fontSize: '0.8rem', color: COLORS.muted, display: 'flex', alignItems: 'center', gap: '6px', fontStyle: 'italic', backgroundColor: '#F8FAFC', padding: '10px 14px', borderRadius: '10px' }}>
                <Sparkles size={14} color={COLORS.teal} />
                <span>
                  Population majoritairement {demographics.femalePct >= demographics.malePct ? `féminine (${demographics.femalePct}%)` : `masculine (${demographics.malePct}%)`}.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Blood Group Analytics Card */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', border: `1px solid ${COLORS.border}`, padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: COLORS.navy, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Droplet size={18} color="#DC2626" /> Groupes sanguins
              </h3>
              <p style={{ fontSize: '0.8rem', color: COLORS.muted, margin: '2px 0 0 0' }}>Distribution sérologique des patients connus</p>
            </div>
            {dominantBloodGroup && (
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#B91C1C', backgroundColor: '#FEE2E2', padding: '4px 10px', borderRadius: '999px' }}>
                Dominant: {dominantBloodGroup.label} ({dominantBloodGroup.pct}%)
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ height: '140px', backgroundColor: '#F8FAFC', borderRadius: '14px' }} className="animate-pulse" />
          ) : bloodTypeDist.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: COLORS.muted, fontSize: '0.88rem' }}>
              Aucun groupe sanguin enregistré.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {bloodTypeDist.slice(0, 5).map((b) => (
                <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', fontWeight: '800', color: COLORS.navy, fontSize: '0.85rem' }}>
                    {b.label}
                  </div>
                  <div style={{ flex: 1, backgroundColor: '#F1F5F9', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${Math.max(b.pct, b.count > 0 ? 5 : 0)}%`, 
                        backgroundColor: COLORS.teal, 
                        height: '100%', 
                        borderRadius: '6px',
                        transition: 'width 0.4s ease-out'
                      }} 
                    />
                  </div>
                  <div style={{ width: '55px', textAlign: 'right', fontSize: '0.8rem', fontWeight: '700', color: COLORS.text }}>
                    {b.count} <span style={{ color: COLORS.muted, fontWeight: '400', fontSize: '0.72rem' }}>({b.pct}%)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 4. HEALTH EVENTS BY DISEASE & SEVERITY DISTRIBUTION (2 COLUMNS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '20px' }}>
        
        {/* Horizontal Bar Chart: Diseases */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', border: `1px solid ${COLORS.border}`, padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: COLORS.navy, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart2 size={18} color={COLORS.teal} /> Maladies les plus déclarées
              </h3>
              <p style={{ fontSize: '0.8rem', color: COLORS.muted, margin: '2px 0 0 0' }}>Palmarès des pathologies signalées par vos soins</p>
            </div>
          </div>

          {loading ? (
            <div style={{ height: '180px', backgroundColor: '#F8FAFC', borderRadius: '14px' }} className="animate-pulse" />
          ) : topDiseases.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: COLORS.muted, fontSize: '0.88rem' }}>
              Aucun événement de santé enregistré pour le moment.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {topDiseases.slice(0, 6).map((d) => (
                <div key={d.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '700', color: COLORS.navy }}>
                    <span>{d.name}</span>
                    <span>{d.count} evt{d.count > 1 ? 's' : ''} ({d.pct}%)</span>
                  </div>
                  <div style={{ backgroundColor: '#F1F5F9', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${Math.max(d.pct, 4)}%`, 
                        backgroundColor: COLORS.navy, 
                        height: '100%',
                        borderRadius: '5px',
                        transition: 'width 0.4s ease-out'
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Severity Ring / Donut Distribution */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', border: `1px solid ${COLORS.border}`, padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: COLORS.navy, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color="#EA580C" /> Niveau de gravité
              </h3>
              <p style={{ fontSize: '0.8rem', color: COLORS.muted, margin: '2px 0 0 0' }}>Répartition des cas selon l'urgence médicale</p>
            </div>
          </div>

          {loading ? (
            <div style={{ height: '180px', backgroundColor: '#F8FAFC', borderRadius: '14px' }} className="animate-pulse" />
          ) : totalEvents === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: COLORS.muted, fontSize: '0.88rem' }}>
              Aucune donnée de gravité enregistrée.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Stacked Severity Bar */}
              <div style={{ height: '16px', width: '100%', backgroundColor: '#F1F5F9', borderRadius: '8px', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${(severityDist.LOW / totalEvents) * 100}%`, backgroundColor: '#3B82F6' }} title="Faible" />
                <div style={{ width: `${(severityDist.MEDIUM / totalEvents) * 100}%`, backgroundColor: '#F59E0B' }} title="Modérée" />
                <div style={{ width: `${(severityDist.HIGH / totalEvents) * 100}%`, backgroundColor: '#EA580C' }} title="Élevée" />
                <div style={{ width: `${(severityDist.CRITICAL / totalEvents) * 100}%`, backgroundColor: '#DC2626' }} title="Critique" />
              </div>

              {/* Grid Legend */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#1E40AF', textTransform: 'uppercase' }}>🟢 Faible</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1E3A8A', marginTop: '2px' }}>
                    {severityDist.LOW} <span style={{ fontSize: '0.75rem', fontWeight: '500', color: COLORS.muted }}>({Math.round((severityDist.LOW / totalEvents) * 100)}%)</span>
                  </div>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#92400E', textTransform: 'uppercase' }}>🟡 Modérée</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#78350F', marginTop: '2px' }}>
                    {severityDist.MEDIUM} <span style={{ fontSize: '0.75rem', fontWeight: '500', color: COLORS.muted }}>({Math.round((severityDist.MEDIUM / totalEvents) * 100)}%)</span>
                  </div>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: '#FFEDD5', border: '1px solid #FDBA74' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#9A3412', textTransform: 'uppercase' }}>🟠 Élevée</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#7C2D12', marginTop: '2px' }}>
                    {severityDist.HIGH} <span style={{ fontSize: '0.75rem', fontWeight: '500', color: COLORS.muted }}>({Math.round((severityDist.HIGH / totalEvents) * 100)}%)</span>
                  </div>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#991B1B', textTransform: 'uppercase' }}>🔴 Critique</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#7F1D1D', marginTop: '2px' }}>
                    {severityDist.CRITICAL} <span style={{ fontSize: '0.75rem', fontWeight: '500', color: COLORS.muted }}>({Math.round((severityDist.CRITICAL / totalEvents) * 100)}%)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* 5. ACTIVITY OVER TIME & ATTENTION REQUIRED (2 COLUMNS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '20px' }}>
        
        {/* Activity Over Time Line / Bar Visualization */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', border: `1px solid ${COLORS.border}`, padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: COLORS.navy, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color={COLORS.teal} /> Activité médicale
              </h3>
              <p style={{ fontSize: '0.8rem', color: COLORS.muted, margin: '2px 0 0 0' }}>Évolution du volume de déclarations dans le temps</p>
            </div>

            {/* Time Range Selector */}
            <div style={{ display: 'flex', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '10px', gap: '2px' }}>
              {(["7D", "30D", "6M", "12M"] as TimeRange[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTimeRange(r)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: timeRange === r ? 'white' : 'transparent',
                    color: timeRange === r ? COLORS.navy : COLORS.muted,
                    fontWeight: timeRange === r ? '800' : '600',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    boxShadow: timeRange === r ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  {r === '7D' ? '7j' : r === '30D' ? '30j' : r === '6M' ? '6 mois' : '1 an'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ height: '180px', backgroundColor: '#F8FAFC', borderRadius: '14px' }} className="animate-pulse" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Histogram Bar Chart curve */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '140px', paddingTop: '20px', borderBottom: `1px solid ${COLORS.border}` }}>
                {activityTimeSeries.map((pt) => {
                  const barHeightPct = Math.max((pt.count / maxActivityValue) * 100, 8);
                  return (
                    <div key={pt.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: '800', color: pt.count > 0 ? COLORS.navy : COLORS.muted, marginBottom: '4px' }}>
                        {pt.count}
                      </div>
                      <div 
                        style={{ 
                          width: '100%', 
                          maxWidth: '38px', 
                          height: `${barHeightPct}%`, 
                          backgroundColor: pt.count > 0 ? COLORS.teal : '#E2E8F0', 
                          borderRadius: '6px 6px 0 0',
                          transition: 'height 0.3s ease-out'
                        }} 
                      />
                      <div style={{ fontSize: '0.72rem', color: COLORS.muted, fontWeight: '600', marginTop: '6px', whiteSpace: 'nowrap' }}>
                        {pt.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: COLORS.muted }}>
                <span>Moyenne : <strong>{avgEventsPerPatient} evt / patient</strong></span>
                <span>Rapport d'activité : <strong>{totalEvents} déclarations</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Critical Attention Events List */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', border: `1px solid ${COLORS.border}`, padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: COLORS.navy, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color="#DC2626" /> À surveiller
              </h3>
              <p style={{ fontSize: '0.8rem', color: COLORS.muted, margin: '2px 0 0 0' }}>Événements graves ou critiques nécessitant une attention</p>
            </div>
            <Link to="/doctor/health-events" style={{ fontSize: '0.78rem', fontWeight: '700', color: COLORS.teal, textDecoration: 'none' }}>
              Tout voir →
            </Link>
          </div>

          {loading ? (
            <div style={{ height: '180px', backgroundColor: '#F8FAFC', borderRadius: '14px' }} className="animate-pulse" />
          ) : criticalAttentionEvents.length === 0 ? (
            <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', backgroundColor: '#F0FDF4', borderRadius: '14px', border: '1px solid #86EFAC', color: '#15803D' }}>
              <CheckCircle2 size={32} color="#16A34A" style={{ margin: '0 auto 8px auto' }} />
              <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>✓ Aucun événement critique</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '2px' }}>Toutes vos déclarations sont sous contrôle.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {criticalAttentionEvents.map((evt) => {
                const diseaseObj = Array.isArray(evt.reportable_disease) ? evt.reportable_disease[0] : evt.reportable_disease;
                const patientObj = Array.isArray(evt.patient) ? evt.patient[0] : evt.patient;

                return (
                  <Link
                    key={evt.id}
                    to="/doctor/health-events"
                    style={{
                      textDecoration: 'none',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: `1px solid ${evt.severity === 'CRITICAL' ? '#FCA5A5' : '#FDBA74'}`,
                      backgroundColor: evt.severity === 'CRITICAL' ? '#FEF2F2' : '#FFF7ED',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'transform 0.15s'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: '800', padding: '2px 8px', borderRadius: '999px', backgroundColor: evt.severity === 'CRITICAL' ? '#DC2626' : '#EA580C', color: 'white' }}>
                          {evt.severity === 'CRITICAL' ? '🔴 CRITIQUE' : '🟠 ÉLEVÉE'}
                        </span>
                        <span style={{ fontWeight: '800', color: COLORS.navy, fontSize: '0.9rem' }}>
                          {diseaseObj?.name || 'Maladie'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: COLORS.muted, marginTop: '4px' }}>
                        {getMaskedPatientId(patientObj)} • Déclaré le {formatDateTime(evt.created_at)}
                      </div>
                    </div>

                    <ArrowUpRight size={16} color={COLORS.muted} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* 6. RECENT HEALTH EVENTS TABLE */}
      <div style={{ backgroundColor: 'white', borderRadius: '20px', border: `1px solid ${COLORS.border}`, padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.08rem', fontWeight: '800', color: COLORS.navy, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color={COLORS.teal} /> Derniers événements déclarés
            </h3>
            <p style={{ fontSize: '0.8rem', color: COLORS.muted, margin: '2px 0 0 0' }}>Journal de vos signalements épidémiologiques récents</p>
          </div>

          <Link 
            to="/doctor/health-events" 
            style={{ 
              color: COLORS.teal, 
              textDecoration: 'none', 
              fontWeight: '700', 
              fontSize: '0.88rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px' 
            }}
          >
            <span>Voir tous les événements</span>
            <ChevronRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: COLORS.muted }}>Chargement du journal...</div>
        ) : doctorEvents.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: COLORS.muted }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: COLORS.navy, marginBottom: '6px' }}>
              Commencez votre suivi médical
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: COLORS.muted }}>
              Vous n'avez encore déclaré aucun événement de santé.
            </p>
            <Link
              to="/doctor/health-events"
              style={{
                backgroundColor: COLORS.teal,
                color: 'white',
                padding: '10px 20px',
                borderRadius: '10px',
                textDecoration: 'none',
                fontWeight: '700',
                fontSize: '0.88rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Plus size={16} />
              <span>Déclarer un événement</span>
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${COLORS.border}`, backgroundColor: '#F8FAFC' }}>
                  <th style={{ padding: '12px 16px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Maladie</th>
                  <th style={{ padding: '12px 16px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Patient ID</th>
                  <th style={{ padding: '12px 16px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gravité</th>
                  <th style={{ padding: '12px 16px', color: COLORS.navy, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date & Heure</th>
                </tr>
              </thead>
              <tbody>
                {doctorEvents.slice(0, 6).map((evt, idx) => {
                  const diseaseObj = Array.isArray(evt.reportable_disease) ? evt.reportable_disease[0] : evt.reportable_disease;
                  const patientObj = Array.isArray(evt.patient) ? evt.patient[0] : evt.patient;

                  return (
                    <tr key={evt.id} style={{ borderBottom: idx !== doctorEvents.slice(0, 6).length - 1 ? `1px solid ${COLORS.border}` : 'none' }}>
                      <td style={{ padding: '14px 16px', fontWeight: '800', color: COLORS.navy, fontSize: '0.9rem' }}>
                        🏥 {diseaseObj?.name || 'Maladie non spécifiée'}
                      </td>
                      <td style={{ padding: '14px 16px', color: COLORS.text, fontSize: '0.85rem', fontWeight: '600' }}>
                        {getMaskedPatientId(patientObj)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          backgroundColor: evt.severity === 'CRITICAL' ? '#FEE2E2' : evt.severity === 'HIGH' ? '#FFEDD5' : evt.severity === 'MEDIUM' ? '#FEF3C7' : '#DBEAFE',
                          color: evt.severity === 'CRITICAL' ? '#DC2626' : evt.severity === 'HIGH' ? '#EA580C' : evt.severity === 'MEDIUM' ? '#D97706' : '#2563EB',
                          padding: '3px 10px',
                          borderRadius: '999px',
                          fontSize: '0.78rem',
                          fontWeight: '700'
                        }}>
                          {evt.severity === 'CRITICAL' ? '🔴 Critique' : evt.severity === 'HIGH' ? '🟠 Élevée' : evt.severity === 'MEDIUM' ? '🟡 Modérée' : '🟢 Faible'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: COLORS.muted, fontSize: '0.85rem' }}>
                        {formatDateTime(evt.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 7. QUICK ACTIONS TOOLBAR */}
      <div style={{ backgroundColor: 'white', borderRadius: '20px', border: `1px solid ${COLORS.border}`, padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: '800', color: COLORS.navy, margin: '0 0 16px 0' }}>
          Actions rapides
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <Link
            to="/doctor/health-events"
            style={{
              backgroundColor: COLORS.teal,
              color: 'white',
              padding: '16px 20px',
              borderRadius: '14px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: '700',
              fontSize: '0.9rem',
              boxShadow: '0 4px 14px rgba(15, 162, 155, 0.25)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Plus size={18} />
              <span>+ Déclarer un événement</span>
            </div>
            <ChevronRight size={18} />
          </Link>

          <Link
            to="/doctor/patients"
            style={{
              backgroundColor: COLORS.navy,
              color: 'white',
              padding: '16px 20px',
              borderRadius: '14px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: '700',
              fontSize: '0.9rem',
              boxShadow: '0 4px 14px rgba(6, 44, 84, 0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <UserPlus size={18} color={COLORS.teal} />
              <span>+ Ajouter un patient</span>
            </div>
            <ChevronRight size={18} />
          </Link>

          <Link
            to="/doctor/patients"
            style={{
              backgroundColor: '#F8FAFC',
              color: COLORS.navy,
              border: `1px solid ${COLORS.border}`,
              padding: '16px 20px',
              borderRadius: '14px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: '700',
              fontSize: '0.9rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={18} color={COLORS.teal} />
              <span>Voir mes patients</span>
            </div>
            <ChevronRight size={18} color={COLORS.muted} />
          </Link>

          <Link
            to="/doctor/health-events"
            style={{
              backgroundColor: '#F8FAFC',
              color: COLORS.navy,
              border: `1px solid ${COLORS.border}`,
              padding: '16px 20px',
              borderRadius: '14px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: '700',
              fontSize: '0.9rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Activity size={18} color={COLORS.teal} />
              <span>Voir mes événements</span>
            </div>
            <ChevronRight size={18} color={COLORS.muted} />
          </Link>
        </div>
      </div>

    </div>
  );
}
