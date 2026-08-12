import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ALGERIA_WILAYAS_69 } from "@/lib/wilayas";
import { validateCurrentSession, getStoredSession, AuthenticatedUser } from "@/lib/auth";
import { getReportDataServer, ReportPayload, ReportType } from "@/lib/reportsServer";
import { generateReportPDF } from "@/lib/pdfGenerator";
import { generateReportExcel } from "@/lib/excelGenerator";
import { supabase } from "@/lib/supabase";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import {
  FileText,
  FileSpreadsheet,
  Filter,
  RefreshCw,
  Building2,
  Activity,
  AlertTriangle,
  MapPin,
  Stethoscope,
  Eye,
  X,
  Layers,
  BarChart3,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/health-authority/reports")({
  head: () => ({
    meta: [
      { title: "Rapports de l'Autorité Sanitaire — Rased" },
      {
        name: "description",
        content: "Génération sécurisée de rapports sanitaires pour l'Espace Sanitaire.",
      },
    ],
  }),
  component: HealthAuthorityReportsPage,
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

export function HealthAuthorityReportsPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Filters State
  const [reportType, setReportType] = useState<ReportType>("EXECUTIVE");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedWilaya, setSelectedWilaya] = useState<string>("");
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("");
  const [selectedDiseaseId, setSelectedDiseaseId] = useState<string>("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("");

  // Options loaded from DB
  const [diseasesList, setDiseasesList] = useState<any[]>([]);
  const [facilitiesList, setFacilitiesList] = useState<any[]>([]);

  // Data Loading & Export States
  const [reportData, setReportData] = useState<ReportPayload | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [generatingFormat, setGeneratingFormat] = useState<"pdf" | "excel" | null>(null);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Proof Image Modal State
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);

  // Active View Category Tab
  const [activeTab, setActiveTab] = useState<"summary" | "facilities" | "diseases" | "severities" | "events">("summary");

  // Validate Authentication on Mount (STRICT: HEALTH_AUTHORITY ONLY)
  useEffect(() => {
    async function verifyAuth() {
      const authResult = await validateCurrentSession(["HEALTH_AUTHORITY"]);
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

  // Fetch Diseases and Authorized Facilities
  useEffect(() => {
    async function loadDropdownOptions() {
      if (!currentUser) return;
      try {
        const { data: diseases } = await supabase.from("reportable_diseases").select("id, name").order("name");
        if (diseases) setDiseasesList(diseases);

        // Fetch facilities linked to this authority
        const { data: facs } = await supabase.from("facilities").select("id, name, wilaya, facility_type").order("name");
        if (facs) setFacilitiesList(facs);
      } catch (err) {
        console.error("Error loading dropdown options:", err);
      }
    }
    loadDropdownOptions();
  }, [currentUser]);

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
          facilityId: selectedFacilityId || undefined,
          diseaseId: selectedDiseaseId || undefined,
          severity: selectedSeverity || undefined,
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
    if (!authChecking && currentUser && currentUser.role === "HEALTH_AUTHORITY") {
      fetchReport();
    }
  }, [authChecking, currentUser, reportType]);

  // PDF Generation Handler
  const handleGeneratePDF = async () => {
    if (!reportData || reportData.summary.totalEvents === 0) return;
    setGeneratingFormat("pdf");
    setExportSuccessMsg(null);

    setTimeout(() => {
      try {
        generateReportPDF(reportData);
        setExportSuccessMsg("Document PDF d'Espace Sanitaire généré avec succès.");
      } catch (err: any) {
        console.error("PDF generation failed:", err);
        setErrorMsg("Erreur lors du rendu PDF.");
      } finally {
        setGeneratingFormat(null);
        setTimeout(() => setExportSuccessMsg(null), 4000);
      }
    }, 400);
  };

  // Excel Generation Handler
  const handleGenerateExcel = async () => {
    if (!reportData || reportData.summary.totalEvents === 0) return;
    setGeneratingFormat("excel");
    setExportSuccessMsg(null);

    setTimeout(() => {
      try {
        generateReportExcel(reportData);
        setExportSuccessMsg("Classeur Excel d'Espace Sanitaire exporté avec succès.");
      } catch (err: any) {
        console.error("Excel generation failed:", err);
        setErrorMsg("Erreur lors de l'exportation Excel.");
      } finally {
        setGeneratingFormat(null);
        setTimeout(() => setExportSuccessMsg(null), 4000);
      }
    }, 400);
  };

  if (authChecking) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.navy }}>
        <div style={{ textAlign: "center" }}>
          <RefreshCw size={36} className="animate-spin" style={{ margin: "0 auto 1rem auto", color: COLORS.teal }} />
          <div style={{ fontSize: "1.05rem", fontWeight: "700" }}>Vérification des habilitations sanitaires...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* HEADER & SCOPE BADGE */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: "900", color: COLORS.navy, letterSpacing: "-0.02em", margin: 0 }}>
            Rapports & Observatoire Établissements
          </h1>
          <p style={{ color: COLORS.muted, fontSize: "0.92rem", marginTop: "4px" }}>
            Surveillance épidémiologique et consolidations pour les établissements de santé sous votre gestion.
          </p>
        </div>

        {/* SCOPE BADGE */}
        {reportData && (
          <div
            style={{
              backgroundColor: "white",
              padding: "14px 18px",
              borderRadius: "16px",
              border: `1.5px solid ${COLORS.border}`,
              boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}
          >
            <div style={{ padding: "10px", borderRadius: "12px", backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
              <Building2 size={22} />
            </div>

            <div>
              <div style={{ fontSize: "0.72rem", color: COLORS.muted, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Portée Autorité Sanitaire
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: "800", color: COLORS.navy }}>
                {reportData.appliedScope.userScopeDescription}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ERROR / SUCCESS NOTIFICATIONS */}
      {errorMsg && (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", padding: "14px 18px", borderRadius: "14px", color: "#991B1B", display: "flex", alignItems: "center", gap: "10px" }}>
          <AlertTriangle size={20} color="#DC2626" />
          <div style={{ fontSize: "0.92rem", fontWeight: "700" }}>{errorMsg}</div>
        </div>
      )}

      {exportSuccessMsg && (
        <div style={{ backgroundColor: "#ECFDF5", border: "1px solid #6EE7B7", padding: "14px 18px", borderRadius: "14px", color: "#065F46", display: "flex", alignItems: "center", gap: "10px" }}>
          <CheckCircle2 size={20} color="#059669" />
          <div style={{ fontSize: "0.92rem", fontWeight: "700" }}>{exportSuccessMsg}</div>
        </div>
      )}

      {/* SUMMARY METRICS CARDS */}
      {reportData && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
          <div style={{ backgroundColor: "white", padding: "18px", borderRadius: "16px", border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "700", textTransform: "uppercase" }}>Total Événements</span>
              <Activity size={18} color={COLORS.navy} />
            </div>
            <div style={{ fontSize: "2rem", fontWeight: "900", color: COLORS.navy, marginTop: "6px" }}>
              {reportData.summary.totalEvents}
            </div>
          </div>

          <div style={{ backgroundColor: "white", padding: "18px", borderRadius: "16px", border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "#DC2626", fontWeight: "700", textTransform: "uppercase" }}>Cas Critiques</span>
              <AlertCircle size={18} color="#DC2626" />
            </div>
            <div style={{ fontSize: "2rem", fontWeight: "900", color: "#DC2626", marginTop: "6px" }}>
              {reportData.summary.criticalCount}
            </div>
          </div>

          <div style={{ backgroundColor: "white", padding: "18px", borderRadius: "16px", border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "700", textTransform: "uppercase" }}>Pathologies</span>
              <Stethoscope size={18} color={COLORS.teal} />
            </div>
            <div style={{ fontSize: "2rem", fontWeight: "900", color: COLORS.teal, marginTop: "6px" }}>
              {reportData.diseases.length}
            </div>
          </div>

          <div style={{ backgroundColor: "white", padding: "18px", borderRadius: "16px", border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "700", textTransform: "uppercase" }}>Établissements Surveillés</span>
              <Building2 size={18} color="#0369A1" />
            </div>
            <div style={{ fontSize: "2rem", fontWeight: "900", color: "#0369A1", marginTop: "6px" }}>
              {reportData.summary.totalFacilities}
            </div>
          </div>
        </div>
      )}

      {/* REPORT MODELS */}
      <div style={{ backgroundColor: "white", borderRadius: "18px", border: `1px solid ${COLORS.border}`, padding: "20px" }}>
        <div style={{ fontSize: "1rem", fontWeight: "800", color: COLORS.navy, marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Layers size={18} color={COLORS.teal} /> Modèles de Rapports
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
          {[
            { type: "EXECUTIVE", icon: BarChart3, title: "Synthèse Sanitaire", desc: "Bilan global des établissements" },
            { type: "FACILITY", icon: Building2, title: "Par Établissement", desc: "Analyse des structures sous gestion" },
            { type: "DISEASE", icon: Activity, title: "Par Pathologie", desc: "Pathologies déclarables répertoriées" },
            { type: "WILAYA", icon: MapPin, title: "Par Gravité", desc: "Suivi des urgences" },
            { type: "DETAILED_EVENTS", icon: FileText, title: "Registre Détaillé", desc: "Fiches et dossiers sanitaires" },
          ].map((card) => {
            const IconComp = card.icon;
            const isSelected = reportType === card.type;

            return (
              <div
                key={card.type}
                onClick={() => {
                  setReportType(card.type as ReportType);
                  if (card.type === "DETAILED_EVENTS") setActiveTab("events");
                  else if (card.type === "FACILITY") setActiveTab("facilities");
                  else if (card.type === "DISEASE") setActiveTab("diseases");
                  else if (card.type === "WILAYA") setActiveTab("severities");
                  else setActiveTab("summary");
                }}
                style={{
                  backgroundColor: isSelected ? COLORS.lightTeal : "#F8FAFC",
                  border: isSelected ? `2px solid ${COLORS.teal}` : `1px solid ${COLORS.border}`,
                  borderRadius: "12px",
                  padding: "14px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <div style={{ padding: "6px", borderRadius: "8px", backgroundColor: isSelected ? COLORS.teal : "white", color: isSelected ? "white" : COLORS.navy }}>
                    <IconComp size={16} />
                  </div>
                  <div style={{ fontWeight: "800", fontSize: "0.9rem", color: COLORS.navy }}>{card.title}</div>
                </div>
                <div style={{ fontSize: "0.75rem", color: COLORS.muted }}>
                  {card.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* WORKSPACE GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }} className="lg:grid-cols-4">

        {/* LEFT: FILTER PANEL */}
        <div style={{ backgroundColor: "white", borderRadius: "18px", border: `1px solid ${COLORS.border}`, padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: "10px" }}>
            <div style={{ fontSize: "0.95rem", fontWeight: "800", color: COLORS.navy, display: "flex", alignItems: "center", gap: "6px" }}>
              <Filter size={16} color={COLORS.teal} /> Filtres
            </div>
            <button onClick={fetchReport} disabled={isLoading} style={{ background: "none", border: "none", color: COLORS.teal, cursor: "pointer" }}>
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* WILAYA FILTER */}
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: "800", color: COLORS.text, display: "block", marginBottom: "6px" }}>
              Wilaya
            </label>
            <SelectDropdown
              icon={MapPin}
              searchable={true}
              placeholder="Toutes les wilayas"
              value={selectedWilaya}
              onChange={(val) => setSelectedWilaya(val)}
              options={[
                { value: "", label: "Toutes les wilayas" },
                ...ALGERIA_WILAYAS_69.map((w) => ({ value: w.code, label: `${w.code} - ${w.name}` }))
              ]}
            />
          </div>

          {/* FACILITY FILTER */}
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: "800", color: COLORS.text, display: "block", marginBottom: "6px" }}>
              Mes Établissements
            </label>
            <SelectDropdown
              icon={Building2}
              placeholder="Tous mes établissements"
              value={selectedFacilityId}
              onChange={(val) => setSelectedFacilityId(val)}
              options={[
                { value: "", label: "Tous mes établissements" },
                ...facilitiesList.map((fac) => ({ value: fac.id, label: `${fac.name} (${fac.wilaya})` }))
              ]}
            />
          </div>

          {/* DATE RANGE */}
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: "800", color: COLORS.text, display: "block", marginBottom: "6px" }}>
              Période
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.85rem", outline: "none", backgroundColor: COLORS.bgLight }}
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.85rem", outline: "none", backgroundColor: COLORS.bgLight }}
              />
            </div>
          </div>

          {/* DISEASE */}
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: "800", color: COLORS.text, display: "block", marginBottom: "6px" }}>
              Pathologie
            </label>
            <SelectDropdown
              icon={Stethoscope}
              searchable={true}
              placeholder="Toutes les pathologies"
              value={selectedDiseaseId}
              onChange={(val) => setSelectedDiseaseId(val)}
              options={[
                { value: "", label: "Toutes les pathologies" },
                ...diseasesList.map((d) => ({ value: d.id, label: d.name }))
              ]}
            />
          </div>

          {/* SEVERITY */}
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: "800", color: COLORS.text, display: "block", marginBottom: "6px" }}>
              Gravité
            </label>
            <SelectDropdown
              icon={AlertTriangle}
              placeholder="Toutes les gravités"
              value={selectedSeverity}
              onChange={(val) => setSelectedSeverity(val)}
              options={[
                { value: "", label: "Toutes les gravités" },
                { value: "CRITICAL", label: "Critique" },
                { value: "HIGH", label: "Élevée" },
                { value: "MEDIUM", label: "Moyenne" },
                { value: "LOW", label: "Faible" }
              ]}
            />
          </div>

          <button
            onClick={fetchReport}
            disabled={isLoading}
            style={{
              width: "100%",
              backgroundColor: COLORS.navy,
              color: "white",
              padding: "11px",
              borderRadius: "10px",
              fontWeight: "700",
              fontSize: "0.88rem",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(6,44,84,0.15)"
            }}
          >
            <Filter size={15} /> Appliquer les filtres
          </button>
        </div>

        {/* RIGHT: ACTION BANNER & CONTENT TABS */}
        <div className="lg:col-span-3" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          <div
            style={{
              backgroundColor: COLORS.navy,
              borderRadius: "18px",
              padding: "20px 24px",
              color: "white",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div>
              <div style={{ fontSize: "0.75rem", color: COLORS.teal, fontWeight: "800", textTransform: "uppercase" }}>
                Rapport Sanitaire Prêt
              </div>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "800", margin: 0, color: "white" }}>
                {reportData?.summary.reportTitle || "Bilan Établissements Sanitaires"}
              </h2>
              <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: "2px" }}>
                {reportData ? `${reportData.summary.totalEvents} cas répertoriés dans votre périmètre.` : "Chargement..."}
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              <button
                onClick={handleGeneratePDF}
                disabled={isLoading || !reportData || reportData.summary.totalEvents === 0 || generatingFormat !== null}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "#DC2626",
                  color: "white",
                  padding: "10px 16px",
                  borderRadius: "10px",
                  fontWeight: "800",
                  fontSize: "0.85rem",
                  border: "none",
                  cursor: reportData && reportData.summary.totalEvents > 0 ? "pointer" : "not-allowed",
                  opacity: reportData && reportData.summary.totalEvents > 0 ? 1 : 0.5,
                }}
              >
                <FileText size={16} />
                <span>Exporter PDF</span>
              </button>

              <button
                onClick={handleGenerateExcel}
                disabled={isLoading || !reportData || reportData.summary.totalEvents === 0 || generatingFormat !== null}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "#15803D",
                  color: "white",
                  padding: "10px 16px",
                  borderRadius: "10px",
                  fontWeight: "800",
                  fontSize: "0.85rem",
                  border: "none",
                  cursor: reportData && reportData.summary.totalEvents > 0 ? "pointer" : "not-allowed",
                  opacity: reportData && reportData.summary.totalEvents > 0 ? 1 : 0.5,
                }}
              >
                <FileSpreadsheet size={16} />
                <span>Exporter Excel</span>
              </button>
            </div>
          </div>

          {/* TAB CONTENTS */}
          <div style={{ backgroundColor: "white", borderRadius: "18px", border: `1px solid ${COLORS.border}`, padding: "20px" }}>
            <div style={{ display: "flex", borderBottom: `1px solid ${COLORS.border}`, gap: "6px", marginBottom: "16px", overflowX: "auto" }}>
              {[
                { id: "summary", label: "Synthèse" },
                { id: "facilities", label: "Établissements" },
                { id: "diseases", label: "Pathologies" },
                { id: "severities", label: "Gravités" },
                { id: "events", label: `Registre Détaillé (${reportData?.events.length || 0})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    padding: "8px 14px",
                    fontSize: "0.85rem",
                    fontWeight: activeTab === tab.id ? "800" : "600",
                    color: activeTab === tab.id ? COLORS.teal : COLORS.muted,
                    borderBottom: activeTab === tab.id ? `3px solid ${COLORS.teal}` : "3px solid transparent",
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

            {/* TAB CONTENT: EVENTS */}
            {activeTab === "events" && reportData && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {reportData.events.map((ev) => (
                  <div key={ev.id} style={{ backgroundColor: COLORS.bgLight, borderRadius: "12px", border: `1px solid ${COLORS.border}`, padding: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontWeight: "800", color: COLORS.navy, fontSize: "0.9rem" }}>#{ev.id.substring(0, 8)}</span>
                        <span style={{ backgroundColor: ev.severity === "CRITICAL" ? "#FEE2E2" : COLORS.lightTeal, color: ev.severity === "CRITICAL" ? "#DC2626" : COLORS.teal, padding: "2px 8px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: "800" }}>
                          {ev.severity}
                        </span>
                      </div>
                      <span style={{ fontSize: "0.78rem", color: COLORS.muted }}>{new Date(ev.createdAt).toLocaleDateString("fr-FR")}</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", fontSize: "0.82rem" }}>
                      <div>
                        <span style={{ color: COLORS.muted }}>Pathologie: </span>
                        <strong style={{ color: COLORS.teal }}>{ev.diseaseName}</strong>
                      </div>
                      <div>
                        <span style={{ color: COLORS.muted }}>Établissement: </span>
                        <strong style={{ color: COLORS.navy }}>{ev.facilityName}</strong>
                      </div>
                      <div>
                        <span style={{ color: COLORS.muted }}>Médecin: </span>
                        <strong>{ev.doctorName || "—"}</strong>
                      </div>
                      {reportData.privacyLevel >= 3 && (
                        <div>
                          <span style={{ color: COLORS.muted }}>Patient: </span>
                          <strong>{ev.patientName || "Anonymisé"} ({ev.patientNin || "—"})</strong>
                        </div>
                      )}
                    </div>

                    {ev.patientProofUrl && (
                      <button
                        onClick={() => setSelectedProofUrl(ev.patientProofUrl || null)}
                        style={{ marginTop: "8px", padding: "4px 10px", borderRadius: "6px", border: `1px solid ${COLORS.teal}`, backgroundColor: COLORS.lightTeal, color: COLORS.teal, fontWeight: "700", fontSize: "0.75rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        <Eye size={12} /> Voir Preuve Attachée
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* SUMMARY TAB */}
            {activeTab !== "events" && reportData && (
              <div style={{ fontSize: "0.88rem", color: COLORS.text }}>
                <p>Consolidation pour l'Espace Sanitaire des établissements autorisés.</p>
                <div style={{ marginTop: "12px", display: "flex", gap: "16px" }}>
                  <div>Total Cas: <strong>{reportData.summary.totalEvents}</strong></div>
                  <div>Établissements: <strong>{reportData.summary.totalFacilities}</strong></div>
                  <div>Pathologies: <strong>{reportData.diseases.length}</strong></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PROOF MODAL */}
      {selectedProofUrl && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(6,44,84,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(4px)" }}>
          <div style={{ backgroundColor: "white", borderRadius: "18px", maxWidth: "600px", width: "100%", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", backgroundColor: COLORS.navy, color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: "800", fontSize: "0.95rem" }}>Preuve Médicale Attachée</div>
              <button onClick={() => setSelectedProofUrl(null)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: "20px", textAlign: "center" }}>
              <img src={selectedProofUrl} alt="Preuve" style={{ maxWidth: "100%", maxHeight: "400px", borderRadius: "10px", objectFit: "contain" }} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
