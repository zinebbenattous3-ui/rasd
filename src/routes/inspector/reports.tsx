import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ALGERIA_WILAYAS_69, normalizeWilayaCode } from "@/lib/wilayas";
import { validateCurrentSession, getStoredSession, AuthenticatedUser } from "@/lib/auth";
import { getReportDataServer, ReportPayload, ReportType } from "@/lib/reportsServer";
import { generateReportPDF } from "@/lib/pdfGenerator";
import { generateReportExcel } from "@/lib/excelGenerator";
import { supabase } from "@/lib/supabase";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import { DatePicker } from "@/components/ui/date-picker";
import { MedicalProofModal } from "@/components/MedicalProofModal";
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
  RotateCcw,
  FileX,
  Clock,
  Shield,
  Search,
  Lock,
} from "lucide-react";

export const Route = createFileRoute("/inspector/reports")({
  head: () => ({
    meta: [
      { title: "Rapports de l'Inspecteur Sanitaire — Rased" },
      {
        name: "description",
        content: "Génération sécurisée de rapports sanitaires régionaux pour l'Espace Inspection.",
      },
    ],
  }),
  component: InspectorReportsPage,
});

const COLORS = {
  navy: "#062C54",
  teal: "#0fa29b",
  lightTeal: "#e6f5f4",
  text: "#2d3748",
  muted: "#718096",
  border: "#e2e8f0",
  bgLight: "#f8fafc",
};

// Helper for formatting event timestamps strictly as DD/MM/YYYY à HH:mm
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

export function InspectorReportsPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Inspector Wilaya Scope
  const [inspectorWilaya, setInspectorWilaya] = useState<string>("16");

  // Filters State
  const [reportType, setReportType] = useState<ReportType>("EXECUTIVE");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
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

  // Proof Viewer Modal State
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);

  // Active View Category Tab
  const [activeTab, setActiveTab] = useState<"summary" | "facilities" | "diseases" | "severities" | "events">("summary");

  // Validate Authentication on Mount (STRICT: INSPECTOR ONLY)
  useEffect(() => {
    async function verifyAuth() {
      const authResult = await validateCurrentSession(["INSPECTOR"]);
      if (!authResult.authorized) {
        navigate({ to: (authResult.redirectTo || "/login") as any });
        return;
      }
      if (authResult.user) {
        setCurrentUser(authResult.user);
      }
      setAuthChecking(false);
    }
    verifyAuth();
  }, []);

  // Fetch Inspector Record & Dropdown Options for the Inspector's Wilaya
  useEffect(() => {
    async function loadInspectorScopeAndOptions() {
      if (!currentUser) return;
      try {
        // 1. Fetch Inspector Wilaya
        const { data: inspRec } = await supabase
          .from("inspectors")
          .select("wilaya")
          .eq("user_id", currentUser.id)
          .maybeSingle();

        const wilayaCode = inspRec?.wilaya || "16";
        setInspectorWilaya(wilayaCode);
        const normCode = normalizeWilayaCode(wilayaCode);

        // 2. Fetch diseases list
        const { data: diseases } = await supabase.from("reportable_diseases").select("id, name").order("name");
        if (diseases) setDiseasesList(diseases);

        // 3. Fetch facilities strictly inside Inspector's Wilaya (NO non-existent user_id queries!)
        const { data: wilayaFacs } = await supabase
          .from("facilities")
          .select("id, name, wilaya, facility_type")
          .ilike("wilaya", `%${normCode}%`)
          .order("name");

        if (wilayaFacs && wilayaFacs.length > 0) {
          setFacilitiesList(wilayaFacs);
        } else {
          // Fallback if wilaya string format is missing code
          const { data: allFacs } = await supabase.from("facilities").select("id, name, wilaya, facility_type").order("name");
          if (allFacs) setFacilitiesList(allFacs);
        }
      } catch (err) {
        console.error("Error loading inspector scope and dropdown options:", err);
      }
    }
    loadInspectorScopeAndOptions();
  }, [currentUser]);

  // Fetch Report Data from Server (Server enforces Inspector Wilaya restriction)
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
          wilaya: inspectorWilaya, // Locked to Inspector's Wilaya
          facilityId: selectedFacilityId || undefined,
          diseaseId: selectedDiseaseId || undefined,
          severity: selectedSeverity || undefined,
        },
      });

      if (res.error) {
        setErrorMsg(res.error);
        setReportData(null);
      } else {
        setReportData(res);
      }
    } catch (err: any) {
      console.error("Error fetching report data:", err);
      setErrorMsg(err.message || "Impossible de charger les données du rapport.");
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger initial report load when inspector Wilaya is ready
  useEffect(() => {
    if (currentUser && !authChecking) {
      fetchReport();
    }
  }, [currentUser, authChecking, reportType]);

  // Reset Filters Handler
  const handleResetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSelectedFacilityId("");
    setSelectedDiseaseId("");
    setSelectedSeverity("");
  };

  // Export PDF Action
  const handleExportPDF = () => {
    if (!reportData) return;
    setGeneratingFormat("pdf");
    setExportSuccessMsg(null);
    try {
      generateReportPDF(reportData);
      setExportSuccessMsg("Le rapport PDF à haute résolution a été généré et téléchargé avec succès.");
      setTimeout(() => setExportSuccessMsg(null), 5000);
    } catch (err) {
      console.error("PDF generation error:", err);
      setErrorMsg("Échec de la génération du fichier PDF.");
    } finally {
      setGeneratingFormat(null);
    }
  };

  // Export Excel Action
  const handleExportExcel = () => {
    if (!reportData) return;
    setGeneratingFormat("excel");
    setExportSuccessMsg(null);
    try {
      generateReportExcel(reportData);
      setExportSuccessMsg("Le classeur Excel structuré a été généré et téléchargé avec succès.");
      setTimeout(() => setExportSuccessMsg(null), 5000);
    } catch (err) {
      console.error("Excel generation error:", err);
      setErrorMsg("Échec de la génération du fichier Excel.");
    } finally {
      setGeneratingFormat(null);
    }
  };

  // Active filter chips construction
  const activeFilters = [];
  if (selectedFacilityId) {
    const facObj = facilitiesList.find((f) => f.id === selectedFacilityId);
    activeFilters.push({
      key: "facility",
      label: `Établissement: ${facObj ? facObj.name : "Sélectionné"}`,
      clear: () => setSelectedFacilityId(""),
    });
  }
  if (selectedDiseaseId) {
    const disObj = diseasesList.find((d) => d.id === selectedDiseaseId);
    activeFilters.push({
      key: "disease",
      label: `Pathologie: ${disObj ? disObj.name : "Sélectionnée"}`,
      clear: () => setSelectedDiseaseId(""),
    });
  }
  if (selectedSeverity) {
    const sevLabels: Record<string, string> = { CRITICAL: "Critique", HIGH: "Élevée", MEDIUM: "Moyenne", LOW: "Faible" };
    activeFilters.push({
      key: "severity",
      label: `Gravité: ${sevLabels[selectedSeverity] || selectedSeverity}`,
      clear: () => setSelectedSeverity(""),
    });
  }
  if (dateFrom) {
    activeFilters.push({
      key: "dateFrom",
      label: `Depuis: ${dateFrom}`,
      clear: () => setDateFrom(""),
    });
  }
  if (dateTo) {
    activeFilters.push({
      key: "dateTo",
      label: `Jusqu'à: ${dateTo}`,
      clear: () => setDateTo(""),
    });
  }

  if (authChecking) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bgLight }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", color: COLORS.navy }}>
          <RefreshCw size={32} className="animate-spin" color={COLORS.teal} />
          <span style={{ fontWeight: "700", fontSize: "0.95rem" }}>Vérification des droits de l'Inspecteur...</span>
        </div>
      </div>
    );
  }

  const inspectorWilayaObj = ALGERIA_WILAYAS_69.find((w) => w.code === normalizeWilayaCode(inspectorWilaya));

  return (
    <div style={{ backgroundColor: COLORS.bgLight, minHeight: "100vh", padding: "28px 24px", color: COLORS.text }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* HEADER & SCOPE BADGE */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", backgroundColor: "white", padding: "24px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
                <Shield size={22} />
              </div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: "900", color: COLORS.navy, margin: 0, letterSpacing: "-0.02em" }}>
                Rapport de Synthèse Sanitaire
              </h1>
            </div>
            <p style={{ fontSize: "0.88rem", color: COLORS.muted, margin: 0 }}>
              Surveillance épidémiologique et consolidations régionales pour votre Wilaya d'inspection.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ backgroundColor: COLORS.lightTeal, border: `1px solid ${COLORS.teal}40`, padding: "8px 16px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Lock size={16} color={COLORS.teal} />
              <div style={{ fontSize: "0.82rem" }}>
                <span style={{ color: COLORS.muted, fontWeight: "600" }}>Périmètre de Surveillance: </span>
                <strong style={{ color: COLORS.navy }}>
                  Wilaya {inspectorWilayaObj ? `${inspectorWilayaObj.code} - ${inspectorWilayaObj.name}` : inspectorWilaya}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* FEEDBACK MESSAGES */}
        {errorMsg && (
          <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", padding: "14px 18px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.88rem", fontWeight: "700" }}>
              <AlertCircle size={18} /> {errorMsg}
            </div>
            <button onClick={() => setErrorMsg(null)} style={{ background: "none", border: "none", color: "#991B1B", cursor: "pointer" }}>
              <X size={16} />
            </button>
          </div>
        )}

        {exportSuccessMsg && (
          <div style={{ backgroundColor: "#F0FDF4", border: "1px solid #86EFAC", color: "#166534", padding: "14px 18px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.88rem", fontWeight: "700" }}>
              <CheckCircle2 size={18} /> {exportSuccessMsg}
            </div>
            <button onClick={() => setExportSuccessMsg(null)} style={{ background: "none", border: "none", color: "#166534", cursor: "pointer" }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* 3-COLUMN BALANCED FILTER PANEL */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "18px",
            border: `1px solid ${COLORS.border}`,
            padding: "20px 24px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", paddingBottom: "12px", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: "1.05rem", fontWeight: "800", color: COLORS.navy, display: "flex", alignItems: "center", gap: "8px" }}>
              <Filter size={18} color={COLORS.teal} /> Panneau de Filtrage Avancé (Inspecteur)
            </div>
            <div style={{ fontSize: "0.82rem", color: COLORS.muted }}>
              Filtrez les événements selon les critères souhaités
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "18px" }}>
            {/* 1. WILAYA (LOCKED TO INSPECTOR WILAYA) */}
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
                Wilaya D'Inspection (Verrouillée)
              </label>
              <div
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: `1px solid ${COLORS.border}`,
                  backgroundColor: "#F1F5F9",
                  color: COLORS.navy,
                  fontWeight: "700",
                  fontSize: "0.88rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Lock size={15} color="#B45309" />
                <span>Wilaya {inspectorWilayaObj ? `${inspectorWilayaObj.code} - ${inspectorWilayaObj.name}` : inspectorWilaya}</span>
              </div>
            </div>

            {/* 2. FACILITY FILTER */}
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
                Établissement (Wilaya)
              </label>
              <SelectDropdown
                icon={Building2}
                placeholder="Tous les établissements"
                value={selectedFacilityId}
                onChange={(val) => setSelectedFacilityId(val)}
                options={[
                  { value: "", label: "Tous les établissements" },
                  ...facilitiesList.map((fac) => ({ value: fac.id, label: fac.name })),
                ]}
              />
            </div>

            {/* 3. PATHOLOGIE */}
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
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
                  ...diseasesList.map((d) => ({ value: d.id, label: d.name })),
                ]}
              />
            </div>

            {/* 4. DATE DE DÉBUT */}
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
                Date de début
              </label>
              <DatePicker
                value={dateFrom}
                onChange={(val) => setDateFrom(val)}
                placeholder="Choisir date de début..."
                maxDate={dateTo || undefined}
              />
            </div>

            {/* 5. DATE DE FIN */}
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
                Date de fin
              </label>
              <DatePicker
                value={dateTo}
                onChange={(val) => setDateTo(val)}
                placeholder="Choisir date de fin..."
                minDate={dateFrom || undefined}
              />
            </div>

            {/* 6. GRAVITÉ */}
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
                Niveau de Gravité
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
                  { value: "LOW", label: "Faible" },
                ]}
              />
            </div>
          </div>

          {/* DEDICATED ACTION FOOTER BAR */}
          <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: `1px solid ${COLORS.border}`, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
              {activeFilters.length > 0 ? (
                <>
                  <span style={{ fontSize: "0.75rem", fontWeight: "800", color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>Filtres Actifs:</span>
                  {activeFilters.map((f) => (
                    <span
                      key={f.key}
                      style={{
                        backgroundColor: COLORS.lightTeal,
                        color: COLORS.teal,
                        padding: "4px 10px",
                        borderRadius: "999px",
                        fontSize: "0.78rem",
                        fontWeight: "700",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        border: `1px solid ${COLORS.teal}40`,
                      }}
                    >
                      {f.label}
                      <X size={13} style={{ cursor: "pointer" }} onClick={f.clear} />
                    </span>
                  ))}
                </>
              ) : (
                <span style={{ fontSize: "0.82rem", color: COLORS.muted, fontWeight: "600" }}>
                  {reportData ? `${reportData.summary.totalEvents} événement(s) correspondent à vos filtres.` : "Sélectionnez vos critères de filtrage."}
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "auto" }}>
              {activeFilters.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  disabled={isLoading}
                  style={{
                    backgroundColor: "transparent",
                    color: COLORS.navy,
                    padding: "10px 18px",
                    borderRadius: "10px",
                    fontWeight: "700",
                    fontSize: "0.88rem",
                    border: `1.5px solid ${COLORS.border}`,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.15s ease",
                  }}
                >
                  <RotateCcw size={15} /> Réinitialiser
                </button>
              )}

              <button
                type="button"
                onClick={fetchReport}
                disabled={isLoading}
                style={{
                  backgroundColor: COLORS.navy,
                  color: "white",
                  padding: "10px 24px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "0.88rem",
                  border: "none",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(6,44,84,0.2)",
                  opacity: isLoading ? 0.7 : 1,
                  transition: "all 0.15s ease",
                }}
              >
                {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <Filter size={16} />}
                {isLoading ? "Application..." : "Appliquer les filtres"}
              </button>
            </div>
          </div>
        </div>

        {/* SUMMARY METRICS CARDS */}
        {reportData && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 14px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "800", textTransform: "uppercase" }}>Total Événements</span>
                <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: "#e2e8f0" }}>
                  <Activity size={18} color={COLORS.navy} />
                </div>
              </div>
              <div style={{ fontSize: "2.2rem", fontWeight: "900", color: COLORS.navy, marginTop: "8px" }}>
                {reportData.summary.totalEvents}
              </div>
              <div style={{ fontSize: "0.78rem", color: COLORS.muted, marginTop: "4px" }}>Dans la wilaya autorisée</div>
            </div>

            <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 14px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "800", textTransform: "uppercase" }}>Cas Critiques</span>
                <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: "#fee2e2" }}>
                  <AlertTriangle size={18} color="#dc2626" />
                </div>
              </div>
              <div style={{ fontSize: "2.2rem", fontWeight: "900", color: "#dc2626", marginTop: "8px" }}>
                {reportData.summary.criticalCount}
              </div>
              <div style={{ fontSize: "0.78rem", color: COLORS.muted, marginTop: "4px" }}>Urgence sanitaire absolue</div>
            </div>

            <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 14px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "800", textTransform: "uppercase" }}>Pathologies</span>
                <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: COLORS.lightTeal }}>
                  <Stethoscope size={18} color={COLORS.teal} />
                </div>
              </div>
              <div style={{ fontSize: "2.2rem", fontWeight: "900", color: COLORS.teal, marginTop: "8px" }}>
                {reportData.diseases.length}
              </div>
              <div style={{ fontSize: "0.78rem", color: COLORS.muted, marginTop: "4px" }}>Maladies déclarées</div>
            </div>

            <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 14px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "800", textTransform: "uppercase" }}>Établissements Surveillés</span>
                <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: "#e0f2fe" }}>
                  <Building2 size={18} color="#0369a1" />
                </div>
              </div>
              <div style={{ fontSize: "2.2rem", fontWeight: "900", color: "#0369a1", marginTop: "8px" }}>
                {reportData.summary.totalFacilities}
              </div>
              <div style={{ fontSize: "0.78rem", color: COLORS.muted, marginTop: "4px" }}>Structures actives</div>
            </div>
          </div>
        )}

        {/* REPORT MODELS SELECTOR & EXPORT CONTROLS */}
        <div style={{ backgroundColor: "white", borderRadius: "18px", border: `1px solid ${COLORS.border}`, padding: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "20px", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: "16px" }}>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: "800", color: COLORS.navy, margin: 0 }}>Modèles de Rapports Sanitaires</h2>
              <p style={{ fontSize: "0.82rem", color: COLORS.muted, margin: "2px 0 0 0" }}>Sélectionnez un modèle analytique puis exportez votre document officiel</p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={!reportData || generatingFormat === "pdf" || reportData.summary.totalEvents === 0}
                style={{
                  backgroundColor: COLORS.teal,
                  color: "white",
                  padding: "10px 18px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "0.88rem",
                  border: "none",
                  cursor: !reportData || generatingFormat === "pdf" || reportData.summary.totalEvents === 0 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 12px rgba(15,162,155,0.25)",
                  opacity: !reportData || reportData.summary.totalEvents === 0 ? 0.6 : 1,
                }}
              >
                {generatingFormat === "pdf" ? <RefreshCw size={16} className="animate-spin" /> : <FileText size={16} />}
                Générer Rapport PDF
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                disabled={!reportData || generatingFormat === "excel" || reportData.summary.totalEvents === 0}
                style={{
                  backgroundColor: "transparent",
                  color: COLORS.navy,
                  padding: "10px 18px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "0.88rem",
                  border: `1.5px solid ${COLORS.navy}`,
                  cursor: !reportData || generatingFormat === "excel" || reportData.summary.totalEvents === 0 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: !reportData || reportData.summary.totalEvents === 0 ? 0.6 : 1,
                }}
              >
                {generatingFormat === "excel" ? <RefreshCw size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                Exporter Excel
              </button>
            </div>
          </div>

          {/* 5 REPORT MODEL CARDS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "24px" }}>
            {[
              { type: "EXECUTIVE", icon: Layers, title: "Synthèse Sanitaire", desc: "Bilan global des établissements de la wilaya", tab: "summary" },
              { type: "FACILITY", icon: Building2, title: "Par Établissement", desc: "Analyse détaillée par structure de santé", tab: "facilities" },
              { type: "DISEASE", icon: Stethoscope, title: "Par Pathologie", desc: "Répartition des maladies déclarées", tab: "diseases" },
              { type: "WILAYA", icon: AlertTriangle, title: "Par Gravité", desc: "Distribution des degrés de sévérité", tab: "severities" },
              { type: "DETAILED_EVENTS", icon: FileText, title: "Registre Détaillé", desc: "Fiches et dossiers individuels des cas", tab: "events" },
            ].map((card) => {
              const IconComp = card.icon;
              const isSelected = reportType === card.type;
              return (
                <div
                  key={card.type}
                  onClick={() => {
                    setReportType(card.type as ReportType);
                    setActiveTab(card.tab as any);
                  }}
                  style={{
                    backgroundColor: isSelected ? COLORS.lightTeal : "#F8FAFC",
                    border: isSelected ? `2px solid ${COLORS.teal}` : `1px solid ${COLORS.border}`,
                    borderRadius: "14px",
                    padding: "16px",
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
                  <div style={{ fontSize: "0.78rem", color: COLORS.muted }}>{card.desc}</div>
                </div>
              );
            })}
          </div>

          {/* REPORT PREVIEW TABS CONTAINER */}
          {isLoading && (
            <div style={{ padding: "60px 0", textAlign: "center", color: COLORS.navy }}>
              <RefreshCw size={28} className="animate-spin" color={COLORS.teal} style={{ margin: "0 auto 12px auto" }} />
              <div style={{ fontWeight: "700", fontSize: "0.95rem" }}>Actualisation de l'analyse régionale en cours...</div>
            </div>
          )}

          {!isLoading && reportData && reportData.summary.totalEvents === 0 && (
            <div style={{ padding: "50px 20px", textAlign: "center", backgroundColor: COLORS.bgLight, borderRadius: "14px", border: `1px dashed ${COLORS.border}` }}>
              <FileX size={40} color={COLORS.muted} style={{ margin: "0 auto 12px auto" }} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: COLORS.navy, margin: "0 0 6px 0" }}>Aucun événement sanitaire trouvé</h3>
              <p style={{ fontSize: "0.85rem", color: COLORS.muted, margin: 0 }}>Aucune déclaration ne correspond aux filtres appliqués dans votre périmètre d'inspection.</p>
              {activeFilters.length > 0 && (
                <button
                  onClick={handleResetFilters}
                  style={{ marginTop: "16px", padding: "8px 16px", borderRadius: "8px", border: `1px solid ${COLORS.border}`, backgroundColor: "white", color: COLORS.navy, fontWeight: "700", fontSize: "0.82rem", cursor: "pointer" }}
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          )}

          {/* TAB 1: EXECUTIVE SUMMARY PREVIEW */}
          {!isLoading && reportData && reportData.summary.totalEvents > 0 && activeTab === "summary" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
                {/* TOP PATHOLOGIES TABLE */}
                <div style={{ backgroundColor: COLORS.bgLight, borderRadius: "14px", padding: "18px", border: `1px solid ${COLORS.border}` }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: "800", color: COLORS.navy, marginBottom: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Stethoscope size={16} color={COLORS.teal} /> Pathologies Principales (Wilaya)
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {reportData.diseases.slice(0, 5).map((d) => (
                      <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "white", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${COLORS.border}` }}>
                        <span style={{ fontWeight: "700", fontSize: "0.85rem", color: COLORS.navy }}>{d.name}</span>
                        <span style={{ fontSize: "0.82rem", fontWeight: "800", color: COLORS.teal, backgroundColor: COLORS.lightTeal, padding: "2px 8px", borderRadius: "6px" }}>
                          {d.count} cas ({d.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SEVERITY BREAKDOWN */}
                <div style={{ backgroundColor: COLORS.bgLight, borderRadius: "14px", padding: "18px", border: `1px solid ${COLORS.border}` }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: "800", color: COLORS.navy, marginBottom: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <AlertTriangle size={16} color="#DC2626" /> Degrés de Gravité
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {reportData.severities.map((s) => (
                      <div key={s.severity} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "white", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${COLORS.border}` }}>
                        <span style={{ fontWeight: "700", fontSize: "0.85rem", color: COLORS.navy }}>
                          {s.severity === "CRITICAL" ? "Critique" : s.severity === "HIGH" ? "Élevée" : s.severity === "MEDIUM" ? "Moyenne" : "Faible"}
                        </span>
                        <span style={{ fontSize: "0.85rem", fontWeight: "900", color: s.severity === "CRITICAL" ? "#DC2626" : COLORS.navy }}>
                          {s.count} ({s.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PAR ÉTABLISSEMENT PREVIEW */}
          {!isLoading && reportData && reportData.summary.totalEvents > 0 && activeTab === "facilities" && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ backgroundColor: COLORS.bgLight, borderBottom: `2px solid ${COLORS.border}`, textAlign: "left" }}>
                    <th style={{ padding: "12px 16px", color: COLORS.navy, fontWeight: "800" }}>Établissement</th>
                    <th style={{ padding: "12px 16px", color: COLORS.navy, fontWeight: "800" }}>Type</th>
                    <th style={{ padding: "12px 16px", color: COLORS.navy, fontWeight: "800" }}>Wilaya</th>
                    <th style={{ padding: "12px 16px", color: COLORS.navy, fontWeight: "800" }}>Événements Enregistrés</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.facilities.map((fac) => (
                    <tr key={fac.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      <td style={{ padding: "12px 16px", fontWeight: "700", color: COLORS.navy }}>{fac.name}</td>
                      <td style={{ padding: "12px 16px", color: COLORS.muted }}>{fac.facilityType || "Structure de Santé"}</td>
                      <td style={{ padding: "12px 16px", color: COLORS.muted }}>{fac.wilaya}</td>
                      <td style={{ padding: "12px 16px", fontWeight: "800", color: COLORS.teal }}>{fac.count} cas</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: PAR PATHOLOGIE PREVIEW */}
          {!isLoading && reportData && reportData.summary.totalEvents > 0 && activeTab === "diseases" && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ backgroundColor: COLORS.bgLight, borderBottom: `2px solid ${COLORS.border}`, textAlign: "left" }}>
                    <th style={{ padding: "12px 16px", color: COLORS.navy, fontWeight: "800" }}>Pathologie</th>
                    <th style={{ padding: "12px 16px", color: COLORS.navy, fontWeight: "800" }}>Cas Confirmés</th>
                    <th style={{ padding: "12px 16px", color: COLORS.navy, fontWeight: "800" }}>Pourcentage Relative</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.diseases.map((d) => (
                    <tr key={d.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      <td style={{ padding: "12px 16px", fontWeight: "700", color: COLORS.navy }}>{d.name}</td>
                      <td style={{ padding: "12px 16px", fontWeight: "800", color: COLORS.teal }}>{d.count} cas</td>
                      <td style={{ padding: "12px 16px", color: COLORS.muted }}>{d.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: PAR GRAVITÉ PREVIEW */}
          {!isLoading && reportData && reportData.summary.totalEvents > 0 && activeTab === "severities" && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ backgroundColor: COLORS.bgLight, borderBottom: `2px solid ${COLORS.border}`, textAlign: "left" }}>
                    <th style={{ padding: "12px 16px", color: COLORS.navy, fontWeight: "800" }}>Degré de Gravité</th>
                    <th style={{ padding: "12px 16px", color: COLORS.navy, fontWeight: "800" }}>Cas Signalés</th>
                    <th style={{ padding: "12px 16px", color: COLORS.navy, fontWeight: "800" }}>Pourcentage</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.severities.map((s) => (
                    <tr key={s.severity} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      <td style={{ padding: "12px 16px", fontWeight: "700", color: s.severity === "CRITICAL" ? "#DC2626" : COLORS.navy }}>
                        {s.severity === "CRITICAL" ? "Critique (Urgence)" : s.severity === "HIGH" ? "Élevée" : s.severity === "MEDIUM" ? "Moyenne" : "Faible"}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: "800", color: s.severity === "CRITICAL" ? "#DC2626" : COLORS.navy }}>{s.count} cas</td>
                      <td style={{ padding: "12px 16px", color: COLORS.muted }}>{s.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5: REGISTRE DÉTAILLÉ PREVIEW (NO RAW PATIENT NIN DISPLAYED) */}
          {!isLoading && reportData && reportData.summary.totalEvents > 0 && activeTab === "events" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {reportData.events.map((ev) => (
                <div key={ev.id} style={{ backgroundColor: COLORS.bgLight, borderRadius: "14px", border: `1px solid ${COLORS.border}`, padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontWeight: "800", color: COLORS.navy, fontSize: "0.92rem" }}>#EV-{ev.id.substring(0, 8).toUpperCase()}</span>
                      <span
                        style={{
                          backgroundColor: ev.severity === "CRITICAL" ? "#FEE2E2" : ev.severity === "HIGH" ? "#FFEDD5" : COLORS.lightTeal,
                          color: ev.severity === "CRITICAL" ? "#DC2626" : ev.severity === "HIGH" ? "#C2410C" : COLORS.teal,
                          padding: "3px 10px",
                          borderRadius: "999px",
                          fontSize: "0.75rem",
                          fontWeight: "800",
                        }}
                      >
                        {ev.severity}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", color: COLORS.muted }}>
                      <Clock size={14} /> {formatDateTime(ev.createdAt)}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", fontSize: "0.85rem", margin: "10px 0" }}>
                    <div>
                      <span style={{ color: COLORS.muted }}>Pathologie: </span>
                      <strong style={{ color: COLORS.teal }}>{ev.diseaseName}</strong>
                    </div>
                    <div>
                      <span style={{ color: COLORS.muted }}>Établissement: </span>
                      <strong style={{ color: COLORS.navy }}>{ev.facilityName} ({ev.wilaya})</strong>
                    </div>
                    <div>
                      <span style={{ color: COLORS.muted }}>Médecin Déclarant: </span>
                      <strong>{ev.doctorName || "—"}</strong>
                    </div>
                    <div>
                      <span style={{ color: COLORS.muted }}>Patient: </span>
                      <strong>{ev.patientName || "Cas Anonymisé"}</strong>
                    </div>
                  </div>

                  {ev.description && (
                    <div style={{ fontSize: "0.82rem", color: COLORS.text, backgroundColor: "white", padding: "10px 14px", borderRadius: "8px", border: `1px solid ${COLORS.border}`, marginTop: "8px" }}>
                      {ev.description}
                    </div>
                  )}

                  {ev.patientProofUrl && (
                    <button
                      type="button"
                      onClick={() => setSelectedProofUrl(ev.patientProofUrl || null)}
                      style={{
                        marginTop: "10px",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        border: `1px solid ${COLORS.teal}`,
                        backgroundColor: COLORS.lightTeal,
                        color: COLORS.teal,
                        fontWeight: "700",
                        fontSize: "0.78rem",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Eye size={14} /> Consulter la Preuve Médicale Attachée
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PROOF MODAL */}
      <MedicalProofModal proofPath={selectedProofUrl} onClose={() => setSelectedProofUrl(null)} />
    </div>
  );
}
