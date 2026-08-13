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

  // Brand Palette
  const navyColor: [number, number, number] = [6, 44, 84]; // #062C54
  const tealColor: [number, number, number] = [15, 162, 155]; // #0fa29b
  const lightBgColor: [number, number, number] = [248, 250, 252];
  const darkTextColor: [number, number, number] = [30, 41, 59];
  const mutedTextColor: [number, number, number] = [100, 116, 139];
  const borderLineColor: [number, number, number] = [226, 232, 240];

  // Helper for Header with RASED Logo & Branding
  const drawHeader = (pageNum: number) => {
    // Top Bar Navy Accent
    doc.setFillColor(...navyColor);
    doc.rect(0, 0, pageWidth, 14, "F");

    // Top Right Teal Accent
    doc.setFillColor(...tealColor);
    doc.rect(pageWidth - 35, 0, 35, 14, "F");

    // Draw Vector RASED Logo Icon Box
    doc.setFillColor(...tealColor);
    doc.roundedRect(margin, 2.5, 9, 9, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text("R", margin + 3.2, 8.5);

    // RASED Branding Text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("RASED", margin + 12, 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(200, 225, 245);
    doc.text("SYSTÈME NATIONAL DE VEILLE & SURVEILLANCE SANITAIRE", margin + 28, 9);

    if (pageNum > 1) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`Rapport : ${payload.summary.reportTitle}`, pageWidth - margin - 40, 9);
    }
  };

  // Helper for Footer with Page Numbers & Metadata
  const drawFooter = (pageNum: number, totalPages: number) => {
    const footerY = pageHeight - 10;

    doc.setDrawColor(...borderLineColor);
    doc.setLineWidth(0.4);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...tealColor);
    doc.text("RASED", margin, footerY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...mutedTextColor);
    doc.text(" | Document Officiel Confidentiel — République Algérienne Démocratique et Populaire", margin + 12, footerY);

    const pageStr = `Page ${pageNum} sur ${totalPages}`;
    doc.text(pageStr, pageWidth - margin - doc.getTextWidth(pageStr), footerY);
  };

  // -------------------------------------------------------------
  // REPORT TYPE IDENTIFICATION & DEDICATED LAYOUT ROUTING
  // -------------------------------------------------------------
  const titleUpper = (payload.summary.reportTitle || "").toUpperCase();

  let isFacilityReport = titleUpper.includes("ÉTABLISSEMENT") || titleUpper.includes("STRUCTURE");
  let isDiseaseReport = titleUpper.includes("PATHOLOGIE") || titleUpper.includes("MALADIE");
  let isSeverityReport = titleUpper.includes("GRAVITÉ") || titleUpper.includes("SÉVÉRITÉ");
  let isDetailedEventsReport = titleUpper.includes("REGISTRE") || titleUpper.includes("DÉTAILLÉ");

  drawHeader(1);
  let currentY = 22;

  // -------------------------------------------------------------
  // COMMON METADATA HEADER BLOCK
  // -------------------------------------------------------------
  doc.setFillColor(...lightBgColor);
  doc.setDrawColor(...tealColor);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 28, 4, 4, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...navyColor);
  doc.text(payload.summary.reportTitle.toUpperCase(), margin + 6, currentY + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...mutedTextColor);
  doc.text(`Période d'Analyse : ${payload.summary.dateRangeLabel}`, margin + 6, currentY + 16);
  doc.text(`Généré le : ${payload.summary.generatedAt} | Agent : ${payload.summary.generatedBy}`, margin + 6, currentY + 22);

  // Confidentiality Badge
  doc.setFillColor(220, 38, 38);
  doc.roundedRect(pageWidth - margin - 44, currentY + 5, 38, 6, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text("DOCUMENT CONFIDENTIEL", pageWidth - margin - 42, currentY + 9);

  currentY += 33;

  // Scope & Authorization Banner
  doc.setFillColor(240, 253, 250);
  doc.setDrawColor(204, 251, 241);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 11, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...tealColor);
  doc.text("PERIMÈTRE DE SURVEILLANCE :", margin + 4, currentY + 7);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkTextColor);
  doc.text(`${payload.appliedScope.userScopeDescription}`, margin + 52, currentY + 7);

  currentY += 16;

  // -------------------------------------------------------------
  // 1. REPORT MODEL: REGISTRE DÉTAILLÉ (Detailed Case Records)
  // -------------------------------------------------------------
  if (isDetailedEventsReport) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...navyColor);
    doc.text("REGISTRE OFFICIEL DÉTAILLÉ DES ÉVÉNEMENTS DE SANTÉ", margin, currentY);

    currentY += 6;

    const eventHeaders = ["Réf. Cas", "Date & Heure", "Pathologie", "Gravité", "Établissement & Wilaya", "Médecin Déclarant", "Patient (Anonymisé)"];

    const eventRows = payload.events.map((e) => {
      const dateFormatted = e.createdAt ? e.createdAt.replace("T", " à ").substring(0, 18) : "—";
      const idShort = `#EV-${e.id.substring(0, 8).toUpperCase()}`;
      const facStr = `${e.facilityName}\n(${e.wilayaName || e.wilaya})`;
      const docStr = e.doctorName ? `Dr. ${e.doctorName}` : "Médecin Déclarant";
      const patStr = e.patientName ? e.patientName : "Patient Anonymisé";

      return [idShort, dateFormatted, e.diseaseName, e.severity, facStr, docStr, patStr];
    });

    autoTable(doc, {
      startY: currentY,
      head: [eventHeaders],
      body: eventRows.length > 0 ? eventRows : [["Aucun événement trouvé", "-", "-", "-", "-", "-", "-"]],
      theme: "grid",
      headStyles: { fillColor: navyColor, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: darkTextColor },
      columnStyles: {
        0: { cellWidth: 22, fontStyle: "bold" },
        1: { cellWidth: 26 },
        2: { cellWidth: 28, fontStyle: "bold" },
        3: { cellWidth: 18 },
        4: { cellWidth: 34 },
        5: { cellWidth: 28 },
        6: { cellWidth: 26 },
      },
      margin: { left: margin, right: margin },
      didDrawPage: () => {
        drawHeader(doc.getNumberOfPages());
      },
    });
  }

  // -------------------------------------------------------------
  // 2. REPORT MODEL: PAR ÉTABLISSEMENT (Facility Report)
  // -------------------------------------------------------------
  else if (isFacilityReport) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...navyColor);
    doc.text("BILAN ANALYTIQUE PAR ÉTABLISSEMENT DE SANTÉ", margin, currentY);

    currentY += 6;

    const facRows = payload.facilities.map((fac) => {
      // Find facility events
      const facEvents = payload.events.filter((e) => e.facilityName === fac.name || e.address === fac.name);
      const critCount = facEvents.filter((e) => e.severity === "CRITICAL").length;
      const highCount = facEvents.filter((e) => e.severity === "HIGH").length;
      const medLowCount = facEvents.length - critCount - highCount;

      return [
        fac.name,
        fac.wilaya || "16",
        fac.facilityType || "Structure de Santé",
        `${fac.count} cas`,
        `${critCount} urgences`,
        `${highCount} élevés`,
        `${medLowCount} de routine`,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [["Établissement de Santé", "Wilaya", "Type", "Total Cas", "Cas Critiques", "Cas Élevés", "Autres Cas"]],
      body: facRows.length > 0 ? facRows : [["Aucun établissement répertorié", "-", "-", "0", "0", "0", "0"]],
      theme: "striped",
      headStyles: { fillColor: navyColor, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
      bodyStyles: { fontSize: 8, textColor: darkTextColor },
      columnStyles: {
        0: { cellWidth: 60, fontStyle: "bold" },
        1: { cellWidth: 22 },
        2: { cellWidth: 32 },
        3: { cellWidth: 18, fontStyle: "bold" },
        4: { cellWidth: 22 },
        5: { cellWidth: 18 },
        6: { cellWidth: 18 },
      },
      margin: { left: margin, right: margin },
      didDrawPage: () => {
        drawHeader(doc.getNumberOfPages());
      },
    });
  }

  // -------------------------------------------------------------
  // 3. REPORT MODEL: PAR PATHOLOGIE (Disease Report)
  // -------------------------------------------------------------
  else if (isDiseaseReport) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...navyColor);
    doc.text("BILAN ÉPIDÉMIOLOGIQUE PAR PATHOLOGIE SIGNALÉE", margin, currentY);

    currentY += 6;

    const diseaseRows = payload.diseases.map((d) => {
      const diseaseEvents = payload.events.filter((e) => e.diseaseName === d.name);
      const affectedFacs = new Set(diseaseEvents.map((e) => e.facilityName)).size;
      const criticalCount = diseaseEvents.filter((e) => e.severity === "CRITICAL").length;

      return [
        d.name,
        `${d.count} signalements`,
        `${d.percentage}% du total`,
        `${affectedFacs} établissement(s)`,
        `${criticalCount} cas critiques`,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [["Pathologie / Maladie Déclarable", "Cas Confirmés", "Part Relative", "Établissements Touchés", "Incidence Critique"]],
      body: diseaseRows.length > 0 ? diseaseRows : [["Aucune pathologie répertoriée", "0", "0%", "0", "0"]],
      theme: "grid",
      headStyles: { fillColor: tealColor, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
      bodyStyles: { fontSize: 8, textColor: darkTextColor },
      columnStyles: {
        0: { cellWidth: 65, fontStyle: "bold" },
        1: { cellWidth: 32, fontStyle: "bold" },
        2: { cellWidth: 28 },
        3: { cellWidth: 35 },
        4: { cellWidth: 30 },
      },
      margin: { left: margin, right: margin },
      didDrawPage: () => {
        drawHeader(doc.getNumberOfPages());
      },
    });
  }

  // -------------------------------------------------------------
  // 4. REPORT MODEL: PAR GRAVITÉ (Severity Report)
  // -------------------------------------------------------------
  else if (isSeverityReport) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...navyColor);
    doc.text("DISTRIBUTION DES ÉVÉNEMENTS PAR DEGRÉ DE GRAVITÉ", margin, currentY);

    currentY += 6;

    const severityMap: Record<string, string> = {
      CRITICAL: "CRITIQUE (Urgence Sanitaire Absolue)",
      HIGH: "ÉLEVÉE (Surveillance Épidémiologique Rapprochée)",
      MEDIUM: "MOYENNE (Cas Confirmé Standard)",
      LOW: "FAIBLE (Signalement de Routine)",
    };

    const severityRows = payload.severities.map((s) => {
      const sevEvents = payload.events.filter((e) => e.severity === s.severity);
      const facsCount = new Set(sevEvents.map((e) => e.facilityName)).size;
      const topDisease = sevEvents[0]?.diseaseName || "—";

      return [
        severityMap[s.severity] || s.severity,
        `${s.count} cas`,
        `${s.percentage}%`,
        `${facsCount} structure(s)`,
        topDisease,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [["Niveau de Gravité", "Total Cas", "Pourcentage", "Établissements Affectés", "Pathologie Principale"]],
      body: severityRows.length > 0 ? severityRows : [["Aucune donnée", "0", "0%", "0", "-"]],
      theme: "striped",
      headStyles: { fillColor: navyColor, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
      bodyStyles: { fontSize: 8, textColor: darkTextColor },
      columnStyles: {
        0: { cellWidth: 65, fontStyle: "bold" },
        1: { cellWidth: 22, fontStyle: "bold" },
        2: { cellWidth: 24 },
        3: { cellWidth: 38 },
        4: { cellWidth: 41 },
      },
      margin: { left: margin, right: margin },
      didDrawPage: () => {
        drawHeader(doc.getNumberOfPages());
      },
    });
  }

  // -------------------------------------------------------------
  // 5. REPORT MODEL: SYNTHÈSE SANITAIRE (Executive Summary Default)
  // -------------------------------------------------------------
  else {
    // Executive KPI Grid Cards (4 Cards)
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

      // Color Accent Bar
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

    // SECTION 1: SEVERITY TABLE
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
      body: severityRows.length > 0 ? severityRows : [["Aucun événement", "0", "0%"]],
      theme: "striped",
      headStyles: { fillColor: navyColor, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
      bodyStyles: { fontSize: 8, textColor: darkTextColor },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 45, fontStyle: "bold" },
        2: { cellWidth: 45 },
      },
      margin: { left: margin, right: margin },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // SECTION 2: TOP PATHOLOGIES TABLE
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
      head: [["Pathologie / Maladie", "Cas Enregistrés", "Part Relative"]],
      body: diseaseRows.length > 0 ? diseaseRows : [["Aucune pathologie", "0", "0%"]],
      theme: "grid",
      headStyles: { fillColor: tealColor, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
      bodyStyles: { fontSize: 8, textColor: darkTextColor },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 45, fontStyle: "bold" },
        2: { cellWidth: 45 },
      },
      margin: { left: margin, right: margin },
    });
  }

  // Draw Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

  // Download PDF file with standardized naming
  const dateStr = new Date().toISOString().substring(0, 10);
  const cleanTitle = payload.summary.reportTitle.replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `RASED_Rapport_${cleanTitle}_${dateStr}.pdf`;
  doc.save(fileName);
}
