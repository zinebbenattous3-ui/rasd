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

  // Fetch Diseases and Authorized Facilities for this Health Authority
  useEffect(() => {
    async function loadDropdownOptions() {
      if (!currentUser) return;
      try {
        const { data: diseases } = await supabase.from("reportable_diseases").select("id, name").order("name");
        if (diseases) setDiseasesList(diseases);

        // Fetch facilities linked to this health authority by created_by
        const { data: userFacs, error: facErr } = await supabase
          .from("facilities")
          .select("id, name, wilaya, facility_type")
          .eq("created_by", currentUser.id)
          .order("name");

        if (userFacs && userFacs.length > 0) {
          setFacilitiesList(userFacs);
        } else {
          // Fallback: load all facilities if none explicitly linked
          const { data: allFacs } = await supabase.from("facilities").select("id, name, wilaya, facility_type").order("name");
          if (allFacs) setFacilitiesList(allFacs);
        }
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

  // Reset Filters Function
  const handleResetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSelectedWilaya("");
    setSelectedFacilityId("");
    setSelectedDiseaseId("");
    setSelectedSeverity("");
  };

  // PDF Generation Handler
  const handleGeneratePDF = async () => {
    if (!reportData || reportData.summary.totalEvents === 0) return;
    setGeneratingFormat("pdf");
    setExportSuccessMsg(null);

    setTimeout(() => {
      try {
        generateReportPDF(reportData, reportType);
        setExportSuccessMsg("Document PDF généré avec succès.");
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
        generateReportExcel(reportData, reportType);
        setExportSuccessMsg("Classeur Excel exporté avec succès.");
      } catch (err: any) {
        console.error("Excel generation failed:", err);
        setErrorMsg("Erreur lors de l'exportation Excel.");
      } finally {
        setGeneratingFormat(null);
        setTimeout(() => setExportSuccessMsg(null), 4000);
      }
    }, 400);
  };

  // Using formatDateTime utility imported from @/lib/utils

  // Active filters list
  const activeFilters = [
    selectedWilaya ? { key: "wilaya", label: `Wilaya: ${selectedWilaya}`, clear: () => setSelectedWilaya("") } : null,
    selectedFacilityId
      ? {
          key: "facility",
          label: `Établissement: ${facilitiesList.find((f) => f.id === selectedFacilityId)?.name || "Sélectionné"}`,
          clear: () => setSelectedFacilityId(""),
        }
      : null,
    dateFrom || dateTo
      ? {
          key: "dates",
          label: `Période: ${dateFrom || "Début"} → ${dateTo || "Aujourd'hui"}`,
          clear: () => {
            setDateFrom("");
            setDateTo("");
          },
        }
      : null,
    selectedDiseaseId
      ? {
          key: "disease",
          label: `Pathologie: ${diseasesList.find((d) => d.id === selectedDiseaseId)?.name || "Sélectionnée"}`,
          clear: () => setSelectedDiseaseId(""),
        }
      : null,
    selectedSeverity
      ? {
          key: "severity",
          label: `Gravité: ${
            selectedSeverity === "CRITICAL"
              ? "Critique"
              : selectedSeverity === "HIGH"
              ? "Élevée"
              : selectedSeverity === "MEDIUM"
              ? "Moyenne"
              : "Faible"
          }`,
          clear: () => setSelectedSeverity(""),
        }
      : null,
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

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
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* HEADER & SCOPE BADGE */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: "900", color: COLORS.navy, letterSpacing: "-0.02em", margin: 0 }}>
            Rapport de Synthèse Sanitaire
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
              gap: "12px",
            }}
          >
            <div style={{ padding: "10px", borderRadius: "12px", backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
              <Building2 size={22} />
            </div>

            <div>
              <div style={{ fontSize: "0.72rem", color: COLORS.muted, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Périmètre Autorisé
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
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", padding: "14px 18px", borderRadius: "14px", color: "#991B1B", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertTriangle size={20} color="#DC2626" />
            <div style={{ fontSize: "0.92rem", fontWeight: "700" }}>{errorMsg}</div>
          </div>
          <button
            onClick={fetchReport}
            style={{
              backgroundColor: "#DC2626",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "6px 12px",
              fontWeight: "700",
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      )}

      {exportSuccessMsg && (
        <div style={{ backgroundColor: "#ECFDF5", border: "1px solid #6EE7B7", padding: "14px 18px", borderRadius: "14px", color: "#065F46", display: "flex", alignItems: "center", gap: "10px" }}>
          <CheckCircle2 size={20} color="#059669" />
          <div style={{ fontSize: "0.92rem", fontWeight: "700" }}>{exportSuccessMsg}</div>
        </div>
      )}

      {/* RESPONSIVE GRID FILTER PANEL */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "18px",
          border: `1px solid ${COLORS.border}`,
          padding: "20px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", paddingBottom: "12px", borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: "1rem", fontWeight: "800", color: COLORS.navy, display: "flex", alignItems: "center", gap: "8px" }}>
            <Filter size={18} color={COLORS.teal} /> Panneau de Filtrage Avancé
          </div>
          <div style={{ fontSize: "0.8rem", color: COLORS.muted }}>
            Filtrez les événements selon les critères souhaités
          </div>
        </div>

        {/* 3-COLUMN BALANCED RESPONSIVE GRID (2 ROWS OF 3 ITEMS) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "18px" }}>
          {/* WILAYA FILTER */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
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
                ...ALGERIA_WILAYAS_69.map((w) => ({ value: w.code, label: `${w.code} - ${w.name}` })),
              ]}
            />
          </div>

          {/* FACILITY FILTER */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
              Établissement sous Gestion
            </label>
            <SelectDropdown
              icon={Building2}
              placeholder="Tous mes établissements"
              value={selectedFacilityId}
              onChange={(val) => setSelectedFacilityId(val)}
              options={[
                { value: "", label: "Tous mes établissements" },
                ...facilitiesList.map((fac) => ({ value: fac.id, label: `${fac.name} (${fac.wilaya})` })),
              ]}
            />
          </div>

          {/* PATHOLOGIE */}
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

          {/* DATE DE DÉBUT */}
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

          {/* DATE DE FIN */}
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

          {/* GRAVITÉ */}
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

        {/* DEDICATED ACTION BUTTONS & ACTIVE FILTERS FOOTER BAR */}
        <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: `1px solid ${COLORS.border}`, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          {/* Active Chips or Status count on Left */}
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

          {/* BUTTONS ALIGNED RIGHT */}
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

      {/* SUMMARY METRICS CARDS (Calculated strictly from filtered dataset) */}
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
            <div style={{ fontSize: "0.78rem", color: COLORS.muted, marginTop: "4px" }}>Sur la période et le périmètre autorisés</div>
          </div>

          <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 14px rgba(0,0,0,0.02)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "#DC2626", fontWeight: "800", textTransform: "uppercase" }}>Cas Critiques</span>
              <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: "#FEE2E2" }}>
                <AlertCircle size={18} color="#DC2626" />
              </div>
            </div>
            <div style={{ fontSize: "2.2rem", fontWeight: "900", color: "#DC2626", marginTop: "8px" }}>
              {reportData.summary.criticalCount}
            </div>
            <div style={{ fontSize: "0.78rem", color: COLORS.muted, marginTop: "4px" }}>Nécessitant une intervention d'urgence</div>
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
            <div style={{ fontSize: "0.78rem", color: COLORS.muted, marginTop: "4px" }}>Maladies à déclaration obligatoire</div>
          </div>

          <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 14px rgba(0,0,0,0.02)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "800", textTransform: "uppercase" }}>Établissements Surveillés</span>
              <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: "#e0f2fe" }}>
                <Building2 size={18} color="#0369A1" />
              </div>
            </div>
            <div style={{ fontSize: "2.2rem", fontWeight: "900", color: "#0369A1", marginTop: "8px" }}>
              {reportData.summary.totalFacilities}
            </div>
            <div style={{ fontSize: "0.78rem", color: COLORS.muted, marginTop: "4px" }}>Structures de santé rapportantes</div>
          </div>
        </div>
      )}

      {/* REPORT MODELS SELECTION */}
      <div style={{ backgroundColor: "white", borderRadius: "18px", border: `1px solid ${COLORS.border}`, padding: "20px" }}>
        <div style={{ fontSize: "1rem", fontWeight: "800", color: COLORS.navy, marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Layers size={18} color={COLORS.teal} /> Modèles de Rapports Sanitaires
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
          {[
            { type: "EXECUTIVE", icon: BarChart3, title: "Synthèse Sanitaire", desc: "Bilan global des établissements sous gestion" },
            { type: "FACILITY", icon: Building2, title: "Par Établissement", desc: "Analyse détaillée par structure de santé" },
            { type: "DISEASE", icon: Activity, title: "Par Pathologie", desc: "Répartition des maladies déclarées" },
            { type: "WILAYA", icon: MapPin, title: "Par Gravité", desc: "Distribution des degrés de sévérité" },
            { type: "DETAILED_EVENTS", icon: FileText, title: "Registre Détaillé", desc: "Fiches et dossiers individuels des cas" },
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

      {/* EXPORT ACTION BANNER & MAIN REPORT VIEW */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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
              Rapport Sanitaire Consolidé
            </div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "800", margin: 0, color: "white" }}>
              {reportData?.summary.reportTitle || "Bilan Sanitaire des Établissements"}
            </h2>
            <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: "2px" }}>
              {reportData ? `${reportData.summary.totalEvents} événement(s) répertorié(s) dans votre périmètre.` : "Chargement..."}
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <button
              onClick={handleGeneratePDF}
              disabled={isLoading || !reportData || reportData.summary.totalEvents === 0 || generatingFormat !== null}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "#DC2626",
                color: "white",
                padding: "10px 18px",
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
                gap: "8px",
                backgroundColor: "#15803D",
                color: "white",
                padding: "10px 18px",
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

        {/* TAB NAVIGATION & VIEW CONTENT */}
        <div style={{ backgroundColor: "white", borderRadius: "18px", border: `1px solid ${COLORS.border}`, padding: "20px" }}>
          <div style={{ display: "flex", borderBottom: `1px solid ${COLORS.border}`, gap: "6px", marginBottom: "20px", overflowX: "auto" }}>
            {[
              { id: "summary", label: "Vue Synthèse" },
              { id: "facilities", label: `Établissements (${reportData?.facilities.length || 0})` },
              { id: "diseases", label: `Pathologies (${reportData?.diseases.length || 0})` },
              { id: "severities", label: "Niveaux de Gravité" },
              { id: "events", label: `Registre Détaillé (${reportData?.events.length || 0})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: "10px 16px",
                  fontSize: "0.88rem",
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

          {/* EMPTY STATE IF 0 EVENTS MATCH FILTERS */}
          {reportData && reportData.summary.totalEvents === 0 && (
            <div style={{ padding: "48px 24px", textAlign: "center", backgroundColor: COLORS.bgLight, borderRadius: "16px", border: `1px dashed ${COLORS.border}` }}>
              <FileX size={48} color={COLORS.muted} style={{ margin: "0 auto 12px auto" }} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: COLORS.navy, margin: "0 0 6px 0" }}>
                Aucun événement sanitaire trouvé
              </h3>
              <p style={{ color: COLORS.muted, fontSize: "0.88rem", maxWidth: "480px", margin: "0 auto 16px auto" }}>
                Aucun événement ne correspond à vos critères de recherche dans votre périmètre sanitaire autorisé.
              </p>
              <button
                onClick={handleResetFilters}
                style={{
                  backgroundColor: COLORS.teal,
                  color: "white",
                  padding: "9px 18px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "0.85rem",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <RotateCcw size={15} /> Réinitialiser tous les filtres
              </button>
            </div>
          )}

          {/* SUMMARY TAB */}
          {activeTab === "summary" && reportData && reportData.summary.totalEvents > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                {/* DISEASE DISTRIBUTION */}
                <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: "14px", padding: "16px" }}>
                  <div style={{ fontWeight: "800", color: COLORS.navy, fontSize: "0.95rem", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Stethoscope size={16} color={COLORS.teal} /> Pathologies Majeures Signailées
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {reportData.diseases.slice(0, 5).map((d) => (
                      <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", backgroundColor: COLORS.bgLight, borderRadius: "8px" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: "700", color: COLORS.text }}>{d.name}</span>
                        <span style={{ fontSize: "0.85rem", fontWeight: "900", color: COLORS.teal }}>{d.count} cas</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SEVERITY DISTRIBUTION */}
                <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: "14px", padding: "16px" }}>
                  <div style={{ fontWeight: "800", color: COLORS.navy, fontSize: "0.95rem", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <AlertTriangle size={16} color="#DC2626" /> Ventillation par Niveau de Sévérité
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {reportData.severities.map((s) => (
                      <div key={s.severity} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", backgroundColor: COLORS.bgLight, borderRadius: "8px" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: "700", color: s.severity === "CRITICAL" ? "#DC2626" : COLORS.text }}>
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

          {/* DETAILED EVENT REGISTRY TAB */}
          {activeTab === "events" && reportData && reportData.summary.totalEvents > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {reportData.events.map((ev) => (
                <div key={ev.id} style={{ backgroundColor: COLORS.bgLight, borderRadius: "14px", border: `1px solid ${COLORS.border}`, padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontWeight: "800", color: COLORS.navy, fontSize: "0.92rem" }}>#{ev.id.substring(0, 8)}</span>
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
