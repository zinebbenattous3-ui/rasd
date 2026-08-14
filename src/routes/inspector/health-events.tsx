import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { validateCurrentSession } from "@/lib/auth";
import { normalizeWilayaCode } from "@/lib/wilayas";
import { MedicalProofModal } from "@/components/MedicalProofModal";
import { DatePicker } from "@/components/ui/date-picker";
import { UnifiedSelect } from "@/components/ui/UnifiedSelect";
import { 
  Activity, 
  Search, 
  Filter, 
  Building2, 
  Eye, 
  RefreshCw, 
  Lock, 
  MapPin, 
  AlertTriangle, 
  X, 
  FileText, 
  Calendar,
  Image as ImageIcon,
  RotateCcw,
  Stethoscope,
  User
} from "lucide-react";

export const Route = createFileRoute("/inspector/health-events")({
  head: () => ({
    meta: [
      { title: "Événements de Santé — Inspectorat Rased" },
    ],
  }),
  component: InspectorHealthEventsPage,
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

export function InspectorHealthEventsPage() {
  const [loading, setLoading] = useState(true);
  const [inspectorWilaya, setInspectorWilaya] = useState<string | null>(null);
  
  // Database datasets
  const [events, setEvents] = useState<any[]>([]);
  const [facilitiesList, setFacilitiesList] = useState<any[]>([]);
  const [diseasesList, setDiseasesList] = useState<any[]>([]);

  // Draft Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFacilityId, setSelectedFacilityId] = useState("");
  const [selectedDiseaseId, setSelectedDiseaseId] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Applied Filters
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedFacility, setAppliedFacility] = useState("");
  const [appliedDisease, setAppliedDisease] = useState("");
  const [appliedSeverity, setAppliedSeverity] = useState("");
  const [appliedDateFrom, setAppliedDateFrom] = useState("");
  const [appliedDateTo, setAppliedDateTo] = useState("");

  // Modals state
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const authResult = await validateCurrentSession(["INSPECTOR"]);
      if (!authResult.authorized || !authResult.user) return;

      const { data: inspRec } = await supabase
        .from("inspectors")
        .select("wilaya")
        .eq("user_id", authResult.user.id)
        .maybeSingle();

      if (inspRec?.wilaya) {
        setInspectorWilaya(inspRec.wilaya);
        const normCode = normalizeWilayaCode(inspRec.wilaya);

        // Fetch facilities in Inspector's Wilaya
        const { data: facs } = await supabase
          .from("facilities")
          .select("id, name, facility_type, wilaya")
          .ilike("wilaya", `%${normCode}%`)
          .order("name");

        const facList = facs || [];
        setFacilitiesList(facList);

        // Fetch reportable diseases list
        const { data: diseases } = await supabase
          .from("reportable_diseases")
          .select("id, name")
          .order("name");
        setDiseasesList(diseases || []);

        const facIds = facList.map(f => f.id);

        if (facIds.length > 0) {
          // Fetch health_events joined with doctor, facility, patient, reportable_diseases
          const { data: evData } = await supabase
            .from("health_events")
            .select(`
              id,
              doctor_id,
              facility_id,
              patient_id,
              description,
              severity,
              patient_proof_url,
              created_at,
              updated_at,
              reportable_disease_id,
              facility:facility_id (id, name, facility_type, wilaya),
              reportable_diseases:reportable_disease_id (id, name),
              doctor:doctor_id (
                id,
                specialty,
                users:user_id (first_name, last_name, email)
              ),
              patient:patient_id (
                id,
                first_name,
                last_name
              )
            `)
            .in("facility_id", facIds)
            .order("created_at", { ascending: false });

          setEvents(evData || []);
        } else {
          setEvents([]);
        }
      }
    } catch (err) {
      console.error("Error loading health events for inspector:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter handlers
  const handleApplyFilters = () => {
    setAppliedSearch(searchQuery);
    setAppliedFacility(selectedFacilityId);
    setAppliedDisease(selectedDiseaseId);
    setAppliedSeverity(selectedSeverity);
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedFacilityId("");
    setSelectedDiseaseId("");
    setSelectedSeverity("");
    setDateFrom("");
    setDateTo("");

    setAppliedSearch("");
    setAppliedFacility("");
    setAppliedDisease("");
    setAppliedSeverity("");
    setAppliedDateFrom("");
    setAppliedDateTo("");
  };

  // Filtered dataset logic
  const filteredEvents = events.filter((e) => {
    const disObj = Array.isArray(e.reportable_diseases) ? e.reportable_diseases[0] : e.reportable_diseases;
    const diseaseName = disObj?.name || "";
    const facName = e.facility?.name || "";
    const docName = e.doctor?.users ? `${e.doctor.users.first_name} ${e.doctor.users.last_name}` : "";
    const description = e.description || "";

    const matchesSearch = 
      !appliedSearch ||
      diseaseName.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      facName.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      docName.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      description.toLowerCase().includes(appliedSearch.toLowerCase());

    const matchesFacility = !appliedFacility || e.facility_id === appliedFacility;
    const matchesDisease = !appliedDisease || e.reportable_disease_id === appliedDisease;
    const matchesSeverity = !appliedSeverity || e.severity === appliedSeverity;

    let matchesDateFrom = true;
    if (appliedDateFrom) {
      matchesDateFrom = new Date(e.created_at) >= new Date(appliedDateFrom);
    }

    let matchesDateTo = true;
    if (appliedDateTo) {
      const end = new Date(appliedDateTo);
      end.setHours(23, 59, 59, 999);
      matchesDateTo = new Date(e.created_at) <= end;
    }

    return matchesSearch && matchesFacility && matchesDisease && matchesSeverity && matchesDateFrom && matchesDateTo;
  });

  // Active Filter Chips
  const activeChips = [];
  if (appliedSearch) {
    activeChips.push({
      key: "search",
      label: `Recherche: "${appliedSearch}"`,
      clear: () => { setSearchQuery(""); setAppliedSearch(""); }
    });
  }
  if (appliedFacility) {
    const facObj = facilitiesList.find(f => f.id === appliedFacility);
    activeChips.push({
      key: "facility",
      label: `Établissement: ${facObj ? facObj.name : "Sélectionné"}`,
      clear: () => { setSelectedFacilityId(""); setAppliedFacility(""); }
    });
  }
  if (appliedDisease) {
    const disObj = diseasesList.find(d => d.id === appliedDisease);
    activeChips.push({
      key: "disease",
      label: `Pathologie: ${disObj ? disObj.name : "Sélectionnée"}`,
      clear: () => { setSelectedDiseaseId(""); setAppliedDisease(""); }
    });
  }
  if (appliedSeverity) {
    const sevMap: Record<string, string> = { CRITICAL: "Critique", HIGH: "Élevée", MEDIUM: "Moyenne", LOW: "Faible" };
    activeChips.push({
      key: "severity",
      label: `Gravité: ${sevMap[appliedSeverity] || appliedSeverity}`,
      clear: () => { setSelectedSeverity(""); setAppliedSeverity(""); }
    });
  }
  if (appliedDateFrom) {
    activeChips.push({
      key: "dateFrom",
      label: `Depuis: ${appliedDateFrom}`,
      clear: () => { setDateFrom(""); setAppliedDateFrom(""); }
    });
  }
  if (appliedDateTo) {
    activeChips.push({
      key: "dateTo",
      label: `Jusqu'à: ${appliedDateTo}`,
      clear: () => { setDateTo(""); setAppliedDateTo(""); }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", backgroundColor: "white", padding: "24px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
              <Activity size={22} />
            </div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "900", color: COLORS.navy, margin: 0, letterSpacing: "-0.02em" }}>
              Événements de Santé Signalés
            </h1>
          </div>
          <p style={{ fontSize: "0.88rem", color: COLORS.muted, margin: 0 }}>
            Registre de surveillance épidémiologique des cas déclarés dans la Wilaya {inspectorWilaya || "—"}.
          </p>
        </div>

        <button onClick={loadData} disabled={loading} style={{ background: "white", border: `1px solid ${COLORS.border}`, padding: "10px", borderRadius: "12px", cursor: "pointer", color: COLORS.navy }}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* UNIFIED RASED FILTER PANEL */}
      <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: "16px", marginBottom: "20px" }}>
          <Filter size={18} color={COLORS.teal} />
          <h2 style={{ fontSize: "1rem", fontWeight: "800", color: COLORS.navy, margin: 0 }}>
            Filtres & Critères de Surveillance
          </h2>
        </div>

        {/* ACTIVE FILTER CHIPS */}
        {activeChips.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "18px", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: "700", color: COLORS.muted }}>Filtres actifs:</span>
            {activeChips.map(chip => (
              <span key={chip.key} style={{ backgroundColor: COLORS.lightTeal, color: COLORS.teal, border: `1px solid ${COLORS.teal}40`, padding: "4px 10px", borderRadius: "999px", fontSize: "0.78rem", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                {chip.label}
                <X size={14} style={{ cursor: "pointer" }} onClick={chip.clear} />
              </span>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
          
          {/* WILAYA (LOCKED) */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
              Wilaya (Verrouillée)
            </label>
            <div style={{ padding: "10px 14px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, backgroundColor: "#F1F5F9", color: COLORS.navy, fontWeight: "700", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <Lock size={15} color="#B45309" />
              <span>Wilaya {inspectorWilaya || "—"}</span>
            </div>
          </div>

          {/* FACILITY FILTER */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
              Établissement
            </label>
            <UnifiedSelect
              icon={Building2}
              value={selectedFacilityId}
              onChange={(val: string) => setSelectedFacilityId(val)}
              placeholder="Tous les établissements"
              options={[
                { value: "", label: "Tous les établissements" },
                ...facilitiesList.map((fac) => ({ value: fac.id, label: fac.name }))
              ]}
            />
          </div>

          {/* DISEASE FILTER */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
              Pathologie
            </label>
            <UnifiedSelect
              icon={Activity}
              value={selectedDiseaseId}
              onChange={(val: string) => setSelectedDiseaseId(val)}
              placeholder="Toutes les pathologies"
              options={[
                { value: "", label: "Toutes les pathologies" },
                ...diseasesList.map((dis) => ({ value: dis.id, label: dis.name }))
              ]}
            />
          </div>

          {/* SEVERITY FILTER */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
              Niveau de Gravité
            </label>
            <UnifiedSelect
              icon={AlertTriangle}
              value={selectedSeverity}
              onChange={(val: string) => setSelectedSeverity(val)}
              placeholder="Toutes les gravités"
              options={[
                { value: "", label: "Toutes les gravités" },
                { value: "CRITICAL", label: "Critique" },
                { value: "HIGH", label: "Élevée" },
                { value: "MEDIUM", label: "Moyenne" },
                { value: "LOW", label: "Faible" }
              ]}
            />
          </div>

          {/* DATE FROM */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
              Date de début
            </label>
            <DatePicker
              value={dateFrom}
              onChange={(val) => setDateFrom(val)}
              placeholder="Date de début..."
              maxDate={dateTo || undefined}
            />
          </div>

          {/* DATE TO */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
              Date de fin
            </label>
            <DatePicker
              value={dateTo}
              onChange={(val) => setDateTo(val)}
              placeholder="Date de fin..."
              minDate={dateFrom || undefined}
            />
          </div>

        </div>

        {/* ACTION BAR */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", paddingTop: "16px", borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: "0.82rem", color: COLORS.muted, fontWeight: "700" }}>
            {filteredEvents.length} signalement(s) trouvé(s)
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleResetFilters}
              style={{ backgroundColor: "white", border: `1px solid ${COLORS.border}`, padding: "8px 16px", borderRadius: "10px", fontSize: "0.85rem", fontWeight: "700", color: COLORS.navy, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <RotateCcw size={14} /> Réinitialiser
            </button>
            <button
              onClick={handleApplyFilters}
              style={{ backgroundColor: COLORS.navy, border: "none", padding: "8px 20px", borderRadius: "10px", fontSize: "0.85rem", fontWeight: "800", color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Filter size={14} /> Appliquer les filtres
            </button>
          </div>
        </div>
      </div>

      {/* EVENTS TABLE */}
      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: COLORS.navy }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 12px auto", color: COLORS.teal }} />
          <div style={{ fontWeight: "700" }}>Chargement des signalements...</div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, textAlign: "center", color: COLORS.muted }}>
          <Activity size={40} color={COLORS.muted} style={{ margin: "0 auto 12px auto" }} />
          <div style={{ fontSize: "1rem", fontWeight: "700", color: COLORS.navy }}>Aucun événement de santé trouvé</div>
          <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>Ajustez vos filtres de recherche.</div>
        </div>
      ) : (
        <div style={{ backgroundColor: "white", borderRadius: "18px", border: `1px solid ${COLORS.border}`, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.02)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ backgroundColor: COLORS.bgLight, borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                <th style={{ padding: "14px 18px", fontWeight: "800" }}>Date & Heure</th>
                <th style={{ padding: "14px 18px", fontWeight: "800" }}>Pathologie / Maladie</th>
                <th style={{ padding: "14px 18px", fontWeight: "800" }}>Établissement</th>
                <th style={{ padding: "14px 18px", fontWeight: "800" }}>Niveau Gravité</th>
                <th style={{ padding: "14px 18px", fontWeight: "800" }}>Médecin Déclarant</th>
                <th style={{ padding: "14px 18px", fontWeight: "800", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((ev) => (
                <tr key={ev.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: "14px 18px", color: COLORS.navy, fontWeight: "600" }}>
                    {formatDateTime(ev.created_at)}
                  </td>
                  <td style={{ padding: "14px 18px", fontWeight: "800", color: COLORS.navy }}>
                    {(Array.isArray(ev.reportable_diseases) ? ev.reportable_diseases[0] : ev.reportable_diseases)?.name || "Non spécifié"}
                  </td>
                  <td style={{ padding: "14px 18px", color: COLORS.muted }}>
                    {ev.facility?.name || "—"}
                  </td>
                  <td style={{ padding: "14px 18px" }}>
                    <span style={{
                      padding: "4px 10px",
                      borderRadius: "999px",
                      fontSize: "0.75rem",
                      fontWeight: "800",
                      backgroundColor: ev.severity === "CRITICAL" ? "#FEE2E2" : ev.severity === "HIGH" ? "#FFEDD5" : COLORS.lightTeal,
                      color: ev.severity === "CRITICAL" ? "#DC2626" : ev.severity === "HIGH" ? "#EA580C" : COLORS.teal
                    }}>
                      {ev.severity}
                    </span>
                  </td>
                  <td style={{ padding: "14px 18px", color: COLORS.navy }}>
                    Dr. {ev.doctor?.users?.first_name || ""} {ev.doctor?.users?.last_name || "Anonyme"}
                  </td>
                  <td style={{ padding: "14px 18px", textAlign: "right" }}>
                    <button
                      onClick={() => setSelectedEvent(ev)}
                      style={{ backgroundColor: COLORS.navy, color: "white", border: "none", padding: "6px 14px", borderRadius: "8px", fontWeight: "700", fontSize: "0.8rem", cursor: "pointer" }}
                    >
                      Consulter
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedEvent && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(6,44,84,0.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(4px)" }}>
          <div style={{ backgroundColor: "white", borderRadius: "20px", maxWidth: "600px", width: "100%", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "20px 24px", backgroundColor: COLORS.navy, color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: COLORS.teal, fontWeight: "800", textTransform: "uppercase" }}>Détails du Signalement</div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "900", margin: "4px 0 0 0", color: "white" }}>
                  {(Array.isArray(selectedEvent.reportable_diseases) ? selectedEvent.reportable_diseases[0] : selectedEvent.reportable_diseases)?.name || "Signalement Sanitaire"}
                </h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}><X size={24} /></button>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "14px", fontSize: "0.9rem" }}>
              <div><strong>Pathologie:</strong> {(Array.isArray(selectedEvent.reportable_diseases) ? selectedEvent.reportable_diseases[0] : selectedEvent.reportable_diseases)?.name || "Non spécifiée"}</div>
              <div><strong>Gravité:</strong> {selectedEvent.severity}</div>
              <div><strong>Description / Observations:</strong> {selectedEvent.description || "Aucune observation supplémentaire"}</div>
              <div><strong>Établissement:</strong> {selectedEvent.facility?.name} (Wilaya {selectedEvent.facility?.wilaya})</div>
              <div><strong>Médecin déclarant:</strong> Dr. {selectedEvent.doctor?.users?.first_name} {selectedEvent.doctor?.users?.last_name}</div>
              <div><strong>Patient (Confidentiel):</strong> {selectedEvent.patient?.first_name ? `${selectedEvent.patient.first_name} ${selectedEvent.patient.last_name}` : "Cas Anonymisé"}</div>
              <div><strong>Date du signalement:</strong> {formatDateTime(selectedEvent.created_at)}</div>
              {selectedEvent.patient_proof_url && (
                <div>
                  <button onClick={() => setSelectedProofUrl(selectedEvent.patient_proof_url)} style={{ backgroundColor: COLORS.teal, color: "white", border: "none", padding: "8px 14px", borderRadius: "8px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                    <ImageIcon size={16} /> Consulter la Preuve Médicale Attachée
                  </button>
                </div>
              )}
            </div>

            <div style={{ padding: "14px 24px", borderTop: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bgLight, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setSelectedEvent(null)} style={{ backgroundColor: COLORS.navy, color: "white", padding: "8px 18px", borderRadius: "10px", fontWeight: "700", border: "none", cursor: "pointer" }}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* PROOF VIEWER MODAL */}
      <MedicalProofModal
        proofPath={selectedProofUrl}
        onClose={() => setSelectedProofUrl(null)}
      />

    </div>
  );
}
