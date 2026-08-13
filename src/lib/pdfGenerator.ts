import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ReportPayload } from "@/lib/reportsServer";
import { ALGERIA_WILAYAS_69, normalizeWilayaCode } from "@/lib/wilayas";

export type ReportModelKey = "synthesis" | "facility" | "pathology" | "severity" | "detailed";

// Brand Palette
const navyColor: [number, number, number] = [6, 44, 84]; // #062C54
const tealColor: [number, number, number] = [15, 162, 155]; // #0fa29b
const lightBgColor: [number, number, number] = [248, 250, 252];
const darkTextColor: [number, number, number] = [30, 41, 59];
const mutedTextColor: [number, number, number] = [100, 116, 139];
const borderLineColor: [number, number, number] = [226, 232, 240];

// Helper to format ISO date strings as DD/MM/YYYY à HH:mm
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

// Format Wilaya string for filenames and titles
function getWilayaLabel(wilayaInput?: string): { code: string; name: string; fullLabel: string } {
  const norm = normalizeWilayaCode(wilayaInput || "16");
  const found = ALGERIA_WILAYAS_69.find(w => w.code === norm);
  const code = norm || "16";
  const name = found ? found.name : "Alger";
  return {
    code,
    name,
    fullLabel: `Wilaya ${code} — ${name}`
  };
}

// Common PDF Document Header
function drawPdfHeader(doc: jsPDF, pageNum: number, docTitle: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top Bar Navy Accent
  doc.setFillColor(...navyColor);
  doc.rect(0, 0, pageWidth, 14, "F");

  // Top Right Teal Accent
  doc.setFillColor(...tealColor);
  doc.rect(pageWidth - 35, 0, 35, 14, "F");

  // Draw RASED Logo Icon Box
  doc.setFillColor(...tealColor);
  doc.roundedRect(14, 2.5, 9, 9, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("R", 17.2, 8.5);

  // RASED Branding Text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("RASED", 26, 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(200, 225, 245);
  doc.text("SYSTÈME NATIONAL DE VEILLE & SURVEILLANCE SANITAIRE", 42, 9);

  if (pageNum > 1) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(docTitle, pageWidth - 14 - doc.getTextWidth(docTitle), 9);
  }
}

// Common PDF Document Footer
function drawPdfFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - 10;

  doc.setDrawColor(...borderLineColor);
  doc.setLineWidth(0.4);
  doc.line(14, footerY - 4, pageWidth - 14, footerY - 4);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...tealColor);
  doc.text("RASED", 14, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...mutedTextColor);
  doc.text(" | Document Officiel Confidentiel — République Algérienne Démocratique et Populaire", 26, footerY);

  const pageStr = `Page ${pageNum} sur ${totalPages}`;
  doc.text(pageStr, pageWidth - 14 - doc.getTextWidth(pageStr), footerY);
}

// Render Document Metadata Title Box
function drawPdfTitleBox(doc: jsPDF, title: string, wilayaLabel: string, payload: ReportPayload): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let currentY = 20;

  doc.setFillColor(...lightBgColor);
  doc.setDrawColor(...tealColor);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 28, 4, 4, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...navyColor);
  doc.text(title.toUpperCase(), margin + 6, currentY + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...mutedTextColor);
  doc.text(`Périmètre d'Inspection : ${wilayaLabel} | Période : ${payload.summary.dateRangeLabel}`, margin + 6, currentY + 16);
  doc.text(`Généré le : ${payload.summary.generatedAt} | Agent : ${payload.summary.generatedBy}`, margin + 6, currentY + 22);

  // Confidentiality Badge
  doc.setFillColor(220, 38, 38);
  doc.roundedRect(pageWidth - margin - 44, currentY + 5, 38, 6, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text("DOCUMENT CONFIDENTIEL", pageWidth - margin - 42, currentY + 9);

  currentY += 33;
  return currentY;
}

// ----------------------------------------------------------------------
// 1. MODEL 1: SYNTHÈSE SANITAIRE
// ----------------------------------------------------------------------
export function generateSynthesisReport(payload: ReportPayload, wilayaInfo?: { code: string; name: string }): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  const wilayaObj = getWilayaLabel(wilayaInfo?.code || payload.appliedScope.forcedWilaya);
  const pdfTitle = "RAPPORT DE SYNTHÈSE SANITAIRE";

  drawPdfHeader(doc, 1, pdfTitle);
  let currentY = drawPdfTitleBox(doc, pdfTitle, wilayaObj.fullLabel, payload);

  // 4 Executive KPI Cards
  const cardWidth = (pageWidth - margin * 2 - 9) / 4;
  const cardHeight = 18;

  const kpis = [
    { label: "TOTAL ÉVÉNEMENTS", val: `${payload.summary.totalEvents}`, color: navyColor },
    { label: "CAS CRITIQUES", val: `${payload.summary.criticalCount}`, color: [220, 38, 38] as [number, number, number] },
    { label: "ÉTABLISSEMENTS", val: `${payload.summary.totalFacilities}`, color: tealColor },
    { label: "PATHOLOGIES", val: `${payload.diseases.length}`, color: [3, 105, 161] as [number, number, number] },
  ];

  kpis.forEach((kpi, idx) => {
    const cardX = margin + idx * (cardWidth + 3);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 3, 3, "FD");

    doc.setFillColor(...kpi.color);
    doc.rect(cardX, currentY, cardWidth, 2.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...mutedTextColor);
    doc.text(kpi.label, cardX + 4, currentY + 7);

    doc.setFontSize(12);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.val, cardX + 4, currentY + 14);
  });

  currentY += cardHeight + 8;

  // Table 1: Severity Distribution
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...navyColor);
  doc.text("01. DISTRIBUTION PAR NIVEAU DE GRAVITÉ", margin, currentY);
  currentY += 4;

  const severityRows = payload.severities.map(s => [
    s.severity === "CRITICAL" ? "CRITIQUE (Urgence Absolue)" :
    s.severity === "HIGH" ? "ÉLEVÉE (Surveillance Rapprochée)" :
    s.severity === "MEDIUM" ? "MOYENNE (Cas Confirmé)" : "FAIBLE (Signalement de Routine)",
    `${s.count} cas`,
    `${s.percentage}%`
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["Niveau de Gravité", "Nombre de Cas", "Part Relative (%)"]],
    body: severityRows.length > 0 ? severityRows : [["Aucun événement répertorié", "0", "0%"]],
    theme: "striped",
    headStyles: { fillColor: navyColor, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: darkTextColor },
    margin: { left: margin, right: margin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Table 2: Disease Summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...navyColor);
  doc.text("02. BILAN DES PATHOLOGIES DÉCLARÉES", margin, currentY);
  currentY += 4;

  const diseaseRows = payload.diseases.map(d => [d.name, `${d.count} cas`, `${d.percentage}%`]);

  autoTable(doc, {
    startY: currentY,
    head: [["Pathologie Déclarable", "Cas Confirmés", "Part Relative (%)"]],
    body: diseaseRows.length > 0 ? diseaseRows : [["Aucune pathologie", "0", "0%"]],
    theme: "grid",
    headStyles: { fillColor: tealColor, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: darkTextColor },
    margin: { left: margin, right: margin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Table 3: Facilities Summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...navyColor);
  doc.text("03. STRUCTURES SANITAIRES SOUS SURVEILLANCE", margin, currentY);
  currentY += 4;

  const facRows = payload.facilities.map(f => [f.name, f.facilityType || "Structure", f.wilaya || wilayaObj.code, `${f.count} cas`]);

  autoTable(doc, {
    startY: currentY,
    head: [["Nom de l'Établissement", "Type de Structure", "Wilaya", "Signalements Enregistrés"]],
    body: facRows.length > 0 ? facRows : [["Aucun établissement répertorié", "-", "-", "0"]],
    theme: "striped",
    headStyles: { fillColor: navyColor, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: darkTextColor },
    margin: { left: margin, right: margin }
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPdfFooter(doc, i, totalPages);
  }

  const dateStr = new Date().toISOString().substring(0, 10);
  doc.save(`RASED_Synthese_Sanitaire_Wilaya_${wilayaObj.code}_${wilayaObj.name.replace(/\s+/g, "_")}_${dateStr}.pdf`);
}

// ----------------------------------------------------------------------
// 2. MODEL 2: PAR ÉTABLISSEMENT
// ----------------------------------------------------------------------
export function generateFacilityReport(payload: ReportPayload, wilayaInfo?: { code: string; name: string }): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;

  const wilayaObj = getWilayaLabel(wilayaInfo?.code || payload.appliedScope.forcedWilaya);
  const pdfTitle = "RAPPORT ÉPIDÉMIOLOGIQUE PAR ÉTABLISSEMENT";

  drawPdfHeader(doc, 1, pdfTitle);
  let currentY = drawPdfTitleBox(doc, pdfTitle, wilayaObj.fullLabel, payload);

  // Group events by facility
  const facilityGroups: Record<string, { name: string; type: string; wilaya: string; events: typeof payload.events }> = {};

  payload.events.forEach(ev => {
    const facName = ev.facilityName || "Établissement Non Spécifié";
    if (!facilityGroups[facName]) {
      facilityGroups[facName] = {
        name: facName,
        type: ev.facilityType || "Structure de Santé",
        wilaya: ev.wilayaName || ev.wilaya || wilayaObj.fullLabel,
        events: []
      };
    }
    facilityGroups[facName].events.push(ev);
  });

  const facNames = Object.keys(facilityGroups);

  if (facNames.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...mutedTextColor);
    doc.text("Aucun événement enregistré pour les établissements de cette Wilaya.", margin, currentY);
  } else {
    facNames.forEach((facName) => {
      const facData = facilityGroups[facName];
      if (!facData) return;
      const crit = facData.events.filter(e => e.severity === "CRITICAL").length;
      const high = facData.events.filter(e => e.severity === "HIGH").length;
      const med = facData.events.filter(e => e.severity === "MEDIUM").length;
      const low = facData.events.filter(e => e.severity === "LOW").length;

      // Facility Section Header
      doc.setFillColor(...lightBgColor);
      doc.setDrawColor(...tealColor);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, currentY, doc.internal.pageSize.getWidth() - margin * 2, 16, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...navyColor);
      doc.text(`STRUCTURE : ${facData.name.toUpperCase()}`, margin + 4, currentY + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...mutedTextColor);
      doc.text(`Wilaya : ${facData.wilaya} | Total événements : ${facData.events.length} (Critiques: ${crit}, Élevés: ${high}, Moyens: ${med}, Faibles: ${low})`, margin + 4, currentY + 12);

      currentY += 20;

      // Pathology Breakdown Table for this facility
      const diseaseCounts: Record<string, number> = {};
      facData.events.forEach(e => {
        diseaseCounts[e.diseaseName] = (diseaseCounts[e.diseaseName] || 0) + 1;
      });

      const tableRows = Object.keys(diseaseCounts).map(dis => [dis, `${diseaseCounts[dis]} cas`]);

      autoTable(doc, {
        startY: currentY,
        head: [["Pathologie Déclarée", "Nombre de Cas"]],
        body: tableRows,
        theme: "striped",
        headStyles: { fillColor: navyColor, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: darkTextColor },
        columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 50, fontStyle: "bold" } },
        margin: { left: margin, right: margin }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    });
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPdfFooter(doc, i, totalPages);
  }

  const dateStr = new Date().toISOString().substring(0, 10);
  doc.save(`RASED_Rapport_Par_Etablissement_Wilaya_${wilayaObj.code}_${wilayaObj.name.replace(/\s+/g, "_")}_${dateStr}.pdf`);
}

// ----------------------------------------------------------------------
// 3. MODEL 3: PAR PATHOLOGIE
// ----------------------------------------------------------------------
export function generatePathologyReport(payload: ReportPayload, wilayaInfo?: { code: string; name: string }): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;

  const wilayaObj = getWilayaLabel(wilayaInfo?.code || payload.appliedScope.forcedWilaya);
  const pdfTitle = "RAPPORT DE SURVEILLANCE PAR PATHOLOGIE";

  drawPdfHeader(doc, 1, pdfTitle);
  let currentY = drawPdfTitleBox(doc, pdfTitle, wilayaObj.fullLabel, payload);

  // Group events by disease
  const diseaseGroups: Record<string, typeof payload.events> = {};
  payload.events.forEach(ev => {
    const dis = ev.diseaseName || "Maladie Non Spécifiée";
    if (!diseaseGroups[dis]) diseaseGroups[dis] = [];
    diseaseGroups[dis].push(ev);
  });

  const diseaseNames = Object.keys(diseaseGroups);

  if (diseaseNames.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...mutedTextColor);
    doc.text("Aucune pathologie répertoriée dans les signalements.", margin, currentY);
  } else {
    diseaseNames.forEach((disName) => {
      const disEvents = diseaseGroups[disName];
      if (!disEvents) return;
      const facSet = new Set(disEvents.map(e => e.facilityName));

      // Disease Header Block
      doc.setFillColor(...lightBgColor);
      doc.setDrawColor(...tealColor);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, currentY, doc.internal.pageSize.getWidth() - margin * 2, 14, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...navyColor);
      doc.text(`PATHOLOGIE : ${disName.toUpperCase()} (${disEvents.length} cas)`, margin + 4, currentY + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...mutedTextColor);
      doc.text(`Établissements concernés (${facSet.size}) : ${Array.from(facSet).join(", ")}`, margin + 4, currentY + 11);

      currentY += 18;

      // Table of events for this disease
      const rows = disEvents.map(e => [
        e.facilityName,
        e.severity,
        formatDateTime(e.createdAt)
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [["Établissement Déclarant", "Degré de Gravité", "Date & Heure Déclaration"]],
        body: rows,
        theme: "grid",
        headStyles: { fillColor: tealColor, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: darkTextColor },
        margin: { left: margin, right: margin }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    });
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPdfFooter(doc, i, totalPages);
  }

  const dateStr = new Date().toISOString().substring(0, 10);
  doc.save(`RASED_Rapport_Par_Pathologie_Wilaya_${wilayaObj.code}_${wilayaObj.name.replace(/\s+/g, "_")}_${dateStr}.pdf`);
}

// ----------------------------------------------------------------------
// 4. MODEL 4: PAR GRAVITÉ
// ----------------------------------------------------------------------
export function generateSeverityReport(payload: ReportPayload, wilayaInfo?: { code: string; name: string }): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;

  const wilayaObj = getWilayaLabel(wilayaInfo?.code || payload.appliedScope.forcedWilaya);
  const pdfTitle = "RAPPORT DE SURVEILLANCE PAR NIVEAU DE GRAVITÉ";

  drawPdfHeader(doc, 1, pdfTitle);
  let currentY = drawPdfTitleBox(doc, pdfTitle, wilayaObj.fullLabel, payload);

  // Overall Severity Distribution Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...navyColor);
  doc.text("RÉSUMÉ DES ÉVÉNEMENTS SELON LE DEGRÉ DE GRAVITÉ", margin, currentY);
  currentY += 4;

  const severityOrder: ("CRITICAL" | "HIGH" | "MEDIUM" | "LOW")[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  const severityLabels: Record<"CRITICAL" | "HIGH" | "MEDIUM" | "LOW", string> = {
    CRITICAL: "CRITIQUE",
    HIGH: "ÉLEVÉE",
    MEDIUM: "MOYENNE",
    LOW: "FAIBLE"
  };

  const summaryRows: string[][] = severityOrder.map(sev => {
    const matching = payload.events.filter(e => e.severity === sev);
    const pct = payload.summary.totalEvents > 0 ? ((matching.length / payload.summary.totalEvents) * 100).toFixed(0) : "0";
    const facCount = new Set(matching.map(e => e.facilityName)).size;
    const label = severityLabels[sev] || sev;
    return [label, `${matching.length}`, `${pct}%`, `${facCount} structure(s)`];
  });

  autoTable(doc, {
    startY: currentY,
    head: [["Niveau de Gravité", "Nombre de Cas", "Part Relative (%)", "Établissements Concernés"]],
    body: summaryRows,
    theme: "striped",
    headStyles: { fillColor: navyColor, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: darkTextColor },
    margin: { left: margin, right: margin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Breakdown sections for active severity levels
  severityOrder.forEach(sev => {
    const sevEvents = payload.events.filter(e => e.severity === sev);
    if (sevEvents.length > 0) {
      doc.setFillColor(sev === "CRITICAL" ? 220 : sev === "HIGH" ? 234 : 241, 245, 249);
      doc.setDrawColor(...tealColor);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, currentY, doc.internal.pageSize.getWidth() - margin * 2, 10, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...navyColor);
      doc.text(`DEGRÉ DE GRAVITÉ : ${severityLabels[sev]} (${sevEvents.length} cas)`, margin + 4, currentY + 6.5);

      currentY += 14;

      const rows = sevEvents.map(e => [
        e.diseaseName,
        e.facilityName,
        formatDateTime(e.createdAt),
        e.doctorName ? `Dr. ${e.doctorName}` : "Médecin Déclarant"
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [["Pathologie", "Établissement", "Date & Heure", "Médecin Déclarant"]],
        body: rows,
        theme: "grid",
        headStyles: { fillColor: tealColor, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5, textColor: darkTextColor },
        margin: { left: margin, right: margin }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPdfFooter(doc, i, totalPages);
  }

  const dateStr = new Date().toISOString().substring(0, 10);
  doc.save(`RASED_Rapport_Par_Gravite_Wilaya_${wilayaObj.code}_${wilayaObj.name.replace(/\s+/g, "_")}_${dateStr}.pdf`);
}

// ----------------------------------------------------------------------
// 5. MODEL 5: REGISTRE DÉTAILLÉ
// ----------------------------------------------------------------------
export function generateDetailedRegister(payload: ReportPayload, wilayaInfo?: { code: string; name: string }): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const wilayaObj = getWilayaLabel(wilayaInfo?.code || payload.appliedScope.forcedWilaya);
  const pdfTitle = "REGISTRE DÉTAILLÉ DES ÉVÉNEMENTS DE SANTÉ";

  drawPdfHeader(doc, 1, pdfTitle);
  let currentY = drawPdfTitleBox(doc, pdfTitle, wilayaObj.fullLabel, payload);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...navyColor);
  doc.text(`FICHES ET DOSSIERS INDIVIDUELS (${payload.events.length} signalements)`, margin, currentY);
  currentY += 6;

  if (payload.events.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...mutedTextColor);
    doc.text("Aucun événement de santé enregistré.", margin, currentY);
  } else {
    payload.events.forEach((ev, idx) => {
      // Check for page overflow before drawing case card
      if (currentY + 45 > pageHeight - 15) {
        doc.addPage();
        drawPdfHeader(doc, doc.getNumberOfPages(), pdfTitle);
        currentY = 20;
      }

      // Case Sheet Box
      doc.setFillColor(...lightBgColor);
      doc.setDrawColor(...borderLineColor);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, currentY, pageWidth - margin * 2, 40, 3, 3, "FD");

      // Case Header Bar
      doc.setFillColor(...navyColor);
      doc.rect(margin, currentY, pageWidth - margin * 2, 7, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`DOSSIER N° ${idx + 1} • RÉF. #EV-${ev.id.substring(0, 8).toUpperCase()}`, margin + 4, currentY + 5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(`Date : ${formatDateTime(ev.createdAt)}`, pageWidth - margin - 45, currentY + 5);

      let cardY = currentY + 12;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...navyColor);
      doc.text(`Pathologie : ${ev.diseaseName}`, margin + 4, cardY);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(ev.severity === "CRITICAL" ? 220 : 15, 162, 155);
      doc.text(`Gravité : ${ev.severity}`, margin + 110, cardY);

      cardY += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...darkTextColor);
      doc.text(`Établissement : ${ev.facilityName} (Wilaya ${ev.wilayaName || ev.wilaya})`, margin + 4, cardY);

      cardY += 5;
      doc.text(`Médecin Déclarant : Dr. ${ev.doctorName || "Anonymisé"} (${ev.doctorSpecialty || "Médecine Générale"})`, margin + 4, cardY);

      cardY += 5;
      doc.text(`Patient : ${ev.patientName || "Cas Anonymisé"} | NIN : ${ev.patientNin || "—"}`, margin + 4, cardY);

      cardY += 6;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(...mutedTextColor);
      doc.text(`Observations : « ${ev.description || "Aucune observation enregistrée"} »`, margin + 4, cardY);

      currentY += 45;
    });
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPdfFooter(doc, i, totalPages);
  }

  const dateStr = new Date().toISOString().substring(0, 10);
  doc.save(`RASED_Registre_Detaille_Wilaya_${wilayaObj.code}_${wilayaObj.name.replace(/\s+/g, "_")}_${dateStr}.pdf`);
}

// ----------------------------------------------------------------------
// MASTER ROUTER FUNCTION
// ----------------------------------------------------------------------
export function generateModelPDF(modelKey: ReportModelKey, payload: ReportPayload, wilayaInfo?: { code: string; name: string }): void {
  switch (modelKey) {
    case "synthesis":
      return generateSynthesisReport(payload, wilayaInfo);
    case "facility":
      return generateFacilityReport(payload, wilayaInfo);
    case "pathology":
      return generatePathologyReport(payload, wilayaInfo);
    case "severity":
      return generateSeverityReport(payload, wilayaInfo);
    case "detailed":
      return generateDetailedRegister(payload, wilayaInfo);
  }
}

// Legacy fallback export
export function generateReportPDF(payload: ReportPayload): void {
  generateSynthesisReport(payload);
}
