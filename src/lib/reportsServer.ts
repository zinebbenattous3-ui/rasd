import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/lib/supabase";
import { ALGERIA_WILAYAS_69, getWilayaByCode, getWilayaByName } from "@/lib/wilayas";
import { normalizeWilayaCode } from "@/lib/publicHealthMap";

export type ReportType = "EXECUTIVE" | "FACILITY" | "DISEASE" | "WILAYA" | "DETAILED_EVENTS";
export type ReportPrivacyLevel = 1 | 2 | 3; // 1 = Aggregated, 2 = Detailed (no patient ID), 3 = Maximum Detail

export interface ReportFilterInput {
  userId: string;
  sessionToken?: string | undefined;
  reportType: ReportType;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  wilaya?: string | undefined;
  facilityId?: string | undefined;
  facilityType?: string | undefined;
  diseaseId?: string | undefined;
  severity?: string | undefined;
  doctorId?: string | undefined;
  patientNin?: string | undefined;
}

export interface DiseaseStat {
  id: string;
  name: string;
  count: number;
  percentage: number;
}

export interface SeverityStat {
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  count: number;
  percentage: number;
}

export interface WilayaStat {
  code: string;
  name: string;
  nameAr: string;
  count: number;
  percentage: number;
}

export interface FacilityStat {
  id: string;
  name: string;
  facilityType: string;
  wilaya: string;
  count: number;
}

export interface DoctorStat {
  id: string;
  name: string;
  specialty: string;
  facilityName: string;
  count: number;
}

export interface TrendStat {
  date: string;
  count: number;
}

export interface EventDetailRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  incidentType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  diseaseName: string;
  facilityName: string;
  facilityType: string;
  wilaya: string;
  wilayaName: string;
  address: string;
  
  // Doctor details (Level 2 & 3)
  doctorName?: string;
  doctorSpecialty?: string;
  doctorNin?: string;
  doctorPhone?: string;
  
  // Patient details (Level 3 Only)
  patientName?: string;
  patientNin?: string;
  patientDob?: string;
  patientGender?: string;
  patientBloodType?: string;
  patientProofUrl?: string;
}

export interface ReportPayload {
  success: boolean;
  error?: string;
  userRole?: string;
  privacyLevel: ReportPrivacyLevel;
  appliedScope: {
    reportType?: ReportType | undefined;
    forcedWilaya?: string | undefined;
    forcedFacilityId?: string | undefined;
    forcedDoctorId?: string | undefined;
    userScopeDescription: string;
  };
  summary: {
    totalEvents: number;
    totalFacilities: number;
    totalDoctors: number;
    totalPatients: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    dateRangeLabel: string;
    generatedAt: string;
    generatedBy: string;
    reportTitle: string;
  };
  diseases: DiseaseStat[];
  severities: SeverityStat[];
  wilayas: WilayaStat[];
  facilities: FacilityStat[];
  doctors: DoctorStat[];
  trends: TrendStat[];
  events: EventDetailRecord[];
}

export const getReportDataServer = createServerFn({ method: "POST" })
  .validator((data: ReportFilterInput) => data)
  .handler(async ({ data }): Promise<ReportPayload> => {
    const defaultPayload: ReportPayload = {
      success: false,
      privacyLevel: 1,
      appliedScope: { userScopeDescription: "Non autorisé" },
      summary: {
        totalEvents: 0,
        totalFacilities: 0,
        totalDoctors: 0,
        totalPatients: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        dateRangeLabel: "Toutes dates",
        generatedAt: new Date().toISOString(),
        generatedBy: "Système RASED",
        reportTitle: "Rapport Sanitaire",
      },
      diseases: [],
      severities: [],
      wilayas: [],
      facilities: [],
      doctors: [],
      trends: [],
      events: [],
    };

    if (!data.userId) {
      return { ...defaultPayload, error: "Identifiant d'utilisateur requis." };
    }

    try {
      // 1. Authenticate user from DB
      const { data: userRec, error: userErr } = await supabase
        .from("users")
        .select("id, email, first_name, last_name, role, is_active")
        .eq("id", data.userId)
        .maybeSingle();

      if (userErr || !userRec || userRec.is_active === false) {
        return { ...defaultPayload, error: "Session non valide ou compte désactivé." };
      }

      const role = (userRec.role || "").toUpperCase();
      const userName = `${userRec.first_name || ""} ${userRec.last_name || ""}`.trim();

      let privacyLevel: ReportPrivacyLevel = 1;
      let forcedWilaya: string | undefined = undefined;
      let forcedFacilityId: string | undefined = undefined;
      let forcedDoctorId: string | undefined = undefined;
      let userScopeDescription = "";
      let authFacIds: string[] = [];

      // 2. Role-Based Authorization & Scope Computation
      if (role === "PATIENT" || role === "DOCTOR") {
        return { ...defaultPayload, error: "Accès refusé : Le centre de rapports est réservé aux Inspecteurs, Autorités de Santé et Superadministrateurs." };
      } else if (role === "SUPERADMIN") {
        privacyLevel = 3;
        userScopeDescription = "Toutes les Wilayas (Accès Observatoire National)";
      } else if (role === "HEALTH_AUTHORITY") {
        privacyLevel = 3;
        // Fetch authorized facilities linked to this Health Authority by created_by
        const { data: userFacs, error: facErr } = await supabase
          .from("facilities")
          .select("id, name, wilaya, facility_type")
          .eq("created_by", userRec.id);

        if (facErr || !userFacs || userFacs.length === 0) {
          // Fallback: If authority has not explicitly created facilities, check all facilities
          const { data: allFacs } = await supabase.from("facilities").select("id, name, wilaya, facility_type");
          authFacIds = (allFacs || []).map((f) => f.id);
        } else {
          authFacIds = userFacs.map((f) => f.id);
        }

        // Verify requested facilityId against authorized list
        if (data.facilityId) {
          if (authFacIds.length > 0 && !authFacIds.includes(data.facilityId)) {
            return { ...defaultPayload, error: "Accès refusé : Vous n'êtes pas autorisé à consulter cet établissement." };
          }
          forcedFacilityId = data.facilityId;
        }

        userScopeDescription = `Établissements sous gestion (${authFacIds.length} structure(s) autorisée(s))`;
      } else if (role === "INSPECTOR") {
        privacyLevel = 3;
        const { data: inspRec } = await supabase
          .from("inspectors")
          .select("wilaya")
          .eq("user_id", userRec.id)
          .maybeSingle();

        if (inspRec && inspRec.wilaya) {
          const normWilaya = normalizeWilayaCode(inspRec.wilaya) || inspRec.wilaya;
          forcedWilaya = normWilaya;

          // Reject if client requested a different wilaya
          if (data.wilaya && normalizeWilayaCode(data.wilaya) !== normWilaya) {
            console.warn(`[ReportCenter Audit] Inspector ${userRec.id} requested unauthorized wilaya ${data.wilaya}, forcing ${normWilaya}`);
          }

          const wilayaObj = ALGERIA_WILAYAS_69.find((w) => w.code === normWilaya);
          const wilayaLabel = wilayaObj ? `${normWilaya} — ${wilayaObj.name}` : normWilaya;
          userScopeDescription = `Wilaya ${wilayaLabel} (Portée Inspecteur Wilaya)`;
        } else {
          userScopeDescription = "Inspection Sanitaire — Portée Wilaya";
        }
      }

      // Audit Log console/server output
      console.log(`[ReportCenter Audit] User ${userRec.id} (${role}) requested report: ${data.reportType}, PrivacyLevel: ${privacyLevel}`);

      // 3. Query DB with strict filters
      let query = supabase
        .from("health_events")
        .select(`
          id,
          severity,
          description,
          patient_proof_url,
          created_at,
          updated_at,
          facilities!inner (
            id,
            name,
            facility_type,
            wilaya,
            address
          ),
          reportable_diseases!inner (
            id,
            name
          ),
          doctors!inner (
            id,
            specialty,
            phone,
            nin,
            users!inner (
              first_name,
              last_name
            )
          ),
          patients!inner (
            id,
            nin,
            date_of_birth,
            gender,
            blood_type,
            users!inner (
              first_name,
              last_name
            )
          )
        `);

      // Enforce Health Authority Facility Scope
      if (role === "HEALTH_AUTHORITY") {
        if (forcedFacilityId) {
          query = query.eq("facility_id", forcedFacilityId);
        } else if (authFacIds.length > 0) {
          query = query.in("facility_id", authFacIds);
        } else {
          return {
            ...defaultPayload,
            appliedScope: { userScopeDescription }
          };
        }
      } else {
        if (forcedFacilityId) {
          query = query.eq("facility_id", forcedFacilityId);
        } else if (data.facilityId) {
          query = query.eq("facility_id", data.facilityId);
        }
      }

      // Enforce forced or requested Wilaya scope (resilient ilike matching)
      if (forcedWilaya) {
        const normCode = normalizeWilayaCode(forcedWilaya) || forcedWilaya;
        query = query.ilike("facilities.wilaya", `%${normCode}%`);
      } else if (data.wilaya) {
        const normCode = normalizeWilayaCode(data.wilaya) || data.wilaya;
        query = query.ilike("facilities.wilaya", `%${normCode}%`);
      }

      if (data.facilityType) {
        query = query.eq("facilities.facility_type", data.facilityType);
      }

      if (data.diseaseId) {
        query = query.eq("reportable_disease_id", data.diseaseId);
      }

      if (data.severity) {
        query = query.eq("severity", data.severity);
      }

      if (data.doctorId) {
        query = query.eq("doctor_id", data.doctorId);
      }

      if (data.dateFrom) {
        const dFrom = new Date(data.dateFrom);
        dFrom.setHours(0, 0, 0, 0);
        query = query.gte("created_at", dFrom.toISOString());
      }
      if (data.dateTo) {
        const dTo = new Date(data.dateTo);
        dTo.setHours(23, 59, 59, 999);
        query = query.lte("created_at", dTo.toISOString());
      }

      const { data: rawEvents, error: fetchErr } = await query;

      if (fetchErr) {
        console.error("[ReportCenter] DB Query error:", fetchErr);
        return { ...defaultPayload, error: "Erreur lors de la récupération des données du rapport." };
      }

      const eventsList = rawEvents || [];

      // 4. Aggregations & Statistics
      const diseaseCounts: Record<string, { id: string; name: string; count: number }> = {};
      const severityCounts: Record<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL", number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
      const wilayaCounts: Record<string, number> = {};
      const facilityCounts: Record<string, { id: string; name: string; facilityType: string; wilaya: string; count: number }> = {};
      const doctorCounts: Record<string, { id: string; name: string; specialty: string; facilityName: string; count: number }> = {};
      const trendCounts: Record<string, number> = {};
      const patientSet = new Set<string>();

      const totalEvents = eventsList.length;

      const formattedEvents: EventDetailRecord[] = [];

      for (const ev of eventsList) {
        const facObj: any = Array.isArray(ev.facilities) ? ev.facilities[0] : ev.facilities;
        const disObj: any = Array.isArray(ev.reportable_diseases) ? ev.reportable_diseases[0] : ev.reportable_diseases;
        const docObj: any = Array.isArray(ev.doctors) ? ev.doctors[0] : ev.doctors;
        const patObj: any = Array.isArray(ev.patients) ? ev.patients[0] : ev.patients;

        const docUser = docObj?.users;
        const patUser = patObj?.users;

        // Disease stat
        const disId = disObj?.id || "unknown";
        const disName = disObj?.name || "Maladie non spécifiée";
        if (!diseaseCounts[disId]) {
          diseaseCounts[disId] = { id: disId, name: disName, count: 0 };
        }
        diseaseCounts[disId].count += 1;

        // Severity stat
        const sev = ev.severity as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
        if (severityCounts[sev] !== undefined) {
          severityCounts[sev] += 1;
        }

        // Wilaya stat
        const wCode = normalizeWilayaCode(facObj?.wilaya) || facObj?.wilaya || "unknown";
        wilayaCounts[wCode] = (wilayaCounts[wCode] || 0) + 1;

        // Facility stat
        const facId = facObj?.id || "unknown";
        if (!facilityCounts[facId]) {
          facilityCounts[facId] = {
            id: facId,
            name: facObj?.name || "Établissement inconnu",
            facilityType: facObj?.facility_type || "Autre",
            wilaya: wCode,
            count: 0,
          };
        }
        facilityCounts[facId].count += 1;

        // Doctor stat
        const dId = docObj?.id || "unknown";
        const dName = docUser ? `Dr. ${docUser.first_name} ${docUser.last_name}` : "Médecin Inconnu";
        if (!doctorCounts[dId]) {
          doctorCounts[dId] = {
            id: dId,
            name: dName,
            specialty: docObj?.specialty || "Généraliste",
            facilityName: facObj?.name || "Établissement",
            count: 0,
          };
        }
        doctorCounts[dId].count += 1;

        // Patient stat
        if (patObj?.id) {
          patientSet.add(patObj.id);
        }

        // Trend stat
        const dateKey = ev.created_at ? ev.created_at.substring(0, 10) : "N/A";
        trendCounts[dateKey] = (trendCounts[dateKey] || 0) + 1;

        // Formatted Detail Event according to Privacy Level
        const wObj = getWilayaByCode(wCode) || getWilayaByName(wCode);
        const wilayaFullName = wObj ? `${wObj.code} - ${wObj.name}` : wCode;

        const record: EventDetailRecord = {
          id: ev.id,
          createdAt: ev.created_at,
          updatedAt: ev.updated_at,
          incidentType: (ev as any).incident_type || "Signalement",
          severity: sev,
          description: ev.description,
          diseaseName: disName,
          facilityName: facObj?.name || "Inconnu",
          facilityType: facObj?.facility_type || "Autre",
          wilaya: wCode,
          wilayaName: wilayaFullName,
          address: facObj?.address || "",
        };

        // Level 2 & Level 3: Doctor Details
        if (privacyLevel >= 2) {
          record.doctorName = dName;
          record.doctorSpecialty = docObj?.specialty || "";
        }
        if (privacyLevel >= 3) {
          record.doctorNin = docObj?.nin;
          record.doctorPhone = docObj?.phone;
          
          // Level 3 Only: Patient Details
          if (patUser) {
            record.patientName = `${patUser.first_name} ${patUser.last_name}`;
          }
          record.patientNin = patObj?.nin;
          record.patientDob = patObj?.date_of_birth;
          record.patientGender = patObj?.gender === "M" ? "Homme" : patObj?.gender === "F" ? "Femme" : patObj?.gender;
          record.patientBloodType = patObj?.blood_type;
          record.patientProofUrl = ev.patient_proof_url;
        }

        formattedEvents.push(record);
      }

      // Convert aggregated maps to arrays
      const diseases: DiseaseStat[] = Object.values(diseaseCounts)
        .map((d) => ({ ...d, percentage: totalEvents > 0 ? Math.round((d.count / totalEvents) * 1000) / 10 : 0 }))
        .sort((a, b) => b.count - a.count);

      const severities: SeverityStat[] = (["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((sev) => ({
        severity: sev,
        count: severityCounts[sev] || 0,
        percentage: totalEvents > 0 ? Math.round(((severityCounts[sev] || 0) / totalEvents) * 1000) / 10 : 0,
      }));

      const wilayas: WilayaStat[] = Object.entries(wilayaCounts)
        .map(([code, count]) => {
          const w = getWilayaByCode(code) || getWilayaByName(code);
          return {
            code: code,
            name: w ? w.name : code,
            nameAr: w ? w.nameAr : "",
            count,
            percentage: totalEvents > 0 ? Math.round((count / totalEvents) * 1000) / 10 : 0,
          };
        })
        .sort((a, b) => b.count - a.count);

      const facilities: FacilityStat[] = Object.values(facilityCounts).sort((a, b) => b.count - a.count);
      const doctors: DoctorStat[] = Object.values(doctorCounts).sort((a, b) => b.count - a.count);
      const trends: TrendStat[] = Object.entries(trendCounts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const reportTitles: Record<ReportType, string> = {
        EXECUTIVE: "Rapport de Synthèse Sanitaire Nationale",
        FACILITY: "Rapport d'Évaluation par Établissement",
        DISEASE: "Rapport d'Analyse Épidémiologique par Pathologie",
        WILAYA: "Rapport Observatoire Régional par Wilaya",
        DETAILED_EVENTS: "Rapport Général des Événements de Santé",
      };

      let dateRangeLabel = "Toutes les dates enregistrées";
      if (data.dateFrom && data.dateTo) {
        dateRangeLabel = `Du ${data.dateFrom} au ${data.dateTo}`;
      } else if (data.dateFrom) {
        dateRangeLabel = `À partir du ${data.dateFrom}`;
      } else if (data.dateTo) {
        dateRangeLabel = `Jusqu'au ${data.dateTo}`;
      }

      return {
        success: true,
        userRole: role,
        privacyLevel,
        appliedScope: {
          reportType: data.reportType,
          forcedWilaya,
          forcedFacilityId,
          forcedDoctorId,
          userScopeDescription,
        },
        summary: {
          totalEvents,
          totalFacilities: Object.keys(facilityCounts).length,
          totalDoctors: Object.keys(doctorCounts).length,
          totalPatients: patientSet.size,
          criticalCount: severityCounts.CRITICAL || 0,
          highCount: severityCounts.HIGH || 0,
          mediumCount: severityCounts.MEDIUM || 0,
          lowCount: severityCounts.LOW || 0,
          dateRangeLabel,
          generatedAt: new Date().toLocaleString("fr-FR"),
          generatedBy: `${userName} (${role})`,
          reportTitle: reportTitles[data.reportType] || "Rapport Sanitaire",
        },
        diseases,
        severities,
        wilayas,
        facilities,
        doctors,
        trends,
        events: formattedEvents,
      };
    } catch (err: any) {
      console.error("[ReportCenter] Error handling report query:", err);
      return { ...defaultPayload, error: err.message || "Erreur serveur lors de la préparation du rapport." };
    }
  });
