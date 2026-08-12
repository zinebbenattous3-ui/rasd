import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ReportPayload } from "@/lib/reportsServer";

export function generateReportPDF(payload: ReportPayload): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const navyColor: [number, number, number] = [6, 44, 84]; // #062C54
  const tealColor: [number, number, number] = [15, 162, 155]; // #0fa29b
  const lightBgColor: [number, number, number] = [248, 250, 252];
  const darkTextColor: [number, number, number] = [30, 41, 59];
  const mutedTextColor: [number, number, number] = [100, 116, 139];

  // Helper for Header
  const drawHeader = (pageNum: number) => {
    // Top Bar Navy Accent
    doc.setFillColor(...navyColor);
    doc.rect(0, 0, pageWidth, 12, "F");

    // Top Right Teal Stripe
    doc.setFillColor(...tealColor);
    doc.rect(pageWidth - 35, 0, 35, 12, "F");

    // Top Header Text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("RASED — SYSTÈME NATIONAL DE VEILLE & SURVEILLANCE SANITAIRE", margin, 8);

    if (pageNum > 1) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(200, 220, 240);
      doc.text(`Rapport : ${payload.summary.reportTitle}`, pageWidth - margin - 40, 8);
    }
  };

  // Helper for Footer
  const drawFooter = (pageNum: number, totalPages: number) => {
    const footerY = pageHeight - 10;

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...tealColor);
    doc.text("RASED", margin, footerY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...mutedTextColor);
    doc.text(" | Document Administratif Confidentiel — Protection des Données Sanitaires", margin + 12, footerY);

    const pageStr = `Page ${pageNum} sur ${totalPages}`;
    doc.text(pageStr, pageWidth - margin - doc.getTextWidth(pageStr), footerY);
  };

  // PAGE 1: COVER & EXECUTIVE DASHBOARD
  drawHeader(1);

  let currentY = 22;

  // Document Title Box
  doc.setFillColor(...lightBgColor);
  doc.setDrawColor(...tealColor);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 28, 4, 4, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...navyColor);
  doc.text(payload.summary.reportTitle.toUpperCase(), margin + 6, currentY + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...mutedTextColor);
  doc.text(`Période : ${payload.summary.dateRangeLabel}`, margin + 6, currentY + 18);
  doc.text(`Généré le : ${payload.summary.generatedAt} par ${payload.summary.generatedBy}`, margin + 6, currentY + 23);

  // Confidentiality Badge
  doc.setFillColor(239, 68, 68);
  doc.roundedRect(pageWidth - margin - 42, currentY + 6, 36, 6, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("DONNÉES CONFIDENTIELLES", pageWidth - margin - 40, currentY + 10);

  currentY += 34;

  // Scope & Authorization Banner
  doc.setFillColor(240, 253, 250);
  doc.setDrawColor(204, 251, 241);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 12, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...tealColor);
  doc.text("PORTÉE ET ACCÈS SÉCURISÉ :", margin + 4, currentY + 7.5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkTextColor);
  doc.text(`${payload.appliedScope.userScopeDescription} (Niveau ${payload.privacyLevel})`, margin + 55, currentY + 7.5);

  currentY += 16;

  // Executive KPI Cards Grid (4 Cards)
  const cardWidth = (pageWidth - margin * 2 - 9) / 4;
  const cardHeight = 20;

  const kpis = [
    { label: "TOTAL ÉVÉNEMENTS", val: `${payload.summary.totalEvents}`, color: navyColor },
    { label: "CAS CRITIQUES", val: `${payload.summary.criticalCount}`, color: [220, 38, 38] as [number, number, number] },
    { label: "ÉTABLISSEMENTS", val: `${payload.summary.totalFacilities}`, color: tealColor },
    { label: "MÉDECINS DÉCLARANTS", val: `${payload.summary.totalDoctors}`, color: [3, 105, 161] as [number, number, number] },
  ];

  kpis.forEach((kpi, idx) => {
    const cardX = margin + idx * (cardWidth + 3);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 3, 3, "FD");

    // Color Accent Top Bar
    doc.setFillColor(...kpi.color);
    doc.rect(cardX, currentY, cardWidth, 2.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...mutedTextColor);
    doc.text(kpi.label, cardX + 4, currentY + 8);

    doc.setFontSize(13);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.val, cardX + 4, currentY + 16);
  });

  currentY += cardHeight + 10;

  // SECTION 1: SEVERITY BREAKDOWN TABLE
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...navyColor);
  doc.text("01. RÉPARTITION DES ÉVÉNEMENTS PAR GRAVITÉ", margin, currentY);

  currentY += 4;

  const severityRows = payload.severities.map((s) => {
    const labels: Record<string, string> = {
      CRITICAL: "CRITIQUE (Urgence Absolue)",
      HIGH: "ÉLEVÉE (Surveillance Rapprochée)",
      MEDIUM: "MOYENNE (Cas Confirmé)",
      LOW: "FAIBLE (Signalement De Routine)",
    };
    return [labels[s.severity] || s.severity, `${s.count} cas`, `${s.percentage}%`];
  });

  autoTable(doc, {
    startY: currentY,
    head: [["Niveau de Gravité", "Nombre de Cas", "Pourcentage"]],
    body: severityRows,
    theme: "striped",
    headStyles: { fillColor: navyColor, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: darkTextColor },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 40, fontStyle: "bold" },
      2: { cellWidth: 40 },
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // SECTION 2: TOP REPORTABLE DISEASES
  if (currentY + 40 > pageHeight) {
    doc.addPage();
    drawHeader(doc.getNumberOfPages());
    currentY = 22;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...navyColor);
  doc.text("02. PATHOLOGIES ET MALADIES À DÉCLARATION OBLIGATOIRE", margin, currentY);

  currentY += 4;

  const diseaseRows = payload.diseases.map((d) => [d.name, `${d.count} cas`, `${d.percentage}%`]);

  autoTable(doc, {
    startY: currentY,
    head: [["Pathologie / Maladie", "Cas Enregistrés", "Part Nationale"]],
    body: diseaseRows.length > 0 ? diseaseRows : [["Aucune donnée enregistrée", "0", "0%"]],
    theme: "grid",
    headStyles: { fillColor: tealColor, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: darkTextColor },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 40, fontStyle: "bold" },
      2: { cellWidth: 40 },
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // SECTION 3: WILAYAS & FACILITIES BREAKDOWN
  if (currentY + 40 > pageHeight) {
    doc.addPage();
    drawHeader(doc.getNumberOfPages());
    currentY = 22;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...navyColor);
  doc.text("03. COUVERTURE RÉGIONALE PAR WILAYA ET ÉTABLISSEMENT", margin, currentY);

  currentY += 4;

  const wilayaRows = payload.wilayas.slice(0, 15).map((w) => [`Wilaya ${w.code} - ${w.name}`, w.nameAr, `${w.count} cas`, `${w.percentage}%`]);

  autoTable(doc, {
    startY: currentY,
    head: [["Wilaya (Algérie)", "Nom Arabe", "Cas Enregistrés", "Pourcentage"]],
    body: wilayaRows.length > 0 ? wilayaRows : [["Aucune wilaya enregistrée", "-", "0", "0%"]],
    theme: "striped",
    headStyles: { fillColor: navyColor, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: darkTextColor },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 50 },
      2: { cellWidth: 30, fontStyle: "bold" },
      3: { cellWidth: 30 },
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // SECTION 4: DETAILED EVENTS LIST (For Authorized Users Level 2 / Level 3)
  if (payload.events.length > 0) {
    doc.addPage();
    drawHeader(doc.getNumberOfPages());
    currentY = 22;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...navyColor);
    doc.text("04. REGISTRE DÉTAILLÉ DES ÉVÉNEMENTS DE SANTÉ", margin, currentY);

    currentY += 4;

    const eventHeaders = payload.privacyLevel >= 3
      ? ["ID / Date", "Maladie", "Gravité", "Établissement & Wilaya", "Médecin Déclarant", "Patient (Identité)"]
      : ["ID / Date", "Maladie", "Gravité", "Établissement & Wilaya", "Médecin Déclarant"];

    const eventRows = payload.events.map((e) => {
      const dateFormatted = e.createdAt ? e.createdAt.substring(0, 10) : "";
      const idShort = e.id.substring(0, 8);
      const facStr = `${e.facilityName}\nWilaya ${e.wilayaName}`;
      const docStr = e.doctorName ? `${e.doctorName}\n${e.doctorSpecialty || ""}` : "Non spécifié";

      if (payload.privacyLevel >= 3) {
        const patStr = e.patientName
          ? `${e.patientName}\nNIN: ${e.patientNin || "-"}\nNé(e): ${e.patientDob || "-"} (${e.patientBloodType || "-"})`
          : "Anonymisé";
        return [`#${idShort}\n${dateFormatted}`, e.diseaseName, e.severity, facStr, docStr, patStr];
      }

      return [`#${idShort}\n${dateFormatted}`, e.diseaseName, e.severity, facStr, docStr];
    });

    autoTable(doc, {
      startY: currentY,
      head: [eventHeaders],
      body: eventRows,
      theme: "grid",
      headStyles: { fillColor: navyColor, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: darkTextColor },
      columnStyles: payload.privacyLevel >= 3 ? {
        0: { cellWidth: 25 },
        1: { cellWidth: 32, fontStyle: "bold" },
        2: { cellWidth: 20 },
        3: { cellWidth: 38 },
        4: { cellWidth: 34 },
        5: { cellWidth: 33 },
      } : {
        0: { cellWidth: 30 },
        1: { cellWidth: 40, fontStyle: "bold" },
        2: { cellWidth: 25 },
        3: { cellWidth: 45 },
        4: { cellWidth: 42 },
      },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => {
        drawHeader(doc.getNumberOfPages());
      },
    });
  }

  // Draw Footer on all generated pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

  // Download PDF file
  const dateStr = new Date().toISOString().substring(0, 10);
  const fileName = `RASED_Rapport_Sanitaire_${payload.summary.reportTitle.replace(/[^a-zA-Z0-9]/g, "_")}_${dateStr}.pdf`;
  doc.save(fileName);
}
