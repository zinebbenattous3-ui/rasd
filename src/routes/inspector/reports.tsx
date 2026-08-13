import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ALGERIA_WILAYAS_69, normalizeWilayaCode } from "@/lib/wilayas";
import { validateCurrentSession, getStoredSession, AuthenticatedUser } from "@/lib/auth";
import { getReportDataServer, ReportPayload, ReportType } from "@/lib/reportsServer";
import { generateModelPDF, ReportModelKey } from "@/lib/pdfGenerator";
import { generateModelExcel } from "@/lib/excelGenerator";
import { supabase } from "@/lib/supabase";
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
  Clock,
  Shield,
  Search,
  Lock,
  Loader2,
  FileCheck
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

// Map frontend model key to server reportType
const MODEL_TO_REPORT_TYPE: Record<ReportModelKey, ReportType> = {
  synthesis: "EXECUTIVE",
  facility: "FACILITY",
  pathology: "DISEASE",
  severity: "WILAYA",
  detailed: "DETAILED_EVENTS",
};

export function InspectorReportsPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Inspector Wilaya Scope
  const [inspectorWilaya, setInspectorWilaya] = useState<string>("16");

  // Selected Report Model State (5 Distinct Models)
  const [selectedModel, setSelectedModel] = useState<ReportModelKey>("synthesis");

  // Filter States
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

  // Validate Authentication on Mount (INSPECTOR ONLY)
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

  // Fetch Inspector Record & Dropdown Options for Inspector's Wilaya
  useEffect(() => {
    async function loadInspectorScopeAndOptions() {
      if (!currentUser) return;
      try {
        const { data: inspRec } = await supabase
          .from("inspectors")
          .select("wilaya")
          .eq("user_id", currentUser.id)
          .maybeSingle();

        const wilayaCode = inspRec?.wilaya || "16";
        setInspectorWilaya(wilayaCode);
        const normCode = normalizeWilayaCode(wilayaCode);

        // Fetch diseases list
        const { data: diseases } = await supabase.from("reportable_diseases").select("id, name").order("name");
        if (diseases) setDiseasesList(diseases);

        // Fetch facilities inside Inspector's Wilaya
        const { data: wilayaFacs } = await supabase
          .from("facilities")
          .select("id, name, wilaya, facility_type")
          .ilike("wilaya", `%${normCode}%`)
          .order("name");

        if (wilayaFacs && wilayaFacs.length > 0) {
          setFacilitiesList(wilayaFacs);
        } else {
          const { data: allFacs } = await supabase.from("facilities").select("id, name, wilaya, facility_type").order("name");
          if (allFacs) setFacilitiesList(allFacs);
        }
      } catch (err) {
        console.error("Error loading inspector scope and dropdown options:", err);
      }
    }
    loadInspectorScopeAndOptions();
  }, [currentUser]);

  // Fetch Report Data from Server using selected model
  const fetchReport = async (modelToFetch: ReportModelKey = selectedModel) => {
    const session = getStoredSession();
    if (!session || !session.userId) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const serverReportType = MODEL_TO_REPORT_TYPE[modelToFetch];

      const res = await getReportDataServer({
        data: {
          userId: session.userId,
          sessionToken: session.token,
          reportType: serverReportType,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          wilaya: inspectorWilaya,
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

  // Trigger initial report load and load when selected model changes
  useEffect(() => {
    if (currentUser && !authChecking) {
      fetchReport(selectedModel);
    }
  }, [currentUser, authChecking, selectedModel]);

  // Reset Filters Handler
  const handleResetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSelectedFacilityId("");
    setSelectedDiseaseId("");
    setSelectedSeverity("");
    fetchReport(selectedModel);
  };

  // Switch Model Handler
  const handleSelectModel = (modelKey: ReportModelKey) => {
    if (selectedModel === modelKey) return;
    setSelectedModel(modelKey);
  };

  // Export PDF Action
  const handleExportPDF = () => {
    if (!reportData) return;
    setGeneratingFormat("pdf");
    setExportSuccessMsg(null);
    try {
      const wilayaObj = ALGERIA_WILAYAS_69.find(w => w.code === normalizeWilayaCode(inspectorWilaya));
      generateModelPDF(selectedModel, reportData, {
        code: normalizeWilayaCode(inspectorWilaya) || "16",
        name: wilayaObj ? wilayaObj.name : "Alger"
      });
      setExportSuccessMsg("Le rapport PDF officiel a été généré et téléchargé avec succès.");
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
      const wilayaObj = ALGERIA_WILAYAS_69.find(w => w.code === normalizeWilayaCode(inspectorWilaya));
      generateModelExcel(selectedModel, reportData, {
        code: normalizeWilayaCode(inspectorWilaya) || "16",
        name: wilayaObj ? wilayaObj.name : "Alger"
      });
      setExportSuccessMsg("Le classeur Excel officiel a été généré et téléchargé avec succès.");
      setTimeout(() => setExportSuccessMsg(null), 5000);
    } catch (err) {
      console.error("Excel generation error:", err);
      setErrorMsg("Échec de la génération du fichier Excel.");
    } finally {
      setGeneratingFormat(null);
    }
  };

  // Active Filter Chips
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
    activeFilters.push({ key: "dateFrom", label: `Depuis: ${dateFrom}`, clear: () => setDateFrom("") });
  }
  if (dateTo) {
    activeFilters.push({ key: "dateTo", label: `Jusqu'à: ${dateTo}`, clear: () => setDateTo("") });
  }

  const currentWilayaObj = ALGERIA_WILAYAS_69.find(w => w.code === normalizeWilayaCode(inspectorWilaya));
  const wilayaName = currentWilayaObj ? currentWilayaObj.name : "Alger";

  if (authChecking) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", color: COLORS.navy }}>
          <RefreshCw size={32} className="animate-spin" color={COLORS.teal} />
          <span style={{ fontWeight: "700", fontSize: "0.95rem" }}>Vérification des droits de l'Inspecteur...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* 1. HEADER BANNER */}
      <div style={{ backgroundColor: "white", borderRadius: "16px", border: `1px solid ${COLORS.border}`, padding: "20px 24px", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
                <FileText size={22} />
              </div>
              <h1 style={{ fontSize: "1.4rem", fontWeight: "900", color: COLORS.navy, margin: 0, letterSpacing: "-0.02em" }}>
                Générateur de Rapports Sanitaires Officiels
              </h1>
            </div>
            <p style={{ fontSize: "0.85rem", color: COLORS.muted, margin: 0 }}>
              Consolidation épidémiologique et exportation réglementaire pour la <strong>Wilaya {inspectorWilaya} ({wilayaName})</strong>.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: COLORS.bgLight, padding: "8px 14px", borderRadius: "12px", border: `1px solid ${COLORS.border}` }}>
            <Lock size={14} color="#B45309" />
            <span style={{ fontSize: "0.82rem", fontWeight: "700", color: COLORS.navy }}>
              Périmètre : Wilaya {inspectorWilaya} - {wilayaName}
            </span>
          </div>
        </div>
      </div>

      {/* FEEDBACK ALERTS */}
      {exportSuccessMsg && (
        <div style={{ backgroundColor: "#ECFDF5", border: "1px solid #A7F3D0", color: "#065F46", padding: "12px 18px", borderRadius: "12px", fontSize: "0.88rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "10px" }}>
          <CheckCircle2 size={18} color="#059669" />
          <span>{exportSuccessMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", padding: "12px 18px", borderRadius: "12px", fontSize: "0.88rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "10px" }}>
          <AlertCircle size={18} color="#DC2626" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. UNIFIED RASED FILTER PANEL */}
      <div style={{ backgroundColor: "white", padding: "20px 24px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: "12px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Filter size={18} color={COLORS.teal} />
            <h2 style={{ fontSize: "0.98rem", fontWeight: "800", color: COLORS.navy, margin: 0 }}>
              Filtres & Critères de Sélection
            </h2>
          </div>
          <span style={{ fontSize: "0.78rem", color: COLORS.muted, fontWeight: "600" }}>
            Ajustez vos filtres pour personnaliser le rapport
          </span>
        </div>

        {/* ACTIVE FILTER CHIPS */}
        {activeFilters.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "14px", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: "700", color: COLORS.muted }}>Filtres actifs:</span>
            {activeFilters.map((chip) => (
              <span key={chip.key} style={{ backgroundColor: COLORS.lightTeal, color: COLORS.teal, border: `1px solid ${COLORS.teal}40`, padding: "3px 10px", borderRadius: "999px", fontSize: "0.78rem", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                {chip.label}
                <X size={14} style={{ cursor: "pointer" }} onClick={chip.clear} />
              </span>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
          
          {/* WILAYA LOCKED */}
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "4px" }}>
              Wilaya (Verrouillée)
            </label>
            <div style={{ padding: "9px 12px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, backgroundColor: "#F1F5F9", color: COLORS.navy, fontWeight: "700", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <Lock size={14} color="#B45309" />
              <span>Wilaya {inspectorWilaya} - {wilayaName}</span>
            </div>
          </div>

          {/* FACILITY */}
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "4px" }}>
              Établissement
            </label>
            <select
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.85rem", outline: "none", backgroundColor: COLORS.bgLight, color: COLORS.navy, fontWeight: "600" }}
            >
              <option value="">Tous les établissements</option>
              {facilitiesList.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* DISEASE */}
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "4px" }}>
              Pathologie
            </label>
            <select
              value={selectedDiseaseId}
              onChange={(e) => setSelectedDiseaseId(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.85rem", outline: "none", backgroundColor: COLORS.bgLight, color: COLORS.navy, fontWeight: "600" }}
            >
              <option value="">Toutes les pathologies</option>
              {diseasesList.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* SEVERITY */}
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "4px" }}>
              Niveau de Gravité
            </label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.85rem", outline: "none", backgroundColor: COLORS.bgLight, color: COLORS.navy, fontWeight: "600" }}
            >
              <option value="">Toutes les gravités</option>
              <option value="CRITICAL">Critique</option>
              <option value="HIGH">Élevée</option>
              <option value="MEDIUM">Moyenne</option>
              <option value="LOW">Faible</option>
            </select>
          </div>

          {/* DATE FROM */}
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "4px" }}>
              Date de début
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.85rem", outline: "none", backgroundColor: COLORS.bgLight, color: COLORS.navy, fontWeight: "600" }}
            />
          </div>

          {/* DATE TO */}
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "4px" }}>
              Date de fin
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.85rem", outline: "none", backgroundColor: COLORS.bgLight, color: COLORS.navy, fontWeight: "600" }}
            />
          </div>

        </div>

        {/* ACTION BAR */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "12px", borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: "0.82rem", color: COLORS.muted, fontWeight: "700" }}>
            {reportData?.summary?.totalEvents || 0} événement(s) correspondent à vos filtres
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleResetFilters}
              style={{ backgroundColor: "white", border: `1px solid ${COLORS.border}`, padding: "8px 16px", borderRadius: "10px", fontSize: "0.82rem", fontWeight: "700", color: COLORS.navy, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <RotateCcw size={14} /> Réinitialiser
            </button>
            <button
              onClick={() => fetchReport(selectedModel)}
              disabled={isLoading}
              style={{ backgroundColor: COLORS.navy, border: "none", padding: "8px 20px", borderRadius: "10px", fontSize: "0.82rem", fontWeight: "800", color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Filter size={14} /> Appliquer les filtres
            </button>
          </div>
        </div>
      </div>

      {/* 3. EXECUTIVE KPI CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        
        <div style={{ backgroundColor: "white", padding: "18px 20px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 16px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: "800", color: COLORS.muted, textTransform: "uppercase" }}>Total Événements</span>
            <div style={{ padding: "6px", borderRadius: "8px", backgroundColor: COLORS.lightTeal, color: COLORS.teal }}><Activity size={18} /></div>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: "900", color: COLORS.navy }}>{reportData?.summary?.totalEvents || 0}</div>
          <div style={{ fontSize: "0.75rem", color: COLORS.muted, marginTop: "2px" }}>Wilaya autorisée</div>
        </div>

        <div style={{ backgroundColor: "white", padding: "18px 20px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 16px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: "800", color: COLORS.muted, textTransform: "uppercase" }}>Cas Critiques</span>
            <div style={{ padding: "6px", borderRadius: "8px", backgroundColor: "#FEE2E2", color: "#DC2626" }}><AlertTriangle size={18} /></div>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: "900", color: "#DC2626" }}>{reportData?.summary?.criticalCount || 0}</div>
          <div style={{ fontSize: "0.75rem", color: COLORS.muted, marginTop: "2px" }}>Urgence sanitaire absolue</div>
        </div>

        <div style={{ backgroundColor: "white", padding: "18px 20px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 16px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: "800", color: COLORS.muted, textTransform: "uppercase" }}>Pathologies</span>
            <div style={{ padding: "6px", borderRadius: "8px", backgroundColor: COLORS.lightTeal, color: COLORS.teal }}><Stethoscope size={18} /></div>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: "900", color: COLORS.navy }}>{reportData?.diseases?.length || 0}</div>
          <div style={{ fontSize: "0.75rem", color: COLORS.muted, marginTop: "2px" }}>Maladies déclarées</div>
        </div>

        <div style={{ backgroundColor: "white", padding: "18px 20px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 16px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: "800", color: COLORS.muted, textTransform: "uppercase" }}>Établissements</span>
            <div style={{ padding: "6px", borderRadius: "8px", backgroundColor: "#E0F2FE", color: "#0369A1" }}><Building2 size={18} /></div>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: "900", color: COLORS.navy }}>{reportData?.summary?.totalFacilities || 0}</div>
          <div style={{ fontSize: "0.75rem", color: COLORS.muted, marginTop: "2px" }}>Structures actives</div>
        </div>

      </div>

      {/* 4. REPORT MODEL SELECTOR & EXPORT ACTION BAR */}
      <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
        
        {/* ACTION BAR HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "900", color: COLORS.navy, margin: 0 }}>
              Modèles de Rapports Sanitaires Officiels
            </h2>
            <p style={{ fontSize: "0.82rem", color: COLORS.muted, margin: "2px 0 0 0" }}>
              Sélectionnez un modèle analytique pour activer la vue et l'exportation dédiée.
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={handleExportPDF}
              disabled={isLoading || generatingFormat !== null}
              style={{
                backgroundColor: COLORS.teal,
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "10px",
                fontSize: "0.85rem",
                fontWeight: "800",
                cursor: isLoading || generatingFormat !== null ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: isLoading || generatingFormat !== null ? 0.7 : 1,
                boxShadow: "0 4px 12px rgba(15,162,155,0.25)"
              }}
            >
              {generatingFormat === "pdf" ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Génération du PDF...
                </>
              ) : (
                <>
                  <FileText size={16} /> Générer Rapport PDF
                </>
              )}
            </button>

            <button
              onClick={handleExportExcel}
              disabled={isLoading || generatingFormat !== null}
              style={{
                backgroundColor: "white",
                color: COLORS.navy,
                border: `1.5px solid ${COLORS.navy}`,
                padding: "10px 20px",
                borderRadius: "10px",
                fontSize: "0.85rem",
                fontWeight: "800",
                cursor: isLoading || generatingFormat !== null ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: isLoading || generatingFormat !== null ? 0.7 : 1
              }}
            >
              {generatingFormat === "excel" ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Export Excel...
                </>
              ) : (
                <>
                  <FileSpreadsheet size={16} /> Exporter Excel
                </>
              )}
            </button>
          </div>
        </div>

        {/* 5 REPORT MODEL CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
          
          {/* MODEL 1: SYNTHÈSE SANITAIRE */}
          <div
            onClick={() => handleSelectModel("synthesis")}
            style={{
              padding: "16px",
              borderRadius: "14px",
              border: selectedModel === "synthesis" ? `2px solid ${COLORS.teal}` : `1px solid ${COLORS.border}`,
              backgroundColor: selectedModel === "synthesis" ? COLORS.lightTeal : "white",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div style={{ padding: "6px", borderRadius: "8px", backgroundColor: selectedModel === "synthesis" ? COLORS.teal : COLORS.bgLight, color: selectedModel === "synthesis" ? "white" : COLORS.navy }}>
                <Layers size={18} />
              </div>
              <div style={{ fontSize: "0.92rem", fontWeight: "800", color: COLORS.navy }}>
                Synthèse Sanitaire
              </div>
            </div>
            <div style={{ fontSize: "0.78rem", color: COLORS.muted }}>
              Bilan global des établissements de la wilaya
            </div>
          </div>

          {/* MODEL 2: PAR ÉTABLISSEMENT */}
          <div
            onClick={() => handleSelectModel("facility")}
            style={{
              padding: "16px",
              borderRadius: "14px",
              border: selectedModel === "facility" ? `2px solid ${COLORS.teal}` : `1px solid ${COLORS.border}`,
              backgroundColor: selectedModel === "facility" ? COLORS.lightTeal : "white",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div style={{ padding: "6px", borderRadius: "8px", backgroundColor: selectedModel === "facility" ? COLORS.teal : COLORS.bgLight, color: selectedModel === "facility" ? "white" : COLORS.navy }}>
                <Building2 size={18} />
              </div>
              <div style={{ fontSize: "0.92rem", fontWeight: "800", color: COLORS.navy }}>
                Par Établissement
              </div>
            </div>
            <div style={{ fontSize: "0.78rem", color: COLORS.muted }}>
              Analyse détaillée par structure de santé
            </div>
          </div>

          {/* MODEL 3: PAR PATHOLOGIE */}
          <div
            onClick={() => handleSelectModel("pathology")}
            style={{
              padding: "16px",
              borderRadius: "14px",
              border: selectedModel === "pathology" ? `2px solid ${COLORS.teal}` : `1px solid ${COLORS.border}`,
              backgroundColor: selectedModel === "pathology" ? COLORS.lightTeal : "white",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div style={{ padding: "6px", borderRadius: "8px", backgroundColor: selectedModel === "pathology" ? COLORS.teal : COLORS.bgLight, color: selectedModel === "pathology" ? "white" : COLORS.navy }}>
                <Stethoscope size={18} />
              </div>
              <div style={{ fontSize: "0.92rem", fontWeight: "800", color: COLORS.navy }}>
                Par Pathologie
              </div>
            </div>
            <div style={{ fontSize: "0.78rem", color: COLORS.muted }}>
              Répartition des maladies déclarées
            </div>
          </div>

          {/* MODEL 4: PAR GRAVITÉ */}
          <div
            onClick={() => handleSelectModel("severity")}
            style={{
              padding: "16px",
              borderRadius: "14px",
              border: selectedModel === "severity" ? `2px solid ${COLORS.teal}` : `1px solid ${COLORS.border}`,
              backgroundColor: selectedModel === "severity" ? COLORS.lightTeal : "white",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div style={{ padding: "6px", borderRadius: "8px", backgroundColor: selectedModel === "severity" ? COLORS.teal : COLORS.bgLight, color: selectedModel === "severity" ? "white" : COLORS.navy }}>
                <AlertTriangle size={18} />
              </div>
              <div style={{ fontSize: "0.92rem", fontWeight: "800", color: COLORS.navy }}>
                Par Gravité
              </div>
            </div>
            <div style={{ fontSize: "0.78rem", color: COLORS.muted }}>
              Distribution des degrés de sévérité
            </div>
          </div>

          {/* MODEL 5: REGISTRE DÉTAILLÉ */}
          <div
            onClick={() => handleSelectModel("detailed")}
            style={{
              padding: "16px",
              borderRadius: "14px",
              border: selectedModel === "detailed" ? `2px solid ${COLORS.teal}` : `1px solid ${COLORS.border}`,
              backgroundColor: selectedModel === "detailed" ? COLORS.lightTeal : "white",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div style={{ padding: "6px", borderRadius: "8px", backgroundColor: selectedModel === "detailed" ? COLORS.teal : COLORS.bgLight, color: selectedModel === "detailed" ? "white" : COLORS.navy }}>
                <FileCheck size={18} />
              </div>
              <div style={{ fontSize: "0.92rem", fontWeight: "800", color: COLORS.navy }}>
                Registre Détaillé
              </div>
            </div>
            <div style={{ fontSize: "0.78rem", color: COLORS.muted }}>
              Fiches et dossiers individuels des cas
            </div>
          </div>

        </div>

      </div>

      {/* 5. ONSCREEN MODEL-SPECIFIC PREVIEW PANEL */}
      {isLoading ? (
        <div style={{ backgroundColor: "white", padding: "60px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, textAlign: "center", color: COLORS.navy }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 12px auto", color: COLORS.teal }} />
          <div style={{ fontWeight: "700" }}>Chargement du modèle de rapport...</div>
        </div>
      ) : !reportData ? (
        <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, textAlign: "center", color: COLORS.muted }}>
          <AlertCircle size={36} color={COLORS.muted} style={{ margin: "0 auto 12px auto" }} />
          <div>Aucune donnée disponible pour les filtres sélectionnés.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* 5.1 PREVIEW MODEL: SYNTHÈSE SANITAIRE */}
          {selectedModel === "synthesis" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
              
              {/* PATHOLOGIES SUMMARY BOX */}
              <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "16px", border: `1px solid ${COLORS.border}` }}>
                <h3 style={{ fontSize: "0.98rem", fontWeight: "800", color: COLORS.navy, margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Stethoscope size={18} color={COLORS.teal} /> Pathologies Principales ({wilayaName})
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {reportData.diseases.length === 0 ? (
                    <div style={{ fontSize: "0.85rem", color: COLORS.muted }}>Aucune pathologie déclarée.</div>
                  ) : (
                    reportData.diseases.map((d) => (
                      <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", backgroundColor: COLORS.bgLight, borderRadius: "10px", border: `1px solid ${COLORS.border}` }}>
                        <span style={{ fontSize: "0.88rem", fontWeight: "700", color: COLORS.navy }}>{d.name}</span>
                        <span style={{ backgroundColor: COLORS.lightTeal, color: COLORS.teal, padding: "3px 10px", borderRadius: "999px", fontSize: "0.78rem", fontWeight: "800" }}>
                          {d.count} cas ({d.percentage}%)
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* SEVERITY SUMMARY BOX */}
              <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "16px", border: `1px solid ${COLORS.border}` }}>
                <h3 style={{ fontSize: "0.98rem", fontWeight: "800", color: COLORS.navy, margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertTriangle size={18} color="#EA580C" /> Degrés de Gravité
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[
                    { label: "Critique", count: reportData.summary.criticalCount, color: "#DC2626", bg: "#FEE2E2" },
                    { label: "Élevée", count: reportData.summary.highCount, color: "#EA580C", bg: "#FFEDD5" },
                    { label: "Moyenne", count: reportData.summary.mediumCount, color: COLORS.navy, bg: COLORS.bgLight },
                    { label: "Faible", count: reportData.summary.lowCount, color: COLORS.teal, bg: COLORS.lightTeal }
                  ].map(sev => {
                    const total = reportData.summary.totalEvents || 1;
                    const pct = ((sev.count / total) * 100).toFixed(0);
                    return (
                      <div key={sev.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", backgroundColor: COLORS.bgLight, borderRadius: "10px", border: `1px solid ${COLORS.border}` }}>
                        <span style={{ fontSize: "0.88rem", fontWeight: "700", color: COLORS.navy }}>{sev.label}</span>
                        <span style={{ backgroundColor: sev.bg, color: sev.color, padding: "3px 10px", borderRadius: "999px", fontSize: "0.78rem", fontWeight: "800" }}>
                          {sev.count} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* 5.2 PREVIEW MODEL: PAR ÉTABLISSEMENT */}
          {selectedModel === "facility" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {reportData.facilities.length === 0 ? (
                <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, textAlign: "center", color: COLORS.muted }}>
                  Aucun établissement actif répertorié.
                </div>
              ) : (
                reportData.facilities.map(fac => {
                  const facEvents = reportData.events.filter(e => e.facilityName === fac.name);
                  const crit = facEvents.filter(e => e.severity === "CRITICAL").length;
                  const high = facEvents.filter(e => e.severity === "HIGH").length;
                  const med = facEvents.filter(e => e.severity === "MEDIUM").length;
                  const low = facEvents.filter(e => e.severity === "LOW").length;

                  // Unique diseases at this facility
                  const diseaseMap: Record<string, number> = {};
                  facEvents.forEach(e => { diseaseMap[e.diseaseName] = (diseaseMap[e.diseaseName] || 0) + 1; });

                  return (
                    <div key={fac.id} style={{ backgroundColor: "white", borderRadius: "16px", border: `1px solid ${COLORS.border}`, padding: "20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
                        <div>
                          <span style={{ backgroundColor: COLORS.lightTeal, color: COLORS.teal, padding: "3px 10px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: "800" }}>
                            {fac.facilityType || "Structure de Santé"}
                          </span>
                          <h3 style={{ fontSize: "1.1rem", fontWeight: "900", color: COLORS.navy, margin: "6px 0 2px 0" }}>
                            {fac.name}
                          </h3>
                          <div style={{ fontSize: "0.8rem", color: COLORS.muted }}>
                            Wilaya {fac.wilaya || inspectorWilaya}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                          <span style={{ backgroundColor: "#FEE2E2", color: "#DC2626", padding: "4px 10px", borderRadius: "8px", fontSize: "0.78rem", fontWeight: "800" }}>
                            {crit} Critiques
                          </span>
                          <span style={{ backgroundColor: "#FFEDD5", color: "#EA580C", padding: "4px 10px", borderRadius: "8px", fontSize: "0.78rem", fontWeight: "800" }}>
                            {high} Élevés
                          </span>
                          <span style={{ backgroundColor: COLORS.bgLight, color: COLORS.navy, padding: "4px 10px", borderRadius: "8px", fontSize: "0.78rem", fontWeight: "800", border: `1px solid ${COLORS.border}` }}>
                            {med} Moyens
                          </span>
                          <span style={{ backgroundColor: COLORS.lightTeal, color: COLORS.teal, padding: "4px 10px", borderRadius: "8px", fontSize: "0.78rem", fontWeight: "800" }}>
                            {low} Faibles
                          </span>
                        </div>
                      </div>

                      <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: "12px", marginTop: "12px" }}>
                        <div style={{ fontSize: "0.8rem", fontWeight: "800", color: COLORS.navy, marginBottom: "8px" }}>
                          Pathologies déclarées au sein de la structure:
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                          {Object.keys(diseaseMap).map(dis => (
                            <span key={dis} style={{ backgroundColor: COLORS.bgLight, color: COLORS.navy, border: `1px solid ${COLORS.border}`, padding: "4px 10px", borderRadius: "8px", fontSize: "0.8rem", fontWeight: "700" }}>
                              {dis}: <strong>{diseaseMap[dis]} cas</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 5.3 PREVIEW MODEL: PAR PATHOLOGIE */}
          {selectedModel === "pathology" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
              {reportData.diseases.length === 0 ? (
                <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, textAlign: "center", color: COLORS.muted }}>
                  Aucune pathologie enregistrée.
                </div>
              ) : (
                reportData.diseases.map(d => {
                  const disEvents = reportData.events.filter(e => e.diseaseName === d.name);
                  const facSet = new Set(disEvents.map(e => e.facilityName));

                  return (
                    <div key={d.id} style={{ backgroundColor: "white", padding: "20px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "12px" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontSize: "0.78rem", fontWeight: "800", color: COLORS.teal, textTransform: "uppercase" }}>Pathologie Déclarable</span>
                          <span style={{ backgroundColor: COLORS.lightTeal, color: COLORS.teal, padding: "3px 10px", borderRadius: "999px", fontSize: "0.8rem", fontWeight: "800" }}>
                            {d.count} cas ({d.percentage}%)
                          </span>
                        </div>

                        <h3 style={{ fontSize: "1.15rem", fontWeight: "900", color: COLORS.navy, margin: 0 }}>
                          {d.name}
                        </h3>
                      </div>

                      <div style={{ backgroundColor: COLORS.bgLight, padding: "12px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.82rem" }}>
                        <div style={{ color: COLORS.muted, marginBottom: "4px" }}>Établissements concernés ({facSet.size}):</div>
                        <div style={{ fontWeight: "700", color: COLORS.navy }}>
                          {Array.from(facSet).join(", ") || "—"}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 5.4 PREVIEW MODEL: PAR GRAVITÉ */}
          {selectedModel === "severity" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
              {[
                { key: "CRITICAL", label: "Critique", desc: "Urgence sanitaire absolue", color: "#DC2626", bg: "#FEE2E2", count: reportData.summary.criticalCount },
                { key: "HIGH", label: "Élevée", desc: "Surveillance rapprochée", color: "#EA580C", bg: "#FFEDD5", count: reportData.summary.highCount },
                { key: "MEDIUM", label: "Moyenne", desc: "Cas confirmé standard", color: COLORS.navy, bg: COLORS.bgLight, count: reportData.summary.mediumCount },
                { key: "LOW", label: "Faible", desc: "Signalement de routine", color: COLORS.teal, bg: COLORS.lightTeal, count: reportData.summary.lowCount },
              ].map(sev => {
                const total = reportData.summary.totalEvents || 1;
                const pct = ((sev.count / total) * 100).toFixed(0);
                const sevEvents = reportData.events.filter(e => e.severity === sev.key);
                const facCount = new Set(sevEvents.map(e => e.facilityName)).size;

                return (
                  <div key={sev.key} style={{ backgroundColor: "white", padding: "20px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "12px" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: "800", color: COLORS.muted, textTransform: "uppercase" }}>{sev.label}</span>
                        <span style={{ backgroundColor: sev.bg, color: sev.color, padding: "3px 10px", borderRadius: "999px", fontSize: "0.8rem", fontWeight: "800" }}>
                          {pct}%
                        </span>
                      </div>

                      <div style={{ fontSize: "1.8rem", fontWeight: "900", color: sev.color }}>
                        {sev.count} cas
                      </div>
                      <div style={{ fontSize: "0.8rem", color: COLORS.muted }}>{sev.desc}</div>
                    </div>

                    <div style={{ backgroundColor: COLORS.bgLight, padding: "10px 12px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.8rem", color: COLORS.navy, fontWeight: "700" }}>
                      {facCount} structure(s) sanitaire(s) touchée(s)
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 5.5 PREVIEW MODEL: REGISTRE DÉTAILLÉ */}
          {selectedModel === "detailed" && (
            <div style={{ backgroundColor: "white", borderRadius: "16px", border: `1px solid ${COLORS.border}`, padding: "20px", boxShadow: "0 4px 16px rgba(0,0,0,0.02)" }}>
              <div style={{ fontSize: "1rem", fontWeight: "800", color: COLORS.navy, marginBottom: "16px" }}>
                Fiches d'Événements Individuels ({reportData.events.length})
              </div>

              {reportData.events.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px", color: COLORS.muted }}>
                  Aucun enregistrement détaillé disponible.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {reportData.events.map(ev => (
                    <div key={ev.id} style={{ backgroundColor: COLORS.bgLight, borderRadius: "14px", border: `1px solid ${COLORS.border}`, padding: "16px 20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ backgroundColor: COLORS.navy, color: "white", padding: "3px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "800" }}>
                            #EV-{ev.id.substring(0, 8).toUpperCase()}
                          </span>
                          <span style={{ fontSize: "0.95rem", fontWeight: "800", color: COLORS.navy }}>
                            {ev.diseaseName}
                          </span>
                        </div>

                        <span style={{
                          padding: "3px 10px",
                          borderRadius: "999px",
                          fontSize: "0.75rem",
                          fontWeight: "800",
                          backgroundColor: ev.severity === "CRITICAL" ? "#FEE2E2" : ev.severity === "HIGH" ? "#FFEDD5" : COLORS.lightTeal,
                          color: ev.severity === "CRITICAL" ? "#DC2626" : ev.severity === "HIGH" ? "#EA580C" : COLORS.teal
                        }}>
                          {ev.severity}
                        </span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px", fontSize: "0.82rem", color: COLORS.text, margin: "10px 0" }}>
                        <div><strong>Établissement:</strong> {ev.facilityName}</div>
                        <div><strong>Médecin:</strong> Dr. {ev.doctorName || "Anonymisé"}</div>
                        <div><strong>Patient:</strong> {ev.patientName || "Cas Anonymisé"}</div>
                        <div><strong>Date:</strong> {formatDateTime(ev.createdAt)}</div>
                      </div>

                      <div style={{ fontSize: "0.82rem", color: COLORS.muted, fontStyle: "italic" }}>
                        Observations: « {ev.description || "Aucune observation enregistrée"} »
                      </div>

                      {ev.patientProofUrl && (
                        <div style={{ marginTop: "10px" }}>
                          <button
                            onClick={() => setSelectedProofUrl(ev.patientProofUrl || null)}
                            style={{ backgroundColor: COLORS.teal, color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "0.78rem", fontWeight: "700", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <Eye size={13} /> Consulter Preuve Médicale
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* MEDICAL PROOF MODAL */}
      <MedicalProofModal
        proofPath={selectedProofUrl}
        onClose={() => setSelectedProofUrl(null)}
      />

    </div>
  );
}
