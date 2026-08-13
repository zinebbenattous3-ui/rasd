import * as XLSX from "xlsx";
import { ReportPayload } from "@/lib/reportsServer";
import { ReportModelKey } from "@/lib/pdfGenerator";
import { ALGERIA_WILAYAS_69, normalizeWilayaCode } from "@/lib/wilayas";

function getWilayaLabel(wilayaInput?: string): { code: string; name: string } {
  const norm = normalizeWilayaCode(wilayaInput || "16");
  const found = ALGERIA_WILAYAS_69.find(w => w.code === norm);
  return {
    code: norm || "16",
    name: found ? found.name : "Alger"
  };
}

// 1. Synthèse Sanitaire Excel
export function exportSynthesisExcel(payload: ReportPayload, wilayaInfo?: { code: string; name: string }): void {
  const workbook = XLSX.utils.book_new();
  const wilayaObj = getWilayaLabel(wilayaInfo?.code || payload.appliedScope.forcedWilaya);

  const summaryData = [
    { Métrique: "Titre du Rapport", Valeur: "RAPPORT DE SYNTHÈSE SANITAIRE" },
    { Métrique: "Wilaya d'Inspection", Valeur: `Wilaya ${wilayaObj.code} - ${wilayaObj.name}` },
    { Métrique: "Période d'Analyse", Valeur: payload.summary.dateRangeLabel },
    { Métrique: "Date de Génération", Valeur: payload.summary.generatedAt },
    { Métrique: "Généré par", Valeur: payload.summary.generatedBy },
    { Métrique: "Total Événements de Santé", Valeur: payload.summary.totalEvents },
    { Métrique: "Cas Critiques", Valeur: payload.summary.criticalCount },
    { Métrique: "Cas Élevés", Valeur: payload.summary.highCount },
    { Métrique: "Cas Moyens", Valeur: payload.summary.mediumCount },
    { Métrique: "Cas Faibles", Valeur: payload.summary.lowCount },
    { Métrique: "Établissements Surveillés", Valeur: payload.summary.totalFacilities },
    { Métrique: "Pathologies Déclarées", Valeur: payload.diseases.length },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryData), "SYNTHESE");

  const severityData = payload.severities.map(s => ({
    "Degré de Gravité": s.severity,
    "Nombre de Cas": s.count,
    "Pourcentage (%)": s.percentage
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(severityData), "GRAVITE");

  const diseaseData = payload.diseases.map(d => ({
    "Pathologie": d.name,
    "Cas Enregistrés": d.count,
    "Part Relative (%)": d.percentage
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(diseaseData), "PATHOLOGIES");

  const facData = payload.facilities.map(f => ({
    "Nom Établissement": f.name,
    "Type Structure": f.facilityType,
    "Wilaya": f.wilaya,
    "Signalements": f.count
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(facData), "ETABLISSEMENTS");

  const dateStr = new Date().toISOString().substring(0, 10);
  XLSX.writeFile(workbook, `RASED_Synthese_Sanitaire_Wilaya_${wilayaObj.code}_${wilayaObj.name.replace(/\s+/g, "_")}_${dateStr}.xlsx`);
}

// 2. Par Établissement Excel
export function exportFacilityExcel(payload: ReportPayload, wilayaInfo?: { code: string; name: string }): void {
  const workbook = XLSX.utils.book_new();
  const wilayaObj = getWilayaLabel(wilayaInfo?.code || payload.appliedScope.forcedWilaya);

  const facData = payload.facilities.map(f => {
    const facEvents = payload.events.filter(e => e.facilityName === f.name);
    const crit = facEvents.filter(e => e.severity === "CRITICAL").length;
    const high = facEvents.filter(e => e.severity === "HIGH").length;
    const med = facEvents.filter(e => e.severity === "MEDIUM").length;
    const low = facEvents.filter(e => e.severity === "LOW").length;

    return {
      "Nom Établissement": f.name,
      "Type Structure": f.facilityType,
      "Wilaya": f.wilaya || wilayaObj.code,
      "Total Cas": f.count,
      "Cas Critiques": crit,
      "Cas Élevés": high,
      "Cas Moyens": med,
      "Cas Faibles": low
    };
  });
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(facData), "PAR_ETABLISSEMENT");

  const dateStr = new Date().toISOString().substring(0, 10);
  XLSX.writeFile(workbook, `RASED_Rapport_Par_Etablissement_Wilaya_${wilayaObj.code}_${wilayaObj.name.replace(/\s+/g, "_")}_${dateStr}.xlsx`);
}

// 3. Par Pathologie Excel
export function exportPathologyExcel(payload: ReportPayload, wilayaInfo?: { code: string; name: string }): void {
  const workbook = XLSX.utils.book_new();
  const wilayaObj = getWilayaLabel(wilayaInfo?.code || payload.appliedScope.forcedWilaya);

  const diseaseData = payload.diseases.map(d => {
    const disEvents = payload.events.filter(e => e.diseaseName === d.name);
    const affectedFacs = new Set(disEvents.map(e => e.facilityName)).size;
    const critCount = disEvents.filter(e => e.severity === "CRITICAL").length;

    return {
      "Pathologie": d.name,
      "Cas Confirmés": d.count,
      "Part Relative (%)": d.percentage,
      "Établissements Touchés": affectedFacs,
      "Cas Critiques": critCount
    };
  });
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(diseaseData), "PAR_PATHOLOGIE");

  const dateStr = new Date().toISOString().substring(0, 10);
  XLSX.writeFile(workbook, `RASED_Rapport_Par_Pathologie_Wilaya_${wilayaObj.code}_${wilayaObj.name.replace(/\s+/g, "_")}_${dateStr}.xlsx`);
}

// 4. Par Gravité Excel
export function exportSeverityExcel(payload: ReportPayload, wilayaInfo?: { code: string; name: string }): void {
  const workbook = XLSX.utils.book_new();
  const wilayaObj = getWilayaLabel(wilayaInfo?.code || payload.appliedScope.forcedWilaya);

  const severityData = payload.severities.map(s => {
    const sevEvents = payload.events.filter(e => e.severity === s.severity);
    const affectedFacs = new Set(sevEvents.map(e => e.facilityName)).size;

    return {
      "Degré de Gravité": s.severity,
      "Nombre de Cas": s.count,
      "Pourcentage (%)": s.percentage,
      "Établissements Touchés": affectedFacs
    };
  });
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(severityData), "PAR_GRAVITE");

  const dateStr = new Date().toISOString().substring(0, 10);
  XLSX.writeFile(workbook, `RASED_Rapport_Par_Gravite_Wilaya_${wilayaObj.code}_${wilayaObj.name.replace(/\s+/g, "_")}_${dateStr}.xlsx`);
}

// 5. Registre Détaillé Excel
export function exportDetailedExcel(payload: ReportPayload, wilayaInfo?: { code: string; name: string }): void {
  const workbook = XLSX.utils.book_new();
  const wilayaObj = getWilayaLabel(wilayaInfo?.code || payload.appliedScope.forcedWilaya);

  const eventsData = payload.events.map(ev => ({
    "Réf. Cas": `#EV-${ev.id.substring(0, 8).toUpperCase()}`,
    "Date & Heure": ev.createdAt,
    "Pathologie": ev.diseaseName,
    "Niveau Gravité": ev.severity,
    "Établissement": ev.facilityName,
    "Type Structure": ev.facilityType,
    "Wilaya": ev.wilayaName || ev.wilaya,
    "Médecin Déclarant": ev.doctorName || "Anonymisé",
    "Spécialité Médecin": ev.doctorSpecialty || "-",
    "Patient": ev.patientName || "Cas Anonymisé",
    "NIN Patient": ev.patientNin || "-",
    "Observations": ev.description || "Aucune",
    "Preuve Médicale Attached": ev.patientProofUrl ? "Oui" : "Non"
  }));

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(eventsData.length > 0 ? eventsData : [{ Message: "Aucun événement" }]), "REGISTRE_DETAILE");

  const dateStr = new Date().toISOString().substring(0, 10);
  XLSX.writeFile(workbook, `RASED_Registre_Detaille_Wilaya_${wilayaObj.code}_${wilayaObj.name.replace(/\s+/g, "_")}_${dateStr}.xlsx`);
}

// MASTER ROUTER FOR EXCEL
export function generateModelExcel(modelKey: ReportModelKey, payload: ReportPayload, wilayaInfo?: { code: string; name: string }): void {
  switch (modelKey) {
    case "synthesis":
      return exportSynthesisExcel(payload, wilayaInfo);
    case "facility":
      return exportFacilityExcel(payload, wilayaInfo);
    case "pathology":
      return exportPathologyExcel(payload, wilayaInfo);
    case "severity":
      return exportSeverityExcel(payload, wilayaInfo);
    case "detailed":
      return exportDetailedExcel(payload, wilayaInfo);
  }
}

const REPORT_TYPE_TO_MODEL_KEY: Record<string, ReportModelKey> = {
  EXECUTIVE: "synthesis",
  FACILITY: "facility",
  DISEASE: "pathology",
  WILAYA: "severity",
  DETAILED_EVENTS: "detailed",
  synthesis: "synthesis",
  facility: "facility",
  pathology: "pathology",
  severity: "severity",
  detailed: "detailed",
};

export function generateReportExcel(
  payload: ReportPayload,
  modelKeyOverride?: ReportModelKey | string,
  wilayaInfo?: { code: string; name: string }
): void {
  const keyToUse = modelKeyOverride || payload.appliedScope?.reportType || "EXECUTIVE";
  const modelKey = REPORT_TYPE_TO_MODEL_KEY[keyToUse] || "synthesis";
  generateModelExcel(modelKey, payload, wilayaInfo);
}
