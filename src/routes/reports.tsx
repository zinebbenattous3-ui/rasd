import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ALGERIA_WILAYAS_69 } from "@/lib/wilayas";
import { validateCurrentSession, getStoredSession, AuthenticatedUser } from "@/lib/auth";
import { getReportDataServer, ReportPayload, ReportType } from "@/lib/reportsServer";
import { generateReportPDF } from "@/lib/pdfGenerator";
import { generateReportExcel } from "@/lib/excelGenerator";
import {
  FileText,
  FileSpreadsheet,
  Download,
  Filter,
  RefreshCw,
  ShieldCheck,
  Building2,
  Activity,
  AlertTriangle,
  Users,
  Calendar,
  MapPin,
  Stethoscope,
  Info,
  CheckCircle2,
  ArrowLeft,
  ChevronDown,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Centre de Rapports & Observatoire — Rased — Réseau National de Veille Sanitaire" },
      {
        name: "description",
        content:
          "Génération sécurisée de rapports sanitaires officiels au format PDF et Excel pour les autorités et établissements d'Algérie.",
      },
    ],
  }),
  component: ReportsPage,
});

export function ReportsPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Filters State
  const [reportType, setReportType] = useState<ReportType>("EXECUTIVE");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedWilaya, setSelectedWilaya] = useState<string>("");
  const [selectedFacilityType, setSelectedFacilityType] = useState<string>("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("");
  const [patientNinInput, setPatientNinInput] = useState<string>("");

  // Data Loading & Generation States
  const [reportData, setReportData] = useState<ReportPayload | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [generatingFormat, setGeneratingFormat] = useState<"pdf" | "excel" | null>(null);
  const [generationStep, setGenerationStep] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "severities" | "diseases" | "wilayas" | "events">("summary");

  // Validate Authentication on Mount
  useEffect(() => {
    async function verifyAuth() {
      const authResult = await validateCurrentSession(["DOCTOR", "INSPECTOR", "HEALTH_AUTHORITY", "SUPERADMIN"]);
      if (!authResult.authorized) {
        navigate({ to: authResult.redirectTo || "/login" as any });
        return;
      }
      if (authResult.user) {
        setCurrentUser(authResult.user);
      }
      setAuthChecking(false);
    }
    verifyAuth();
  }, []);

  // Fetch Report Data from Server
  const fetchReport = async () => {
    const session = getStoredSession();
    if (!session || !session.userId) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await getReportDataServer({
        data: {
          userId: session.userId,
          sessionToken: session.token,
          reportType,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          wilaya: selectedWilaya || undefined,
          facilityType: selectedFacilityType || undefined,
          severity: selectedSeverity || undefined,
          patientNin: patientNinInput.trim() || undefined,
        },
      });

      if (res.success) {
        setReportData(res);
      } else {
        setErrorMsg(res.error || "Impossible d'obtenir les données du rapport.");
      }
    } catch (err: any) {
      console.error("Report fetch error:", err);
      setErrorMsg(err.message || "Erreur de connexion au serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial Data Load
  useEffect(() => {
    if (!authChecking && currentUser) {
      fetchReport();
    }
  }, [authChecking, currentUser, reportType]);

  // PDF Generation Handler
  const handleGeneratePDF = async () => {
    if (!reportData || reportData.summary.totalEvents === 0) return;
    setGeneratingFormat("pdf");
    setGenerationStep("Préparation des données sécurisées...");

    setTimeout(() => {
      setGenerationStep("Rendu du document PDF A4...");
      setTimeout(() => {
        try {
          generateReportPDF(reportData);
          setGenerationStep("Document PDF téléchargé avec succès !");
        } catch (err: any) {
          console.error("PDF generation failed:", err);
          setErrorMsg("Erreur lors du rendu PDF.");
        } finally {
          setTimeout(() => setGeneratingFormat(null), 1500);
        }
      }, 400);
    }, 300);
  };

  // Excel Generation Handler
  const handleGenerateExcel = async () => {
    if (!reportData || reportData.summary.totalEvents === 0) return;
    setGeneratingFormat("excel");
    setGenerationStep("Génération du classeur Excel multi-feuilles...");

    setTimeout(() => {
      try {
        generateReportExcel(reportData);
        setGenerationStep("Classeur XLSX exporté avec succès !");
      } catch (err: any) {
        console.error("Excel generation failed:", err);
        setErrorMsg("Erreur lors de la création du fichier Excel.");
      } finally {
        setTimeout(() => setGeneratingFormat(null), 1500);
      }
    }, 400);
  };

  if (authChecking) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#062C54", color: "white" }}>
        <div style={{ textAlign: "center" }}>
          <RefreshCw size={36} className="animate-spin" style={{ margin: "0 auto 1rem auto", color: "#0fa29b" }} />
          <div style={{ fontSize: "1.1rem", fontWeight: "700" }}>Vérification des autorisations RASED...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#f8fafc", fontFamily: "sans-serif" }}>
      <Navbar />

      <main style={{ flex: 1, padding: "2.5rem 1rem", maxWidth: "1280px", margin: "0 auto", width: "100%" }}>
        {/* BREADCRUMB & HEADER */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.75rem" }}>
            <Link
              to="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.85rem",
                color: "#64748B",
                textDecoration: "none",
                fontWeight: "600",
              }}
            >
              <ArrowLeft size={14} /> Accueil
            </Link>
            <span style={{ color: "#CBD5E1" }}>/</span>
            <span style={{ fontSize: "0.85rem", color: "#0fa29b", fontWeight: "700" }}>Centre de Rapports RASED</span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#E0F2FE", color: "#0369A1", padding: "4px 12px", borderRadius: "999px", fontSize: "0.78rem", fontWeight: "800", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                <FileText size={14} /> Module d'Édition Officiel & Exportation
              </div>
              <h1 style={{ fontSize: "2.2rem", fontWeight: "900", color: "#062C54", letterSpacing: "-0.02em", margin: 0 }}>
                Centre de Rapports & Observatoire Sanitaire
              </h1>
              <p style={{ color: "#64748B", fontSize: "1rem", marginTop: "0.4rem", maxWidth: "720px" }}>
                Générez des synthèses d'évaluation sanitaire au format PDF A4 et Excel multi-feuilles avec filtrage strict et contrôle de confidentialité serveur.
              </p>
            </div>

            {/* AUTHORIZATION & PRIVACY BADGE */}
            {reportData && (
              <div style={{ backgroundColor: "#FFFFFF", padding: "12px 18px", borderRadius: "16px", border: "1.5px solid #E2E8F0", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: "0.72rem", color: "#64748B", fontWeight: "700", textTransform: "uppercase" }}>Habilitation RASED</div>
                <div style={{ fontSize: "0.95rem", fontWeight: "900", color: "#062C54", display: "flex", alignItems: "center", gap: "6px" }}>
                  <ShieldCheck size={18} color="#10B981" />
                  {reportData.appliedScope.userScopeDescription}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#0fa29b", fontWeight: "700", marginTop: "2px" }}>
                  Données Autorisées : Niveau {reportData.privacyLevel} / 3
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ERROR DISPLAY BANNER */}
        {errorMsg && (
          <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", padding: "12px 16px", borderRadius: "14px", color: "#991B1B", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertTriangle size={20} color="#DC2626" />
            <div style={{ fontSize: "0.9rem", fontWeight: "700" }}>{errorMsg}</div>
          </div>
        )}

        {/* MAIN WORKSPACE GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }} className="lg:grid-cols-4">
          {/* FILTERS SIDEBAR (1 COL) */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "20px",
              padding: "1.5rem",
              border: "1.5px solid #E2E8F0",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #E2E8F0", paddingBottom: "0.75rem" }}>
              <div style={{ fontSize: "1rem", fontWeight: "800", color: "#062C54", display: "flex", alignItems: "center", gap: "8px" }}>
                <Filter size={18} color="#0fa29b" /> Filtres du Rapport
              </div>
              <button
                onClick={fetchReport}
                disabled={isLoading}
                title="Actualiser les données"
                style={{ background: "transparent", border: "none", color: "#0fa29b", cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>

            {/* Filter: Report Type */}
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: "800", color: "#475569", display: "block", marginBottom: "0.4rem" }}>
                Type de Rapport
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "10px", border: "1px solid #CBD5E1", fontSize: "0.88rem", outline: "none", backgroundColor: "#F8FAFC" }}
              >
                <option value="EXECUTIVE">Synthèse Sanitaire Nationale</option>
                <option value="FACILITY">Rapport par Établissement</option>
                <option value="DISEASE">Analyse Épidémiologique par Pathologie</option>
                <option value="WILAYA">Observatoire Régional par Wilaya</option>
                <option value="DETAILED_EVENTS">Registre Général des Événements</option>
              </select>
            </div>

            {/* Filter: Date Range */}
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: "800", color: "#475569", display: "block", marginBottom: "0.4rem" }}>
                Période (Du / Au)
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "0.82rem" }}
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "0.82rem" }}
                />
              </div>
            </div>

            {/* Filter: Wilaya */}
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: "800", color: "#475569", display: "block", marginBottom: "0.4rem" }}>
                Wilaya (69 Wilayas)
              </label>
              <select
                value={selectedWilaya}
                onChange={(e) => setSelectedWilaya(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "10px", border: "1px solid #CBD5E1", fontSize: "0.85rem", outline: "none" }}
              >
                <option value="">Toutes les Wilayas</option>
                {ALGERIA_WILAYAS_69.map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.code} - {w.name} ({w.nameAr})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter: Facility Type */}
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: "800", color: "#475569", display: "block", marginBottom: "0.4rem" }}>
                Type d'Établissement
              </label>
              <select
                value={selectedFacilityType}
                onChange={(e) => setSelectedFacilityType(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "10px", border: "1px solid #CBD5E1", fontSize: "0.85rem", outline: "none" }}
              >
                <option value="">Tous les Types</option>
                <option value="Hôpital">Hôpital / CHU</option>
                <option value="EPH">EPH (Établissement Public Hospitalier)</option>
                <option value="EPSP">EPSP (Établissement Public de Santé de Proximité)</option>
                <option value="Clinique privée">Clinique Privée</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            {/* Filter: Severity */}
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: "800", color: "#475569", display: "block", marginBottom: "0.4rem" }}>
                Niveau de Gravité
              </label>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "10px", border: "1px solid #CBD5E1", fontSize: "0.85rem", outline: "none" }}
              >
                <option value="">Toutes les Gravités</option>
                <option value="CRITICAL">🔴 CRITIQUE (Urgence Absolue)</option>
                <option value="HIGH">🟠 ÉLEVÉE</option>
                <option value="MEDIUM">🟡 MOYENNE</option>
                <option value="LOW">🔵 FAIBLE</option>
              </select>
            </div>

            {/* Apply Filters Button */}
            <button
              onClick={fetchReport}
              disabled={isLoading}
              style={{
                width: "100%",
                backgroundColor: "#062C54",
                color: "white",
                padding: "10px",
                borderRadius: "10px",
                fontWeight: "700",
                fontSize: "0.88rem",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                marginTop: "0.5rem",
                boxShadow: "0 4px 12px rgba(6, 44, 84, 0.2)",
              }}
            >
              <Filter size={16} /> Apply Filters
            </button>
          </div>

          {/* MAIN CONTENT DISPLAY AREA (3 COLS) */}
          <div className="lg:col-span-3" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* ACTION BANNER: GENERATE PDF / EXCEL */}
            <div
              style={{
                backgroundColor: "#062C54",
                borderRadius: "20px",
                padding: "1.75rem",
                color: "white",
                boxShadow: "0 10px 30px rgba(6, 44, 84, 0.2)",
                border: "1px solid rgba(15, 162, 155, 0.3)",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1.5rem",
              }}
            >
              <div>
                <div style={{ fontSize: "0.8rem", color: "#38BDF8", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
                  Aperçu du Rapport Sélectionné
                </div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "900", margin: 0, color: "white" }}>
                  {reportData?.summary.reportTitle || "Rapport Sanitaire RASED"}
                </h2>
                <div style={{ fontSize: "0.88rem", color: "#94A3B8", marginTop: "0.25rem" }}>
                  {reportData ? `${reportData.summary.totalEvents} événements correspondants aux critères.` : "Chargement..."}
                </div>
              </div>

              {/* DOWNLOAD BUTTONS */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                <button
                  onClick={handleGeneratePDF}
                  disabled={isLoading || !reportData || reportData.summary.totalEvents === 0 || generatingFormat !== null}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    backgroundColor: "#EF4444",
                    color: "white",
                    padding: "12px 20px",
                    borderRadius: "12px",
                    fontWeight: "800",
                    fontSize: "0.9rem",
                    border: "none",
                    cursor: reportData && reportData.summary.totalEvents > 0 ? "pointer" : "not-allowed",
                    opacity: reportData && reportData.summary.totalEvents > 0 ? 1 : 0.5,
                    boxShadow: "0 4px 14px rgba(239, 68, 68, 0.3)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <FileText size={18} />
                  <span>Générer PDF Offciel</span>
                </button>

                <button
                  onClick={handleGenerateExcel}
                  disabled={isLoading || !reportData || reportData.summary.totalEvents === 0 || generatingFormat !== null}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    backgroundColor: "#10B981",
                    color: "white",
                    padding: "12px 20px",
                    borderRadius: "12px",
                    fontWeight: "800",
                    fontSize: "0.9rem",
                    border: "none",
                    cursor: reportData && reportData.summary.totalEvents > 0 ? "pointer" : "not-allowed",
                    opacity: reportData && reportData.summary.totalEvents > 0 ? 1 : 0.5,
                    boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <FileSpreadsheet size={18} />
                  <span>Exporter Excel (XLSX)</span>
                </button>
              </div>
            </div>

            {/* GENERATION PROGRESS INDICATOR */}
            {generatingFormat && (
              <div style={{ backgroundColor: "#F0FDF4", border: "1.5px solid #86EFAC", padding: "12px 18px", borderRadius: "14px", color: "#166534", display: "flex", alignItems: "center", gap: "12px" }}>
                <RefreshCw size={20} className="animate-spin" color="#10B981" />
                <div style={{ fontSize: "0.9rem", fontWeight: "700" }}>{generationStep}</div>
              </div>
            )}

            {/* SUMMARY METRICS CARDS */}
            {reportData && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
                <div style={{ backgroundColor: "#FFFFFF", padding: "14px", borderRadius: "16px", border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: "0.72rem", color: "#64748B", fontWeight: "700", textTransform: "uppercase" }}>Total Événements</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "#062C54" }}>{reportData.summary.totalEvents}</div>
                </div>

                <div style={{ backgroundColor: "#FFFFFF", padding: "14px", borderRadius: "16px", border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: "0.72rem", color: "#DC2626", fontWeight: "700", textTransform: "uppercase" }}>Cas Critiques</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "#DC2626" }}>{reportData.summary.criticalCount}</div>
                </div>

                <div style={{ backgroundColor: "#FFFFFF", padding: "14px", borderRadius: "16px", border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: "0.72rem", color: "#64748B", fontWeight: "700", textTransform: "uppercase" }}>Établissements</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "#0fa29b" }}>{reportData.summary.totalFacilities}</div>
                </div>

                <div style={{ backgroundColor: "#FFFFFF", padding: "14px", borderRadius: "16px", border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: "0.72rem", color: "#64748B", fontWeight: "700", textTransform: "uppercase" }}>Médecins</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "#0369A1" }}>{reportData.summary.totalDoctors}</div>
                </div>

                <div style={{ backgroundColor: "#FFFFFF", padding: "14px", borderRadius: "16px", border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: "0.72rem", color: "#64748B", fontWeight: "700", textTransform: "uppercase" }}>Patients Uniques</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "#7C3AED" }}>{reportData.summary.totalPatients}</div>
                </div>
              </div>
            )}

            {/* NAVIGATION PREVIEW TABS */}
            <div style={{ backgroundColor: "#FFFFFF", borderRadius: "20px", padding: "1.5rem", border: "1.5px solid #E2E8F0", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", borderBottom: "1px solid #E2E8F0", gap: "10px", marginBottom: "1.25rem", overflowX: "auto" }}>
                {[
                  { id: "summary", label: "Synthèse" },
                  { id: "severities", label: "Gravités" },
                  { id: "diseases", label: "Pathologies" },
                  { id: "wilayas", label: "Wilayas & Établissements" },
                  { id: "events", label: "Registre Détaillé" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    style={{
                      padding: "8px 16px",
                      fontSize: "0.88rem",
                      fontWeight: activeTab === tab.id ? "800" : "600",
                      color: activeTab === tab.id ? "#0fa29b" : "#64748B",
                      borderBottom: activeTab === tab.id ? "3px solid #0fa29b" : "3px solid transparent",
                      background: "transparent",
                      borderTop: "none",
                      borderLeft: "none",
                      borderRight: "none",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: SUMMARY */}
              {activeTab === "summary" && reportData && (
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#062C54", marginBottom: "1rem" }}>
                    RÉSUMÉ EXÉCUTIF DU RAPPORT
                  </h3>
                  <p style={{ color: "#475569", fontSize: "0.92rem", lineHeight: "1.6", marginBottom: "1.5rem" }}>
                    Ce rapport rassemble les déclarations sanitaires consolidées enregistrées sur le Réseau National RASED. 
                    Les données sont agrégées et sécurisées conformément aux habilitations de <strong>{reportData.appliedScope.userScopeDescription}</strong>.
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                    <div style={{ backgroundColor: "#F8FAFC", padding: "1.25rem", borderRadius: "14px", border: "1px solid #E2E8F0" }}>
                      <div style={{ fontWeight: "800", color: "#062C54", marginBottom: "0.5rem" }}>Paramètres d'Édition</div>
                      <ul style={{ paddingLeft: "1.2rem", margin: 0, fontSize: "0.85rem", color: "#475569", display: "flex", flexDirection: "column", gap: "4px" }}>
                        <li>Période : <strong>{reportData.summary.dateRangeLabel}</strong></li>
                        <li>Niveau d'Autorisation : <strong>Niveau {reportData.privacyLevel}</strong></li>
                        <li>Horodatage : <strong>{reportData.summary.generatedAt}</strong></li>
                      </ul>
                    </div>

                    <div style={{ backgroundColor: "#F8FAFC", padding: "1.25rem", borderRadius: "14px", border: "1px solid #E2E8F0" }}>
                      <div style={{ fontWeight: "800", color: "#062C54", marginBottom: "0.5rem" }}>Couverture Géographique</div>
                      <ul style={{ paddingLeft: "1.2rem", margin: 0, fontSize: "0.85rem", color: "#475569", display: "flex", flexDirection: "column", gap: "4px" }}>
                        <li>Wilayas touchées : <strong>{reportData.wilayas.length} wilayas</strong></li>
                        <li>Établissements : <strong>{reportData.summary.totalFacilities} centres</strong></li>
                        <li>Maladies répertoriées : <strong>{reportData.diseases.length} pathologies</strong></li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SEVERITIES */}
              {activeTab === "severities" && reportData && (
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#062C54", marginBottom: "1rem" }}>
                    RÉPARTITION PAR NIVEAU DE GRAVITÉ
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {reportData.severities.map((s) => (
                      <div key={s.severity} style={{ backgroundColor: "#F8FAFC", padding: "12px 16px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontWeight: "800", color: s.severity === "CRITICAL" ? "#DC2626" : s.severity === "HIGH" ? "#EA580C" : "#062C54" }}>
                            {s.severity}
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "#64748B" }}>{s.percentage}% du total national</div>
                        </div>
                        <div style={{ fontSize: "1.2rem", fontWeight: "900", color: "#062C54" }}>
                          {s.count} cas
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: DISEASES */}
              {activeTab === "diseases" && reportData && (
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#062C54", marginBottom: "1rem" }}>
                    PATHOLOGIES À DÉCLARATION OBLIGATOIRE
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {reportData.diseases.map((d) => (
                      <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", backgroundColor: "#F1F5F9", borderRadius: "10px" }}>
                        <span style={{ fontWeight: "700", color: "#334155" }}>{d.name}</span>
                        <span style={{ backgroundColor: "#062C54", color: "white", padding: "3px 10px", borderRadius: "999px", fontWeight: "800", fontSize: "0.82rem" }}>
                          {d.count} cas ({d.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: WILAYAS & FACILITIES */}
              {activeTab === "wilayas" && reportData && (
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#062C54", marginBottom: "1rem" }}>
                    RÉPARTITION PAR WILAYA
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "10px" }}>
                    {reportData.wilayas.map((w) => (
                      <div key={w.code} style={{ backgroundColor: "#F8FAFC", padding: "10px 14px", borderRadius: "12px", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <span style={{ backgroundColor: "#0fa29b", color: "white", fontWeight: "800", fontSize: "0.75rem", padding: "2px 6px", borderRadius: "4px", marginRight: "6px" }}>
                            {w.code}
                          </span>
                          <span style={{ fontWeight: "700", color: "#062C54" }}>{w.name}</span>
                        </div>
                        <span style={{ fontWeight: "900", color: "#0fa29b" }}>{w.count} cas</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: DETAILED EVENTS */}
              {activeTab === "events" && reportData && (
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#062C54", marginBottom: "1rem" }}>
                    REGISTRE DÉTAILLÉ DES ÉVÉNEMENTS ({reportData.events.length})
                  </h3>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#062C54", color: "white", textAlign: "left" }}>
                          <th style={{ padding: "10px" }}>ID / Date</th>
                          <th style={{ padding: "10px" }}>Maladie</th>
                          <th style={{ padding: "10px" }}>Gravité</th>
                          <th style={{ padding: "10px" }}>Établissement</th>
                          <th style={{ padding: "10px" }}>Médecin</th>
                          {reportData.privacyLevel >= 3 && <th style={{ padding: "10px" }}>Patient (NIN)</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.events.map((ev, idx) => (
                          <tr key={ev.id} style={{ borderBottom: "1px solid #E2E8F0", backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC" }}>
                            <td style={{ padding: "10px", fontWeight: "700" }}>
                              #{ev.id.substring(0, 6)}<br />
                              <span style={{ fontSize: "0.72rem", color: "#64748B" }}>{ev.createdAt.substring(0, 10)}</span>
                            </td>
                            <td style={{ padding: "10px", fontWeight: "700", color: "#062C54" }}>{ev.diseaseName}</td>
                            <td style={{ padding: "10px" }}>
                              <span
                                style={{
                                  backgroundColor: ev.severity === "CRITICAL" ? "#FEE2E2" : ev.severity === "HIGH" ? "#FFEDD5" : "#E0F2FE",
                                  color: ev.severity === "CRITICAL" ? "#DC2626" : ev.severity === "HIGH" ? "#EA580C" : "#0369A1",
                                  padding: "2px 8px",
                                  borderRadius: "999px",
                                  fontWeight: "800",
                                  fontSize: "0.72rem",
                                }}
                              >
                                {ev.severity}
                              </span>
                            </td>
                            <td style={{ padding: "10px" }}>{ev.facilityName} ({ev.wilaya})</td>
                            <td style={{ padding: "10px" }}>{ev.doctorName || "Anonymisé"}</td>
                            {reportData.privacyLevel >= 3 && (
                              <td style={{ padding: "10px", fontWeight: "700", color: "#7C3AED" }}>
                                {ev.patientName ? `${ev.patientName} (${ev.patientNin})` : "N/A"}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
