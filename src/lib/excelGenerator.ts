import * as XLSX from "xlsx";
import { ReportPayload } from "@/lib/reportsServer";

export function generateReportExcel(payload: ReportPayload): void {
  const workbook = XLSX.utils.book_new();

  // SHEET 1: SYNTHESE EXECUTIQUE
  const summaryData = [
    { Metric: "Titre du Rapport", Valeur: payload.summary.reportTitle },
    { Metric: "Période d'Analyse", Valeur: payload.summary.dateRangeLabel },
    { Metric: "Date de Génération", Valeur: payload.summary.generatedAt },
    { Metric: "Généré par", Valeur: payload.summary.generatedBy },
    { Metric: "Rôle Utilisateur", Valeur: payload.userRole || "Inconnu" },
    { Metric: "Niveau de Confidentialité", Valeur: `Niveau ${payload.privacyLevel}` },
    { Metric: "Portée Appliquée", Valeur: payload.appliedScope.userScopeDescription },
    { Metric: "Total Événements de Santé", Valeur: payload.summary.totalEvents },
    { Metric: "Cas Critiques (Urgence)", Valeur: payload.summary.criticalCount },
    { Metric: "Cas Élevés", Valeur: payload.summary.highCount },
    { Metric: "Cas Moyens", Valeur: payload.summary.mediumCount },
    { Metric: "Cas Faibles", Valeur: payload.summary.lowCount },
    { Metric: "Nombre d'Établissements Actifs", Valeur: payload.summary.totalFacilities },
    { Metric: "Nombre de Médecins Déclarants", Valeur: payload.summary.totalDoctors },
    { Metric: "Nombre de Patients Uniques", Valeur: payload.summary.totalPatients },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "SYNTHESE");

  // SHEET 2: WILAYAS
  const wilayaData = payload.wilayas.map((w) => ({
    "Code Wilaya": w.code,
    "Nom Wilaya (Français)": w.name,
    "Nom Wilaya (Arabe)": w.nameAr,
    "Événements Enregistrés": w.count,
    "Pourcentage National (%)": w.percentage,
  }));
  const wilayaSheet = XLSX.utils.json_to_sheet(wilayaData.length > 0 ? wilayaData : [{ Message: "Aucune donnée" }]);
  XLSX.utils.book_append_sheet(workbook, wilayaSheet, "WILAYAS");

  // SHEET 3: ETABLISSEMENTS
  const facilityData = payload.facilities.map((f) => ({
    "ID Établissement": f.id,
    "Nom Établissement": f.name,
    "Type d'Établissement": f.facilityType,
    "Wilaya": f.wilaya,
    "Nombre d'Événements": f.count,
  }));
  const facilitySheet = XLSX.utils.json_to_sheet(facilityData.length > 0 ? facilityData : [{ Message: "Aucune donnée" }]);
  XLSX.utils.book_append_sheet(workbook, facilitySheet, "ETABLISSEMENTS");

  // SHEET 4: MALADIES / PATHOLOGIES
  const diseaseData = payload.diseases.map((d) => ({
    "ID Pathologie": d.id,
    "Nom de la Maladie": d.name,
    "Cas Enregistrés": d.count,
    "Part Nationale (%)": d.percentage,
  }));
  const diseaseSheet = XLSX.utils.json_to_sheet(diseaseData.length > 0 ? diseaseData : [{ Message: "Aucune donnée" }]);
  XLSX.utils.book_append_sheet(workbook, diseaseSheet, "MALADIES");

  // SHEET 5: DOCTEURS DECLARANTS
  const doctorData = payload.doctors.map((doc) => ({
    "ID Médecin": doc.id,
    "Nom du Médecin": doc.name,
    "Spécialité": doc.specialty,
    "Établissement Attribué": doc.facilityName,
    "Déclarations Effectuées": doc.count,
  }));
  const doctorSheet = XLSX.utils.json_to_sheet(doctorData.length > 0 ? doctorData : [{ Message: "Aucune donnée" }]);
  XLSX.utils.book_append_sheet(workbook, doctorSheet, "DOCTEURS");

  // SHEET 6: PATIENTS (Included only if authorized Level 3)
  if (payload.privacyLevel >= 3) {
    const patientMap: Record<string, { name: string; nin: string; dob: string; gender: string; bloodType: string; count: number }> = {};
    payload.events.forEach((ev) => {
      if (ev.patientNin) {
        const pObj = patientMap[ev.patientNin];
        if (!pObj) {
          patientMap[ev.patientNin] = {
            name: ev.patientName || "Anonyme",
            nin: ev.patientNin,
            dob: ev.patientDob || "-",
            gender: ev.patientGender || "-",
            bloodType: ev.patientBloodType || "-",
            count: 1,
          };
        } else {
          pObj.count += 1;
        }
      }
    });

    const patientData = Object.values(patientMap).map((p) => ({
      "NIN Patient": p.nin,
      "Nom & Prénom": p.name,
      "Date de Naissance": p.dob,
      "Sexe": p.gender,
      "Groupe Sanguin": p.bloodType,
      "Total Signalements": p.count,
    }));

    const patientSheet = XLSX.utils.json_to_sheet(patientData.length > 0 ? patientData : [{ Message: "Aucun patient répertorié" }]);
    XLSX.utils.book_append_sheet(workbook, patientSheet, "PATIENTS");
  }

  // SHEET 7: DETAILED HEALTH EVENTS
  const eventsData = payload.events.map((ev) => {
    const baseRecord: Record<string, any> = {
      "ID Événement": ev.id,
      "Date de Création": ev.createdAt,
      "Niveau de Gravité": ev.severity,
      "Maladie / Diagnostic": ev.diseaseName,
      "Établissement": ev.facilityName,
      "Type Établissement": ev.facilityType,
      "Wilaya": ev.wilayaName,
      "Adresse Établissement": ev.address,
      "Description": ev.description,
    };

    if (payload.privacyLevel >= 2) {
      baseRecord["Médecin Déclarant"] = ev.doctorName || "Anonymisé";
      baseRecord["Spécialité Médecin"] = ev.doctorSpecialty || "-";
    }

    if (payload.privacyLevel >= 3) {
      baseRecord["NIN Médecin"] = ev.doctorNin || "-";
      baseRecord["Téléphone Médecin"] = ev.doctorPhone || "-";
      baseRecord["Nom Patient"] = ev.patientName || "Anonymisé";
      baseRecord["NIN Patient"] = ev.patientNin || "-";
      baseRecord["Date de Naissance Patient"] = ev.patientDob || "-";
      baseRecord["Sexe Patient"] = ev.patientGender || "-";
      baseRecord["Groupe Sanguin Patient"] = ev.patientBloodType || "-";
      baseRecord["URL Preuve Médicale"] = ev.patientProofUrl || "Aucune preuve liée";
    }

    return baseRecord;
  });

  const eventsSheet = XLSX.utils.json_to_sheet(eventsData.length > 0 ? eventsData : [{ Message: "Aucun événement enregistré" }]);
  XLSX.utils.book_append_sheet(workbook, eventsSheet, "EVENEMENTS");

  // SHEET 8: TENDANCES TEMPORELLES
  const trendData = payload.trends.map((t) => ({
    "Date": t.date,
    "Nombre d'Événements": t.count,
  }));
  const trendSheet = XLSX.utils.json_to_sheet(trendData.length > 0 ? trendData : [{ Message: "Aucune tendance disponible" }]);
  XLSX.utils.book_append_sheet(workbook, trendSheet, "TENDANCES");

  // Download Excel File
  const dateStr = new Date().toISOString().substring(0, 10);
  const fileName = `RASED_Rapport_${payload.summary.reportTitle.replace(/[^a-zA-Z0-9]/g, "_")}_${dateStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
