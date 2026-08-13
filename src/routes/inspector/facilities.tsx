import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/utils";
import { validateCurrentSession } from "@/lib/auth";
import { normalizeWilayaCode } from "@/lib/wilayas";
import { 
  Building2, 
  Search, 
  Filter, 
  Eye, 
  RefreshCw, 
  Lock, 
  MapPin, 
  Stethoscope, 
  Activity, 
  X, 
  ChevronRight, 
  ArrowLeft, 
  Clock, 
  Layers, 
  CheckCircle2,
  AlertTriangle,
  Plus,
  RotateCcw,
  Check,
  Send
} from "lucide-react";

export const Route = createFileRoute("/inspector/facilities")({
  head: () => ({
    meta: [
      { title: "Annuaire des Établissements — Inspectorat Rased" },
    ],
  }),
  component: InspectorFacilitiesPage,
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

import { isPrivateClinic } from "@/lib/facilities";

export function InspectorFacilitiesPage() {
  const [loading, setLoading] = useState(true);
  const [inspectorWilaya, setInspectorWilaya] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [doctorsList, setDoctorsList] = useState<any[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const [appliedTypeFilter, setAppliedTypeFilter] = useState("ALL");

  // Selected Facility Detail View Modal
  const [selectedFacility, setSelectedFacility] = useState<any | null>(null);
  const [facilityDoctors, setFacilityDoctors] = useState<any[]>([]);
  const [facilityEvents, setFacilityEvents] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // ADD FACILITY MODAL STATE
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    facility_type: "Clinique privée",
    address: ""
  });
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [addFormError, setAddFormError] = useState<string | null>(null);

  const handleOpenAddModal = () => {
    setAddForm({
      name: "",
      facility_type: "Clinique privée",
      address: ""
    });
    setAddFormError(null);
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      setAddFormError("Le nom de l'établissement est requis.");
      return;
    }

    setSubmittingAdd(true);
    setAddFormError(null);

    try {
      const authResult = await validateCurrentSession(["INSPECTOR"]);
      if (!authResult.user) throw new Error("Session invalide");

      const payload: any = {
        name: addForm.name.trim(),
        facility_type: addForm.facility_type || "Clinique privée",
        wilaya: inspectorWilaya || "16 - Alger",
        address: addForm.address.trim() || null,
        created_by: authResult.user.id
      };

      const { error } = await supabase.from("facilities").insert([payload]);

      if (error) {
        if (error.code === "23505") {
          throw new Error("Un établissement avec ce nom existe déjà.");
        }
        throw new Error(error.message || "Erreur lors de la création de l'établissement.");
      }

      setShowAddModal(false);
      await loadFacilities();
    } catch (err: any) {
      setAddFormError(err.message || "Une erreur s'est produite lors de l'enregistrement.");
    } finally {
      setSubmittingAdd(false);
    }
  };

  const loadFacilities = async () => {
    setLoading(true);
    try {
      const authResult = await validateCurrentSession(["INSPECTOR"]);
      if (!authResult.authorized || !authResult.user) return;

      // 1. Fetch Inspector Wilaya
      const { data: inspRec } = await supabase
        .from("inspectors")
        .select("wilaya")
        .eq("user_id", authResult.user.id)
        .maybeSingle();

      if (inspRec?.wilaya) {
        setInspectorWilaya(inspRec.wilaya);
        const normCode = normalizeWilayaCode(inspRec.wilaya);

        // 2. Fetch Facilities strictly matching Inspector's Wilaya
        const { data: facsData } = await supabase
          .from("facilities")
          .select("*")
          .ilike("wilaya", `%${normCode}%`)
          .order("name");

        const facList = facsData || [];

        // Fetch Doctors in Inspector's Wilaya for assignment wizard
        const facIds = facList.map(f => f.id);
        if (facIds.length > 0) {
          const { data: docsData } = await supabase
            .from("doctors")
            .select(`
              *,
              users:user_id (first_name, last_name, email),
              facility:facility_id (name)
            `)
            .in("facility_id", facIds);
          setDoctorsList(docsData || []);
        }

        // Enrich facilities with doctor count and health event count
        const enriched = await Promise.all(
          facList.map(async (fac) => {
            const { count: docCount } = await supabase
              .from("doctors")
              .select("id", { count: "exact", head: true })
              .eq("facility_id", fac.id);

            const { count: evCount } = await supabase
              .from("health_events")
              .select("id", { count: "exact", head: true })
              .eq("facility_id", fac.id);

            return {
              ...fac,
              doctorCount: docCount || 0,
              eventCount: evCount || 0,
            };
          })
        );

        setFacilities(enriched);
      }
    } catch (err) {
      console.error("Error loading facilities for inspector:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFacilities();
  }, []);

  // Open Facility Detail View
  const handleOpenDetails = async (fac: any) => {
    setSelectedFacility(fac);
    setLoadingDetails(true);
    try {
      // Load doctors in this facility
      const { data: docs } = await supabase
        .from("doctors")
        .select(`
          *,
          users:user_id (first_name, last_name, email)
        `)
        .eq("facility_id", fac.id);

      setFacilityDoctors(docs || []);

      // Load events in this facility
      const { data: evs } = await supabase
        .from("health_events")
        .select(`
          *,
          reportable_diseases:reportable_disease_id(name)
        `)
        .eq("facility_id", fac.id)
        .order("created_at", { ascending: false });

      setFacilityEvents(evs || []);
    } catch (err) {
      console.error("Error loading facility details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleApplyFiltres = () => {
    setAppliedSearchQuery(searchQuery);
    setAppliedTypeFilter(typeFilter);
  };

  const handleResetFiltres = () => {
    setSearchQuery("");
    setTypeFilter("ALL");
    setAppliedSearchQuery("");
    setAppliedTypeFilter("ALL");
  };

  // Filter facilities
  const filteredFacilities = facilities.filter((fac) => {
    const matchesSearch = 
      fac.name.toLowerCase().includes(appliedSearchQuery.toLowerCase()) ||
      (fac.address && fac.address.toLowerCase().includes(appliedSearchQuery.toLowerCase()));

    const matchesType = appliedTypeFilter === "ALL" || fac.facility_type === appliedTypeFilter;

    return matchesSearch && matchesType;
  });

  const activeChips = [];
  if (appliedSearchQuery) {
    activeChips.push({
      key: "search",
      label: `Recherche: "${appliedSearchQuery}"`,
      clear: () => { setSearchQuery(""); setAppliedSearchQuery(""); }
    });
  }
  if (appliedTypeFilter !== "ALL") {
    activeChips.push({
      key: "type",
      label: `Type: ${appliedTypeFilter}`,
      clear: () => { setTypeFilter("ALL"); setAppliedTypeFilter("ALL"); }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", backgroundColor: "white", padding: "24px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
              <Building2 size={22} />
            </div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "900", color: COLORS.navy, margin: 0, letterSpacing: "-0.02em" }}>
              Annuaire des Établissements
            </h1>
          </div>
          <p style={{ fontSize: "0.88rem", color: COLORS.muted, margin: 0 }}>
            Consultation et surveillance des structures de santé enregistrées dans votre territoire d'inspection.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
          {/* ADD FACILITY BUTTON */}
          <button
            onClick={handleOpenAddModal}
            style={{
              backgroundColor: COLORS.teal,
              color: "white",
              border: "none",
              padding: "10px 18px",
              borderRadius: "12px",
              fontWeight: "800",
              fontSize: "0.88rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 16px rgba(15, 162, 155, 0.25)"
            }}
          >
            <Plus size={18} />
            <span>Déclarer une Structure / Clinique</span>
          </button>

          <button onClick={loadFacilities} disabled={loading} style={{ background: "white", border: `1px solid ${COLORS.border}`, padding: "10px", borderRadius: "12px", cursor: "pointer", color: COLORS.navy }}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* UNIFIED RASED FILTER PANEL */}
      <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: "16px", marginBottom: "20px" }}>
          <Filter size={18} color={COLORS.teal} />
          <h2 style={{ fontSize: "1rem", fontWeight: "800", color: COLORS.navy, margin: 0 }}>
            Filtres & Critères de Recherche
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
          
          {/* SEARCH */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
              Recherche textuelle
            </label>
            <div style={{ position: "relative" }}>
              <Search size={16} color={COLORS.muted} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                placeholder="Nom, adresse..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", padding: "10px 14px 10px 40px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.88rem", outline: "none", backgroundColor: COLORS.bgLight }}
              />
            </div>
          </div>

          {/* FACILITY TYPE */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
              Type d'établissement
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.88rem", outline: "none", backgroundColor: COLORS.bgLight, color: COLORS.navy, fontWeight: "600" }}
            >
              <option value="ALL">Tous les types d'établissements</option>
              <option value="EPSP">EPSP — Santé de Proximité</option>
              <option value="EPH">EPH — Public Hospitalier</option>
              <option value="CHU">CHU — Hospitalo-Universitaire</option>
              <option value="Clinique privée">Clinique privée</option>
            </select>
          </div>

          {/* JURISDICTION WILAYA */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
              Wilaya (Verrouillée)
            </label>
            <div style={{ padding: "10px 14px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, backgroundColor: "#F1F5F9", color: COLORS.navy, fontWeight: "700", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <Lock size={15} color="#B45309" />
              <span>Wilaya {inspectorWilaya || "—"}</span>
            </div>
          </div>

        </div>

        {/* ACTION BAR */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", paddingTop: "16px", borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: "0.82rem", color: COLORS.muted, fontWeight: "700" }}>
            {filteredFacilities.length} établissement(s) répertorié(s)
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleResetFiltres}
              style={{ backgroundColor: "white", border: `1px solid ${COLORS.border}`, padding: "8px 16px", borderRadius: "10px", fontSize: "0.85rem", fontWeight: "700", color: COLORS.navy, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <RotateCcw size={14} /> Réinitialiser
            </button>
            <button
              onClick={handleApplyFiltres}
              style={{ backgroundColor: COLORS.navy, border: "none", padding: "8px 20px", borderRadius: "10px", fontSize: "0.85rem", fontWeight: "800", color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Filter size={14} /> Appliquer les filtres
            </button>
          </div>
        </div>
      </div>

      {/* FACILITIES GRID CARDS */}
      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: COLORS.navy }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 12px auto", color: COLORS.teal }} />
          <div style={{ fontWeight: "700" }}>Chargement des établissements...</div>
        </div>
      ) : filteredFacilities.length === 0 ? (
        <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, textAlign: "center", color: COLORS.muted }}>
          <Building2 size={40} color={COLORS.muted} style={{ margin: "0 auto 12px auto" }} />
          <div style={{ fontSize: "1rem", fontWeight: "700", color: COLORS.navy }}>Aucun établissement trouvé</div>
          <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>Ajustez vos filtres de recherche.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "18px" }}>
          {filteredFacilities.map((fac) => (
            <div
              key={fac.id}
              style={{
                backgroundColor: "white",
                borderRadius: "18px",
                border: `1px solid ${COLORS.border}`,
                padding: "22px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "16px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.02)",
                transition: "all 0.2s ease"
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
                  <span style={{ backgroundColor: COLORS.lightTeal, color: COLORS.teal, padding: "4px 10px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: "800", textTransform: "uppercase" }}>
                    {fac.facility_type || "Établissement"}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: COLORS.muted, fontWeight: "700" }}>
                    Wilaya {fac.wilaya}
                  </span>
                </div>

                <h3 style={{ fontSize: "1.15rem", fontWeight: "900", color: COLORS.navy, margin: "0 0 6px 0", lineHeight: "1.3" }}>
                  {fac.name}
                </h3>
                
                <p style={{ fontSize: "0.82rem", color: COLORS.muted, margin: 0 }}>
                  {fac.address || "Adresse non renseignée"}
                </p>
              </div>

              <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", color: COLORS.navy, fontWeight: "700" }}>
                    <Stethoscope size={14} color={COLORS.teal} /> {fac.doctorCount} praticien(s)
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", color: COLORS.navy, fontWeight: "700" }}>
                    <Activity size={14} color="#EA580C" /> {fac.eventCount} cas
                  </div>
                </div>

                <button
                  onClick={() => handleOpenDetails(fac)}
                  style={{ backgroundColor: COLORS.navy, color: "white", border: "none", padding: "6px 14px", borderRadius: "10px", fontSize: "0.8rem", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <Eye size={14} /> Consulter
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FACILITY DETAIL MODAL */}
      {selectedFacility && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(6,44,84,0.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(4px)" }}>
          <div style={{ backgroundColor: "white", borderRadius: "20px", maxWidth: "680px", width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            
            <div style={{ padding: "20px 24px", backgroundColor: COLORS.navy, color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0 }}>
              <div>
                <span style={{ fontSize: "0.75rem", color: COLORS.teal, fontWeight: "800", textTransform: "uppercase" }}>Fiche Structure Sanitaire</span>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "900", margin: "2px 0 0 0", color: "white" }}>{selectedFacility.name}</h3>
              </div>
              <button onClick={() => setSelectedFacility(null)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ backgroundColor: COLORS.bgLight, padding: "16px", borderRadius: "14px", border: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.88rem" }}>
                <div><strong>Type:</strong> {selectedFacility.facility_type || "Clinique / Établissement"}</div>
                <div><strong>Wilaya:</strong> {selectedFacility.wilaya}</div>
                <div><strong>Adresse:</strong> {selectedFacility.address || "Non spécifiée"}</div>
              </div>

              {/* DOCTORS LIST IN FACILITY */}
              <div>
                <h4 style={{ fontSize: "0.95rem", fontWeight: "800", color: COLORS.navy, margin: "0 0 10px 0" }}>
                  Corps Médical Rattaché ({facilityDoctors.length})
                </h4>
                {loadingDetails ? (
                  <div style={{ fontSize: "0.85rem", color: COLORS.muted }}>Chargement des praticiens...</div>
                ) : facilityDoctors.length === 0 ? (
                  <div style={{ fontSize: "0.85rem", color: COLORS.muted }}>Aucun praticien enregistré dans cet établissement.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {facilityDoctors.map((doc) => (
                      <div key={doc.id} style={{ backgroundColor: "white", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.85rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <strong>Dr. {doc.users?.first_name} {doc.users?.last_name}</strong>
                          <div style={{ fontSize: "0.75rem", color: COLORS.muted }}>Spécialité: {doc.specialty || "Généraliste"}</div>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: COLORS.teal, fontWeight: "700" }}>{doc.users?.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RECENT HEALTH EVENTS IN FACILITY */}
              <div>
                <h4 style={{ fontSize: "0.95rem", fontWeight: "800", color: COLORS.navy, margin: "0 0 10px 0" }}>
                  Derniers Signalements Sanitaires ({facilityEvents.length})
                </h4>
                {loadingDetails ? (
                  <div style={{ fontSize: "0.85rem", color: COLORS.muted }}>Chargement des signalements...</div>
                ) : facilityEvents.length === 0 ? (
                  <div style={{ fontSize: "0.85rem", color: COLORS.muted }}>Aucun événement de santé répertorié.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {facilityEvents.slice(0, 5).map((ev) => (
                      <div key={ev.id} style={{ backgroundColor: "white", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.85rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <strong>{ev.reportable_diseases?.name || "Pathologie"}</strong>
                          <div style={{ fontSize: "0.75rem", color: COLORS.muted }}>Gravité: {ev.severity}</div>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: COLORS.muted }}>{formatDateTime(ev.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: "14px 24px", borderTop: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bgLight, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setSelectedFacility(null)} style={{ backgroundColor: COLORS.navy, color: "white", padding: "8px 18px", borderRadius: "10px", fontWeight: "700", border: "none", cursor: "pointer" }}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD FACILITY MODAL */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(6,44,84,0.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(4px)" }}>
          <div style={{ backgroundColor: "white", borderRadius: "20px", maxWidth: "540px", width: "100%", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            
            <div style={{ padding: "20px 24px", backgroundColor: COLORS.navy, color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: COLORS.teal, fontWeight: "800", textTransform: "uppercase" }}>
                  Création de Structure Sanitaire
                </div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "900", margin: "2px 0 0 0", color: "white" }}>
                  Ajouter une Structure / Clinique
                </h3>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {addFormError && (
                <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", padding: "10px 14px", borderRadius: "12px", fontSize: "0.85rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertTriangle size={16} color="#DC2626" /> {addFormError}
                </div>
              )}

              {/* NAME */}
              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
                  Nom de la Clinique / Établissement *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Clinique El Amel, EPH Bologhine..."
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.88rem", outline: "none", backgroundColor: COLORS.bgLight, color: COLORS.navy, fontWeight: "600" }}
                />
              </div>

              {/* FACILITY TYPE */}
              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
                  Type d'Établissement *
                </label>
                <select
                  value={addForm.facility_type}
                  onChange={(e) => setAddForm({ ...addForm, facility_type: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.88rem", outline: "none", backgroundColor: COLORS.bgLight, color: COLORS.navy, fontWeight: "600" }}
                >
                  <option value="Clinique privée">Clinique privée</option>
                  <option value="EPSP">EPSP (Établissement Public de Santé de Proximité)</option>
                  <option value="EPH">EPH (Établissement Public Hospitalier)</option>
                  <option value="CHU">CHU (Centre Hospitalier Universitaire)</option>
                </select>
              </div>

              {/* WILAYA (LOCKED TO INSPECTOR) */}
              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
                  Wilaya (Verrouillée sur votre juridiction)
                </label>
                <div style={{ padding: "10px 14px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, backgroundColor: "#F1F5F9", color: COLORS.navy, fontWeight: "700", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Lock size={16} color="#B45309" />
                  <span>Wilaya {inspectorWilaya || "16 - Alger"}</span>
                </div>
              </div>

              {/* ADDRESS */}
              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "6px" }}>
                  Adresse complète
                </label>
                <input
                  type="text"
                  placeholder="ex: 12 Rue Didouche Mourad, Bologhine..."
                  value={addForm.address}
                  onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.88rem", outline: "none", backgroundColor: COLORS.bgLight, color: COLORS.navy, fontWeight: "600" }}
                />
              </div>

              {/* ACTIONS */}
              <div style={{ paddingTop: "10px", marginTop: "10px", borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ backgroundColor: "white", border: `1px solid ${COLORS.border}`, padding: "9px 18px", borderRadius: "10px", fontWeight: "700", fontSize: "0.85rem", color: COLORS.navy, cursor: "pointer" }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  style={{ backgroundColor: COLORS.teal, color: "white", border: "none", padding: "9px 20px", borderRadius: "10px", fontWeight: "800", fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  {submittingAdd ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
                  <span>{submittingAdd ? "Création en cours..." : "Créer l'Établissement"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
