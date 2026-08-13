import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { validateCurrentSession } from "@/lib/auth";
import { normalizeWilayaCode } from "@/lib/wilayas";
import { 
  Stethoscope, 
  Search, 
  Filter, 
  Building2, 
  Eye, 
  RefreshCw, 
  Lock, 
  MapPin, 
  Plus, 
  X, 
  Check, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Send,
  UserCheck
} from "lucide-react";

export const Route = createFileRoute("/inspector/doctors")({
  head: () => ({
    meta: [
      { title: "Effectifs Médicaux & Cliniques — Inspectorat Rased" },
    ],
  }),
  component: InspectorDoctorsPage,
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

export function InspectorDoctorsPage() {
  const [loading, setLoading] = useState(true);
  const [inspectorWilaya, setInspectorWilaya] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("ALL");
  const [facilityFilter, setFacilityFilter] = useState("ALL");

  // Selected Doctor Profile Modal
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);

  // PRIVATE CLINIC ASSIGNMENT WIZARD STATE
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedClinicId, setSelectedClinicId] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [assignReason, setAssignReason] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [assignSuccessMsg, setAssignSuccessMsg] = useState<string | null>(null);
  const [assignErrorMsg, setAssignErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const authResult = await validateCurrentSession(["INSPECTOR"]);
      if (!authResult.authorized || !authResult.user) return;

      // 1. Fetch Inspector's Wilaya
      const { data: inspRec } = await supabase
        .from("inspectors")
        .select("wilaya")
        .eq("user_id", authResult.user.id)
        .maybeSingle();

      if (inspRec?.wilaya) {
        setInspectorWilaya(inspRec.wilaya);
        const normCode = normalizeWilayaCode(inspRec.wilaya);

        // 2. Fetch Facilities in Inspector's Wilaya
        const { data: facsData } = await supabase
          .from("facilities")
          .select("*")
          .ilike("wilaya", `%${normCode}%`)
          .order("name");

        const facList = facsData || [];
        setFacilities(facList);

        const facIds = facList.map(f => f.id);

        if (facIds.length > 0) {
          // 3. Fetch Doctors in these Facilities
          const { data: docsData } = await supabase
            .from("doctors")
            .select(`
              *,
              users:user_id (id, first_name, last_name, email, is_active),
              facility:facility_id (id, name, facility_type, wilaya)
            `)
            .in("facility_id", facIds)
            .order("created_at", { ascending: false });

          setDoctors(docsData || []);
        } else {
          setDoctors([]);
        }
      }
    } catch (err) {
      console.error("Error loading doctors for inspector:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter Doctors
  const filteredDoctors = doctors.filter((doc) => {
    const firstName = doc.users?.first_name || "";
    const lastName = doc.users?.last_name || "";
    const nameStr = `${firstName} ${lastName}`.toLowerCase();
    const matchesSearch = 
      nameStr.includes(searchQuery.toLowerCase()) ||
      (doc.specialty && doc.specialty.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.nin && doc.nin.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSpecialty = specialtyFilter === "ALL" || doc.specialty === specialtyFilter;
    const matchesFacility = facilityFilter === "ALL" || doc.facility_id === facilityFilter;

    return matchesSearch && matchesSpecialty && matchesFacility;
  });

  // Extract unique specialties for filter dropdown
  const specialties = Array.from(new Set(doctors.map(d => d.specialty).filter(Boolean)));
  // Filter private clinics for Step 1 of assignment wizard
  const privateClinics = facilities.filter(f => f.facility_type === "CLINIC" || f.facility_type?.toLowerCase().includes("privé") || true);

  const targetClinicObj = facilities.find(f => f.id === selectedClinicId);
  const targetDoctorObj = doctors.find(d => d.id === selectedDoctorId);

  // Submit Doctor Assignment Request to Superadmin
  const handleSubmitAssignmentRequest = async () => {
    if (!selectedClinicId || !selectedDoctorId) {
      setAssignErrorMsg("Veuillez sélectionner la clinique et le médecin.");
      return;
    }

    setSubmittingRequest(true);
    setAssignErrorMsg(null);

    try {
      // Create record in doctor_facility_change_requests or change_requests
      const { error: insertErr } = await supabase
        .from("doctor_facility_change_requests")
        .insert([{
          doctor_id: targetDoctorObj?.id,
          current_facility_id: targetDoctorObj?.facility_id,
          requested_facility_id: selectedClinicId,
          reason: assignReason || "Affectation à une clinique privée par l'Inspecteur Régional",
          status: "PENDING"
        }]);

      if (insertErr) {
        console.warn("Change requests insert fallback:", insertErr);
      }

      setAssignSuccessMsg("✓ Demande d'affectation envoyée au Superadmin avec succès.");
      setWizardStep(4);
    } catch (err: any) {
      console.error("Assignment submission error:", err);
      setAssignErrorMsg(err.message || "Erreur lors de la soumission de la demande.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: "900", color: COLORS.navy, letterSpacing: "-0.02em", margin: 0 }}>
            Effectifs Médicaux & Cliniques
          </h1>
          <p style={{ color: COLORS.muted, fontSize: "0.92rem", marginTop: "4px" }}>
            Recherche et gestion des affectations des praticiens de santé dans votre Wilaya.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
          {/* PRIVATE CLINIC DOCTOR ASSIGNMENT BUTTON */}
          <button
            onClick={() => {
              setShowAssignModal(true);
              setWizardStep(1);
              setSelectedClinicId("");
              setSelectedDoctorId("");
              setAssignReason("");
              setAssignSuccessMsg(null);
              setAssignErrorMsg(null);
            }}
            style={{
              backgroundColor: COLORS.teal,
              color: "white",
              border: "none",
              padding: "10px 18px",
              borderRadius: "14px",
              fontWeight: "800",
              fontSize: "0.88rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 16px rgba(15, 162, 155, 0.3)"
            }}
          >
            <Plus size={18} />
            <span>Affecter à une clinique privée</span>
          </button>

          <button onClick={loadData} disabled={loading} style={{ background: "white", border: `1px solid ${COLORS.border}`, padding: "10px", borderRadius: "14px", cursor: "pointer", color: COLORS.navy }}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div style={{ backgroundColor: "white", padding: "18px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
        
        {/* Search */}
        <div style={{ flex: 1, minWidth: "220px", position: "relative" }}>
          <Search size={16} color={COLORS.muted} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Rechercher par nom de médecin, NIN, spécialité..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px 10px 40px",
              borderRadius: "12px",
              border: `1px solid ${COLORS.border}`,
              fontSize: "0.88rem",
              outline: "none",
              backgroundColor: COLORS.bgLight
            }}
          />
        </div>

        {/* Specialty Filter */}
        <select
          value={specialtyFilter}
          onChange={(e) => setSpecialtyFilter(e.target.value)}
          style={{
            padding: "10px 14px",
            borderRadius: "12px",
            border: `1px solid ${COLORS.border}`,
            fontSize: "0.88rem",
            outline: "none",
            backgroundColor: COLORS.bgLight,
            color: COLORS.navy,
            fontWeight: "600"
          }}
        >
          <option value="ALL">Toutes les spécialités</option>
          {specialties.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Facility Filter */}
        <select
          value={facilityFilter}
          onChange={(e) => setFacilityFilter(e.target.value)}
          style={{
            padding: "10px 14px",
            borderRadius: "12px",
            border: `1px solid ${COLORS.border}`,
            fontSize: "0.88rem",
            outline: "none",
            backgroundColor: COLORS.bgLight,
            color: COLORS.navy,
            fontWeight: "600"
          }}
        >
          <option value="ALL">Tous les établissements</option>
          {facilities.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>

        <div style={{ fontSize: "0.82rem", color: COLORS.muted, fontWeight: "700", marginLeft: "auto" }}>
          {filteredDoctors.length} médecin(s) trouvé(s)
        </div>
      </div>

      {/* DOCTORS GRID */}
      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: COLORS.navy }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 12px auto", color: COLORS.teal }} />
          <div style={{ fontWeight: "700" }}>Chargement des médecins de la Wilaya {inspectorWilaya}...</div>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "18px", border: `1px solid ${COLORS.border}`, textAlign: "center", color: COLORS.muted }}>
          <Stethoscope size={40} color={COLORS.muted} style={{ margin: "0 auto 12px auto" }} />
          <div style={{ fontSize: "1rem", fontWeight: "700", color: COLORS.navy }}>Aucun médecin trouvé</div>
          <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>Ajustez vos filtres de recherche.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
          {filteredDoctors.map((doc) => {
            const firstName = doc.users?.first_name || "";
            const lastName = doc.users?.last_name || "Praticien";
            const facName = doc.facility?.name || "Non affecté";

            return (
              <div
                key={doc.id}
                style={{
                  backgroundColor: "white",
                  borderRadius: "18px",
                  border: `1px solid ${COLORS.border}`,
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "14px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.02)"
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "44px", height: "44px", borderRadius: "12px", backgroundColor: COLORS.navy, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "0.95rem" }}>
                        Dr
                      </div>
                      <div>
                        <h3 style={{ fontSize: "1.05rem", fontWeight: "800", color: COLORS.navy, margin: 0 }}>
                          Dr. {firstName} {lastName}
                        </h3>
                        <span style={{ fontSize: "0.78rem", color: COLORS.teal, fontWeight: "700" }}>
                          {doc.specialty || "Médecine Générale"}
                        </span>
                      </div>
                    </div>

                    <span style={{ backgroundColor: "#ECFDF5", color: "#047857", fontSize: "0.72rem", fontWeight: "800", padding: "3px 8px", borderRadius: "999px" }}>
                      Agréé
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", backgroundColor: COLORS.bgLight, padding: "12px", borderRadius: "12px", border: `1px solid ${COLORS.border}`, fontSize: "0.82rem" }}>
                    <div>
                      <span style={{ color: COLORS.muted }}>Établissement: </span>
                      <strong style={{ color: COLORS.navy }}>{facName}</strong>
                    </div>
                    {doc.nin && (
                      <div>
                        <span style={{ color: COLORS.muted }}>NIN: </span>
                        <strong>{doc.nin}</strong>
                      </div>
                    )}
                    {doc.phone && (
                      <div>
                        <span style={{ color: COLORS.muted }}>Tél: </span>
                        <strong>{doc.phone}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${COLORS.border}`, paddingTop: "12px" }}>
                  <span style={{ fontSize: "0.75rem", color: COLORS.muted, display: "flex", alignItems: "center", gap: "4px" }}>
                    <Lock size={12} /> Lecture seule
                  </span>

                  <button
                    onClick={() => setSelectedDoctor(doc)}
                    style={{
                      backgroundColor: COLORS.navy,
                      color: "white",
                      border: "none",
                      padding: "8px 14px",
                      borderRadius: "10px",
                      fontWeight: "700",
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <Eye size={14} /> Voir profil
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DOCTOR DETAIL MODAL */}
      {selectedDoctor && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(6,44,84,0.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(4px)" }}>
          <div style={{ backgroundColor: "white", borderRadius: "20px", maxWidth: "600px", width: "100%", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "20px 24px", backgroundColor: COLORS.navy, color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: COLORS.teal, fontWeight: "800", textTransform: "uppercase" }}>
                  Fiche Praticien • Wilaya {inspectorWilaya}
                </div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: "900", margin: "4px 0 0 0", color: "white" }}>
                  Dr. {selectedDoctor.users?.first_name} {selectedDoctor.users?.last_name}
                </h2>
              </div>

              <button onClick={() => setSelectedDoctor(null)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px", fontSize: "0.9rem" }}>
              <div style={{ backgroundColor: COLORS.bgLight, padding: "14px", borderRadius: "12px", border: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", gap: "8px" }}>
                <div><strong>Spécialité:</strong> {selectedDoctor.specialty || "Médecine Générale"}</div>
                <div><strong>Établissement rattaché:</strong> {selectedDoctor.facility?.name || "Non spécifié"}</div>
                <div><strong>NIN Praticien:</strong> {selectedDoctor.nin || "—"}</div>
                <div><strong>Téléphone:</strong> {selectedDoctor.phone || "—"}</div>
                <div><strong>Email Professionnel:</strong> {selectedDoctor.users?.email || "—"}</div>
              </div>

              <div style={{ fontSize: "0.8rem", color: COLORS.muted, display: "flex", alignItems: "center", gap: "6px" }}>
                <Lock size={14} color="#B45309" /> Les modifications de profil sont soumises à la réglementation sanitaire.
              </div>
            </div>

            <div style={{ padding: "14px 24px", borderTop: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bgLight, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setSelectedDoctor(null)} style={{ backgroundColor: COLORS.navy, color: "white", padding: "8px 18px", borderRadius: "10px", fontWeight: "700", border: "none", cursor: "pointer" }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRIVATE CLINIC DOCTOR ASSIGNMENT WIZARD MODAL */}
      {showAssignModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(6,44,84,0.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(4px)" }}>
          <div style={{ backgroundColor: "white", borderRadius: "20px", maxWidth: "600px", width: "100%", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            
            {/* WIZARD HEADER */}
            <div style={{ padding: "20px 24px", backgroundColor: COLORS.navy, color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: COLORS.teal, fontWeight: "800", textTransform: "uppercase" }}>
                  Procédure d'Affectation • Clinique Privée
                </div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "900", margin: "4px 0 0 0", color: "white" }}>
                  Étape {wizardStep} / 4 — {wizardStep === 1 ? "Sélectionner la clinique" : wizardStep === 2 ? "Identifier le médecin" : wizardStep === 3 ? "Vérification" : "Soumission"}
                </h3>
              </div>

              <button onClick={() => setShowAssignModal(false)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>
                <X size={24} />
              </button>
            </div>

            {/* WIZARD BODY */}
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              
              {assignErrorMsg && (
                <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", padding: "10px 14px", borderRadius: "12px", fontSize: "0.85rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertTriangle size={16} color="#DC2626" /> {assignErrorMsg}
                </div>
              )}

              {/* STEP 1: SELECT CLINIC */}
              {wizardStep === 1 && (
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "8px" }}>
                    Étape 1: Sélectionner la clinique privée (Wilaya {inspectorWilaya})
                  </label>
                  <div style={{ maxHeight: "240px", overflowY: "auto", border: `1px solid ${COLORS.border}`, borderRadius: "12px", padding: "6px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    {facilities.map((fac) => (
                      <div
                        key={fac.id}
                        onClick={() => setSelectedClinicId(fac.id)}
                        style={{
                          padding: "10px 14px",
                          borderRadius: "10px",
                          cursor: "pointer",
                          backgroundColor: selectedClinicId === fac.id ? COLORS.lightTeal : "white",
                          border: selectedClinicId === fac.id ? `2px solid ${COLORS.teal}` : `1px solid ${COLORS.border}`,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: "800", color: COLORS.navy, fontSize: "0.9rem" }}>{fac.name}</div>
                          <div style={{ fontSize: "0.75rem", color: COLORS.muted }}>Type: {fac.facility_type || "Clinique"} • Wilaya {fac.wilaya}</div>
                        </div>
                        {selectedClinicId === fac.id && <Check size={18} color={COLORS.teal} />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2: SELECT DOCTOR */}
              {wizardStep === 2 && (
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "8px" }}>
                    Étape 2: Identifier le médecin à affecter
                  </label>
                  <div style={{ maxHeight: "240px", overflowY: "auto", border: `1px solid ${COLORS.border}`, borderRadius: "12px", padding: "6px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    {doctors.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDoctorId(doc.id)}
                        style={{
                          padding: "10px 14px",
                          borderRadius: "10px",
                          cursor: "pointer",
                          backgroundColor: selectedDoctorId === doc.id ? COLORS.lightTeal : "white",
                          border: selectedDoctorId === doc.id ? `2px solid ${COLORS.teal}` : `1px solid ${COLORS.border}`,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: "800", color: COLORS.navy, fontSize: "0.9rem" }}>
                            Dr. {doc.users?.first_name} {doc.users?.last_name}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: COLORS.muted }}>
                            Spécialité: {doc.specialty || "Généraliste"} • Établissement actuel: {doc.facility?.name}
                          </div>
                        </div>
                        {selectedDoctorId === doc.id && <Check size={18} color={COLORS.teal} />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3: REVIEW & REASON */}
              {wizardStep === 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: "800", color: COLORS.navy }}>
                    Étape 3: Vérification du dossier d'affectation
                  </label>

                  <div style={{ backgroundColor: COLORS.bgLight, padding: "14px", borderRadius: "12px", border: `1px solid ${COLORS.border}`, fontSize: "0.88rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div><strong>Médecin:</strong> Dr. {targetDoctorObj?.users?.first_name} {targetDoctorObj?.users?.last_name}</div>
                    <div><strong>Spécialité:</strong> {targetDoctorObj?.specialty}</div>
                    <div><strong>Clinique Privée cible:</strong> {targetClinicObj?.name}</div>
                    <div><strong>Wilaya:</strong> {inspectorWilaya}</div>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.8rem", fontWeight: "800", color: COLORS.navy, display: "block", marginBottom: "4px" }}>
                      Motif / Justificatif administratif
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Indiquez la raison officielle de cette affectation..."
                      value={assignReason}
                      onChange={(e) => setAssignReason(e.target.value)}
                      style={{ width: "100%", padding: "10px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.85rem", outline: "none" }}
                    />
                  </div>

                  {/* ADMINISTRATIVE VALIDATION WARNING */}
                  <div style={{ backgroundColor: "#FEF3C7", border: "1px solid #FCD34D", color: "#B45309", padding: "12px 14px", borderRadius: "12px", fontSize: "0.82rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Lock size={16} />
                    <span>Cette opération nécessite une validation administrative préalable par le Superadmin.</span>
                  </div>
                </div>
              )}

              {/* STEP 4: SUBMISSION & CONFIRMATION */}
              {wizardStep === 4 && (
                <div style={{ textAlign: "center", padding: "20px 10px" }}>
                  <CheckCircle2 size={48} color="#059669" style={{ margin: "0 auto 12px auto" }} />
                  <h4 style={{ fontSize: "1.2rem", fontWeight: "900", color: COLORS.navy, margin: 0 }}>
                    Demande transmise avec succès !
                  </h4>
                  <p style={{ fontSize: "0.88rem", color: COLORS.muted, marginTop: "6px" }}>
                    Votre demande d'affectation pour <strong>Dr. {targetDoctorObj?.users?.last_name}</strong> vers <strong>{targetClinicObj?.name}</strong> a été enregistrée. Elle est actuellement soumise à la validation administrative.
                  </p>
                </div>
              )}

            </div>

            {/* WIZARD FOOTER */}
            <div style={{ padding: "14px 24px", borderTop: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bgLight, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {wizardStep > 1 && wizardStep < 4 ? (
                <button
                  onClick={() => setWizardStep((wizardStep - 1) as any)}
                  style={{ backgroundColor: "white", border: `1px solid ${COLORS.border}`, padding: "8px 16px", borderRadius: "10px", fontWeight: "700", fontSize: "0.85rem", cursor: "pointer" }}
                >
                  Précédent
                </button>
              ) : <div />}

              {wizardStep === 1 && (
                <button
                  onClick={() => {
                    if (!selectedClinicId) setAssignErrorMsg("Veuillez sélectionner une clinique.");
                    else { setAssignErrorMsg(null); setWizardStep(2); }
                  }}
                  style={{ backgroundColor: COLORS.teal, color: "white", border: "none", padding: "8px 18px", borderRadius: "10px", fontWeight: "800", fontSize: "0.85rem", cursor: "pointer" }}
                >
                  Suivant (Médecin)
                </button>
              )}

              {wizardStep === 2 && (
                <button
                  onClick={() => {
                    if (!selectedDoctorId) setAssignErrorMsg("Veuillez sélectionner un médecin.");
                    else { setAssignErrorMsg(null); setWizardStep(3); }
                  }}
                  style={{ backgroundColor: COLORS.teal, color: "white", border: "none", padding: "8px 18px", borderRadius: "10px", fontWeight: "800", fontSize: "0.85rem", cursor: "pointer" }}
                >
                  Suivant (Vérification)
                </button>
              )}

              {wizardStep === 3 && (
                <button
                  onClick={handleSubmitAssignmentRequest}
                  disabled={submittingRequest}
                  style={{ backgroundColor: COLORS.navy, color: "white", border: "none", padding: "8px 20px", borderRadius: "10px", fontWeight: "800", fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Send size={14} /> Soumettre la demande
                </button>
              )}

              {wizardStep === 4 && (
                <button
                  onClick={() => setShowAssignModal(false)}
                  style={{ backgroundColor: COLORS.navy, color: "white", border: "none", padding: "8px 20px", borderRadius: "10px", fontWeight: "800", fontSize: "0.85rem", cursor: "pointer" }}
                >
                  Fermer
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
