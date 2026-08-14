import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { hashPassword } from "@/lib/auth-hash";
import { validateCurrentSession } from "@/lib/auth";
import { ALGERIA_WILAYAS_69 } from "@/lib/wilayas";
import { UnifiedSelect } from "@/components/ui/UnifiedSelect";
import { 
  Plus, 
  ShieldCheck, 
  X, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  User, 
  Lock, 
  Mail, 
  RefreshCw, 
  Search, 
  Building2, 
  Edit3, 
  Briefcase,
  MapPin,
  Check,
  UserCheck,
  UserX,
  Filter
} from "lucide-react";

export const Route = createFileRoute("/superadmin/inspectors")({
  head: () => ({
    meta: [
      { title: "Gestion des Inspecteurs — RASED Admin" },
      { name: "description", content: "Gestion des inspecteurs régionaux et affectations par Wilaya." }
    ]
  }),
  component: InspectorsPage,
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

export function InspectorsPage() {
  const navigate = useNavigate();
  const [inspectors, setInspectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWilayaFilter, setSelectedWilayaFilter] = useState("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeInspector, setActiveInspector] = useState<any>(null);

  // Form States for Add Inspector
  const [addForm, setAddForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    jobFunction: "Inspecteur Sanitaire",
    wilaya: "16 - Alger"
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    jobFunction: "",
    wilaya: "",
    isActive: true
  });

  // Notification Toast State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Auth Guard & Initial Data Fetching
  const verifyAuthAndLoad = async () => {
    setLoading(true);
    const authResult = await validateCurrentSession(["SUPERADMIN"]);
    if (!authResult.authorized) {
      navigate({ to: authResult.redirectTo || "/login" as any });
      return;
    }
    await fetchInspectorsData();
  };

  const fetchInspectorsData = async () => {
    setLoading(true);
    try {
      // Query inspectors table joined with users table via user_id foreign key
      const { data, error } = await supabase
        .from("inspectors")
        .select(`
          id,
          user_id,
          job_function,
          wilaya,
          created_at,
          updated_at,
          users:user_id (
            id,
            email,
            first_name,
            last_name,
            is_active,
            role
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching inspectors:", error);
        setToast({ message: "Erreur lors du chargement des inspecteurs.", type: "error" });
      } else if (data) {
        setInspectors(data);
      }
    } catch (err: any) {
      console.error("Unexpected error fetching inspectors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verifyAuthAndLoad();
  }, []);

  // Open Add Modal & Reset Form
  const handleOpenAddModal = () => {
    setAddForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      jobFunction: "Inspecteur Sanitaire",
      wilaya: ALGERIA_WILAYAS_69[0]?.code ? `${ALGERIA_WILAYAS_69[0].code} - ${ALGERIA_WILAYAS_69[0].name}` : "16 - Alger"
    });
    setFormError(null);
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (inspector: any) => {
    setActiveInspector(inspector);
    setEditForm({
      firstName: inspector.users?.first_name || "",
      lastName: inspector.users?.last_name || "",
      jobFunction: inspector.job_function || "",
      wilaya: inspector.wilaya || "",
      isActive: inspector.users?.is_active ?? true
    });
    setFormError(null);
    setShowEditModal(true);
  };

  // Handle Add Inspector Submission (Strict Database Schema Compliance)
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!addForm.firstName.trim() || !addForm.lastName.trim()) {
      setFormError("Veuillez saisir le prénom et le nom de l'inspecteur.");
      return;
    }
    if (!addForm.email.trim() || !addForm.email.includes("@")) {
      setFormError("Veuillez saisir une adresse email valide.");
      return;
    }
    if (!addForm.password || addForm.password.length < 6) {
      setFormError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (!addForm.jobFunction.trim()) {
      setFormError("Veuillez spécifier la fonction de l'inspecteur.");
      return;
    }

    // Check single Inspector per Wilaya rule
    const existingInWilaya = inspectors.find((insp) => insp.wilaya === addForm.wilaya);
    if (existingInWilaya) {
      const assignedName = `${existingInWilaya.users?.first_name || ""} ${existingInWilaya.users?.last_name || ""}`.trim();
      setFormError(`Un inspecteur (${assignedName}) est déjà affecté à la Wilaya "${addForm.wilaya}". Chaque Wilaya ne peut avoir qu'un seul inspecteur.`);
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Create user in `users` table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .insert([{
          email: addForm.email.trim().toLowerCase(),
          password_hash: hashPassword(addForm.password),
          first_name: addForm.firstName.trim(),
          last_name: addForm.lastName.trim(),
          role: "INSPECTOR",
          is_active: true
        }])
        .select("id")
        .single();

      if (userError || !userData) {
        if (userError?.code === "23505") {
          throw new Error("Cette adresse email est déjà utilisée par un autre compte.");
        }
        throw new Error(userError?.message || "Erreur lors de la création du compte utilisateur.");
      }

      // Step 2: Create inspector in `inspectors` table referencing user_id
      const { error: inspError } = await supabase
        .from("inspectors")
        .insert([{
          user_id: userData.id,
          job_function: addForm.jobFunction.trim(),
          wilaya: addForm.wilaya
        }]);

      if (inspError) {
        // Rollback user creation if inspector creation fails
        await supabase.from("users").delete().eq("id", userData.id);
        throw new Error(inspError.message || "Erreur lors de la création de la fiche d'inspecteur.");
      }

      setShowAddModal(false);
      setToast({ message: "Inspecteur créé et affecté avec succès.", type: "success" });
      await fetchInspectorsData();
    } catch (err: any) {
      console.error("Add inspector error:", err);
      setFormError(err.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Inspector Submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInspector) return;
    setFormError(null);

    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      setFormError("Le prénom et le nom sont requis.");
      return;
    }

    // Check Wilaya conflict if Wilaya changed
    if (editForm.wilaya !== activeInspector.wilaya) {
      const existingInWilaya = inspectors.find(
        (insp) => insp.id !== activeInspector.id && insp.wilaya === editForm.wilaya
      );
      if (existingInWilaya) {
        setFormError(`La Wilaya "${editForm.wilaya}" est déjà attribuée à un autre inspecteur.`);
        return;
      }
    }

    setSubmitting(true);

    try {
      // Update users table (first_name, last_name, is_active)
      const { error: userErr } = await supabase
        .from("users")
        .update({
          first_name: editForm.firstName.trim(),
          last_name: editForm.lastName.trim(),
          is_active: editForm.isActive,
          updated_at: new Date().toISOString()
        })
        .eq("id", activeInspector.user_id);

      if (userErr) throw new Error("Erreur de mise à jour de l'utilisateur: " + userErr.message);

      // Update inspectors table (job_function, wilaya)
      const { error: inspErr } = await supabase
        .from("inspectors")
        .update({
          job_function: editForm.jobFunction.trim(),
          wilaya: editForm.wilaya,
          updated_at: new Date().toISOString()
        })
        .eq("id", activeInspector.id);

      if (inspErr) throw new Error("Erreur de mise à jour de l'inspecteur: " + inspErr.message);

      setShowEditModal(false);
      setToast({ message: "Fiche d'inspecteur mise à jour avec succès.", type: "success" });
      await fetchInspectorsData();
    } catch (err: any) {
      console.error("Edit inspector error:", err);
      setFormError(err.message || "Erreur de mise à jour.");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Account Active Status
  const handleToggleStatus = async (inspector: any) => {
    const currentActive = inspector.users?.is_active ?? true;
    const newStatus = !currentActive;
    const inspectName = `${inspector.users?.first_name || ""} ${inspector.users?.last_name || ""}`.trim();

    try {
      const { error } = await supabase
        .from("users")
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq("id", inspector.user_id);

      if (error) throw new Error(error.message);

      setToast({
        message: `Compte de ${inspectName} ${newStatus ? "activé" : "désactivé"}.`,
        type: "success"
      });
      await fetchInspectorsData();
    } catch (err: any) {
      setToast({ message: "Erreur de modification du statut: " + err.message, type: "error" });
    }
  };

  // Delete Inspector Record & Linked User
  const handleDeleteInspector = async (inspector: any) => {
    const inspectName = `${inspector.users?.first_name || ""} ${inspector.users?.last_name || ""}`.trim();
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement l'inspecteur ${inspectName} (Wilaya ${inspector.wilaya}) ?`)) {
      return;
    }

    try {
      // 1. Delete from inspectors table
      const { error: inspErr } = await supabase.from("inspectors").delete().eq("id", inspector.id);
      if (inspErr) throw new Error(inspErr.message);

      // 2. Delete from users table
      if (inspector.user_id) {
        await supabase.from("users").delete().eq("id", inspector.user_id);
      }

      setToast({ message: `Inspecteur ${inspectName} supprimé avec succès.`, type: "success" });
      await fetchInspectorsData();
    } catch (err: any) {
      console.error("Delete inspector error:", err);
      setToast({ message: "Erreur lors de la suppression : " + err.message, type: "error" });
    }
  };

  // Filtering Logic
  const filteredInspectors = inspectors.filter((insp) => {
    const q = searchQuery.toLowerCase();
    const fullName = `${insp.users?.first_name || ""} ${insp.users?.last_name || ""}`.toLowerCase();
    const email = (insp.users?.email || "").toLowerCase();
    const job = (insp.job_function || "").toLowerCase();
    const wilaya = (insp.wilaya || "").toLowerCase();

    const matchesQuery = fullName.includes(q) || email.includes(q) || job.includes(q) || wilaya.includes(q);
    const matchesWilaya = selectedWilayaFilter === "ALL" || insp.wilaya === selectedWilayaFilter;
    const matchesStatus =
      selectedStatusFilter === "ALL" ||
      (selectedStatusFilter === "ACTIVE" && insp.users?.is_active === true) ||
      (selectedStatusFilter === "INACTIVE" && insp.users?.is_active === false);

    return matchesQuery && matchesWilaya && matchesStatus;
  });

  // Calculate Statistics
  const totalInspectorsCount = inspectors.length;
  const activeInspectorsCount = inspectors.filter((i) => i.users?.is_active !== false).length;
  const uniqueWilayasCount = new Set(inspectors.map((i) => i.wilaya)).size;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          zIndex: 9999,
          backgroundColor: toast.type === "success" ? "#064E3B" : "#7F1D1D",
          color: "white",
          padding: "12px 20px",
          borderRadius: "12px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          fontSize: "0.92rem",
          fontWeight: "700",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          animation: "fadeIn 0.2s"
        }}>
          {toast.type === "success" ? <CheckCircle2 size={18} color="#34D399" /> : <AlertCircle size={18} color="#FCA5A5" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header & Action Buttons */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
              <ShieldCheck size={24} />
            </div>
            <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: COLORS.navy, margin: 0, letterSpacing: "-0.02em" }}>
              Inspecteurs Sanitaires
            </h2>
          </div>
          <p style={{ color: COLORS.muted, fontSize: "0.95rem", margin: 0 }}>
            Gestion des inspecteurs régionaux et contrôle de leurs affectations par Wilaya.
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={fetchInspectorsData}
            disabled={loading}
            style={{
              backgroundColor: "white",
              color: COLORS.navy,
              border: `1px solid ${COLORS.border}`,
              padding: "10px 18px",
              borderRadius: "10px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
            }}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Actualiser
          </button>

          <button
            onClick={handleOpenAddModal}
            style={{
              backgroundColor: COLORS.teal,
              color: "white",
              border: "none",
              padding: "10px 22px",
              borderRadius: "10px",
              fontWeight: "700",
              fontSize: "0.92rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 14px rgba(15,162,155,0.3)",
              transition: "all 0.15s ease"
            }}
          >
            <Plus size={18} />
            Ajouter un inspecteur
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 14px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: "700", color: COLORS.navy, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Inspecteurs</span>
            <ShieldCheck size={18} color={COLORS.teal} />
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: "800", color: COLORS.navy, marginTop: "10px" }}>{totalInspectorsCount}</div>
          <div style={{ fontSize: "0.78rem", color: COLORS.muted, marginTop: "4px" }}>Compte(s) d'inspecteurs enregistrés</div>
        </div>

        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 14px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "#0369A1", textTransform: "uppercase", letterSpacing: "0.05em" }}>Wilayas Couvertes</span>
            <MapPin size={18} color="#0369A1" />
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: "800", color: "#0369A1", marginTop: "6px" }}>{uniqueWilayasCount} <span style={{ fontSize: "1rem", color: COLORS.muted, fontWeight: "600" }}>/ 69</span></div>
          <div style={{ fontSize: "0.78rem", color: COLORS.muted, marginTop: "4px" }}>Wilayas sous surveillance active</div>
        </div>

        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "16px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 14px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "#15803D", textTransform: "uppercase", letterSpacing: "0.05em" }}>Comptes Actifs</span>
            <UserCheck size={18} color="#15803D" />
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: "800", color: "#15803D", marginTop: "10px" }}>{activeInspectorsCount}</div>
          <div style={{ fontSize: "0.78rem", color: COLORS.muted, marginTop: "4px" }}>Inspecteurs autorisés à se connecter</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div style={{ backgroundColor: "white", borderRadius: "16px", border: `1px solid ${COLORS.border}`, padding: "20px", boxShadow: "0 4px 16px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", alignItems: "center" }}>
          {/* Integrated Search Input */}
          <div style={{ position: "relative" }}>
            <Search size={18} color={COLORS.muted} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Rechercher par prénom, nom, email, fonction..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "11px 14px 11px 42px",
                borderRadius: "12px",
                border: `1px solid ${COLORS.border}`,
                fontSize: "0.9rem",
                outline: "none",
                backgroundColor: COLORS.bgLight,
                color: COLORS.navy,
                transition: "all 0.2s"
              }}
            />
          </div>

          {/* Wilaya Filter Dropdown */}
          <UnifiedSelect
            icon={MapPin}
            searchable={true}
            placeholder="Toutes les Wilayas"
            value={selectedWilayaFilter}
            onChange={(val) => setSelectedWilayaFilter(val)}
            options={[
              { value: "ALL", label: "Toutes les Wilayas" },
              ...ALGERIA_WILAYAS_69.map((w) => ({ value: `${w.code} - ${w.name}`, label: `${w.code} - ${w.name}` }))
            ]}
          />

          {/* Statut Filter Dropdown */}
          <UnifiedSelect
            icon={Filter}
            placeholder="Tous les statuts"
            value={selectedStatusFilter}
            onChange={(val) => setSelectedStatusFilter(val)}
            options={[
              { value: "ALL", label: "Tous les statuts" },
              { value: "ACTIVE", label: "Actif uniquement" },
              { value: "INACTIVE", label: "Inactif uniquement" }
            ]}
          />
        </div>
      </div>

      {/* Main Table View */}
      {loading ? (
        <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "60px", textAlign: "center", border: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 12px auto", color: COLORS.teal }} />
          <div style={{ fontWeight: "700", fontSize: "1.05rem" }}>Chargement des fiches d'inspecteurs...</div>
        </div>
      ) : (
        <div style={{ backgroundColor: "white", borderRadius: "16px", border: `1px solid ${COLORS.border}`, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.02)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead style={{ backgroundColor: "#F8FAFC", borderBottom: `1px solid ${COLORS.border}` }}>
                <tr>
                  <th style={{ padding: "14px 20px", color: COLORS.navy, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "800" }}>Inspecteur</th>
                  <th style={{ padding: "14px 20px", color: COLORS.navy, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "800" }}>Fonction</th>
                  <th style={{ padding: "14px 20px", color: COLORS.navy, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "800" }}>Wilaya D'Affectation</th>
                  <th style={{ padding: "14px 20px", color: COLORS.navy, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "800" }}>Statut Compte</th>
                  <th style={{ padding: "14px 20px", color: COLORS.navy, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "800", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInspectors.map((inspector, idx) => {
                  const userObj = inspector.users;
                  const firstName = userObj?.first_name || "";
                  const lastName = userObj?.last_name || "";
                  const email = userObj?.email || "";
                  const isActive = userObj?.is_active ?? true;
                  const fullName = `${firstName} ${lastName}`.trim() || "Inspecteur";

                  return (
                    <tr
                      key={inspector.id}
                      style={{
                        borderBottom: idx !== filteredInspectors.length - 1 ? `1px solid ${COLORS.border}` : "none",
                        transition: "background-color 0.1s"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      {/* Inspecteur Name & Email */}
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{ width: "38px", height: "38px", borderRadius: "10px", backgroundColor: COLORS.lightTeal, color: COLORS.teal, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "0.95rem" }}>
                            {firstName ? firstName.charAt(0).toUpperCase() : "I"}
                          </div>
                          <div>
                            <div style={{ fontWeight: "700", color: COLORS.navy, fontSize: "0.95rem" }}>{fullName}</div>
                            <div style={{ fontSize: "0.8rem", color: COLORS.muted, marginTop: "2px" }}>{email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Fonction */}
                      <td style={{ padding: "16px 20px", color: COLORS.text, fontWeight: "600", fontSize: "0.9rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Briefcase size={15} color={COLORS.muted} />
                          <span>{inspector.job_function}</span>
                        </div>
                      </td>

                      {/* Wilaya */}
                      <td style={{ padding: "16px 20px" }}>
                        <span style={{ backgroundColor: COLORS.lightTeal, color: COLORS.navy, padding: "5px 12px", borderRadius: "8px", fontSize: "0.86rem", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "6px", border: `1px solid ${COLORS.teal}` }}>
                          <MapPin size={14} color={COLORS.teal} />
                          {inspector.wilaya}
                        </span>
                      </td>

                      {/* Statut (users.is_active) */}
                      <td style={{ padding: "16px 20px" }}>
                        {isActive ? (
                          <span style={{ backgroundColor: "#DCFCE7", color: "#15803D", padding: "4px 12px", borderRadius: "999px", fontSize: "0.82rem", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <CheckCircle2 size={14} /> Actif
                          </span>
                        ) : (
                          <span style={{ backgroundColor: "#F3F4F6", color: "#4B5563", padding: "4px 12px", borderRadius: "999px", fontSize: "0.82rem", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <UserX size={14} /> Inactif
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "16px 20px", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(inspector)}
                            title={isActive ? "Désactiver le compte" : "Activer le compte"}
                            style={{
                              padding: "8px",
                              borderRadius: "8px",
                              border: `1px solid ${COLORS.border}`,
                              backgroundColor: "white",
                              color: isActive ? "#D97706" : "#15803D",
                              cursor: "pointer",
                              transition: "all 0.1s"
                            }}
                          >
                            {isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(inspector)}
                            title="Modifier l'inspecteur"
                            style={{
                              padding: "8px",
                              borderRadius: "8px",
                              border: `1px solid ${COLORS.border}`,
                              backgroundColor: "white",
                              color: COLORS.navy,
                              cursor: "pointer",
                              transition: "all 0.1s"
                            }}
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteInspector(inspector)}
                            title="Supprimer l'inspecteur"
                            style={{
                              padding: "8px",
                              borderRadius: "8px",
                              border: "1px solid #FCA5A5",
                              backgroundColor: "#FEF2F2",
                              color: "#DC2626",
                              cursor: "pointer",
                              transition: "all 0.1s"
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredInspectors.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "40px 20px", color: COLORS.muted }}>
                      <div style={{ fontSize: "1rem", fontWeight: "700", color: COLORS.navy }}>Aucun inspecteur trouvé</div>
                      <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>Ajustez vos critères de recherche ou ajoutez un nouvel inspecteur.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD INSPECTOR */}
      {showAddModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(6, 44, 84, 0.5)",
          backdropFilter: "blur(4px)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "20px",
            width: "100%",
            maxWidth: "560px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            overflow: "hidden",
            animation: "fadeIn 0.2s ease-out"
          }}>
            {/* Modal Header */}
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
                  <Plus size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: "800", color: COLORS.navy, margin: 0 }}>Ajouter un Inspecteur Sanitaire</h3>
                  <p style={{ fontSize: "0.82rem", color: COLORS.muted, margin: 0 }}>Création du compte et affectation de la Wilaya.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", padding: "4px" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {formError && (
                <div style={{ padding: "12px 16px", borderRadius: "10px", backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertCircle size={18} color="#DC2626" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Name Fields Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "0.82rem", fontWeight: "700", color: COLORS.navy, display: "block", marginBottom: "6px" }}>Prénom *</label>
                  <input
                    type="text"
                    required
                    placeholder="Prénom"
                    value={addForm.firstName}
                    onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.9rem", outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.82rem", fontWeight: "700", color: COLORS.navy, display: "block", marginBottom: "6px" }}>Nom *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nom"
                    value={addForm.lastName}
                    onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.9rem", outline: "none" }}
                  />
                </div>
              </div>

              {/* Email Input */}
              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: "700", color: COLORS.navy, display: "block", marginBottom: "6px" }}>Email Professionnel *</label>
                <div style={{ position: "relative" }}>
                  <Mail size={16} color={COLORS.muted} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                  <input
                    type="email"
                    required
                    placeholder="inspecteur@sante.gov.dz"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px 10px 38px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.9rem", outline: "none" }}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: "700", color: COLORS.navy, display: "block", marginBottom: "6px" }}>Mot de passe *</label>
                <div style={{ position: "relative" }}>
                  <Lock size={16} color={COLORS.muted} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Mot de passe sécurisé"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    style={{ width: "100%", padding: "10px 38px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.9rem", outline: "none" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: COLORS.muted, cursor: "pointer" }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Job Function */}
              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: "700", color: COLORS.navy, display: "block", marginBottom: "6px" }}>Fonction Officielle *</label>
                <input
                  type="text"
                  required
                  placeholder="ex. Inspecteur Général, Inspecteur Régional..."
                  value={addForm.jobFunction}
                  onChange={(e) => setAddForm({ ...addForm, jobFunction: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.9rem", outline: "none" }}
                />
              </div>

              {/* Wilaya Selector (Single Source of Truth 69 Wilayas) */}
              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: "700", color: COLORS.navy, display: "block", marginBottom: "6px" }}>Wilaya d'Affectation *</label>
                <SelectDropdown
                  icon={MapPin}
                  searchable={true}
                  placeholder="Sélectionner la Wilaya..."
                  value={addForm.wilaya}
                  onChange={(val) => setAddForm({ ...addForm, wilaya: val })}
                  options={ALGERIA_WILAYAS_69.map((w) => ({
                    value: `${w.code} - ${w.name}`,
                    label: `${w.code} - ${w.name}`
                  }))}
                />
                <div style={{ fontSize: "0.76rem", color: COLORS.muted, marginTop: "6px" }}>
                  Remarque: Chaque Wilaya ne peut être attribuée qu'à un seul inspecteur.
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: "10px 18px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, backgroundColor: "white", color: COLORS.navy, fontWeight: "600", cursor: "pointer" }}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: "10px 22px", borderRadius: "10px", border: "none", backgroundColor: COLORS.teal, color: "white", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  {submitting && <RefreshCw size={16} className="animate-spin" />}
                  Créer l'inspecteur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT INSPECTOR */}
      {showEditModal && activeInspector && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(6, 44, 84, 0.5)",
          backdropFilter: "blur(4px)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "20px",
            width: "100%",
            maxWidth: "540px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            overflow: "hidden"
          }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: "800", color: COLORS.navy, margin: 0 }}>Modifier l'Inspecteur</h3>
                  <p style={{ fontSize: "0.82rem", color: COLORS.muted, margin: 0 }}>{activeInspector.users?.email}</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowEditModal(false)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {formError && (
                <div style={{ padding: "12px 16px", borderRadius: "10px", backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertCircle size={18} color="#DC2626" />
                  <span>{formError}</span>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "0.82rem", fontWeight: "700", color: COLORS.navy, display: "block", marginBottom: "6px" }}>Prénom *</label>
                  <input
                    type="text"
                    required
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.9rem", outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.82rem", fontWeight: "700", color: COLORS.navy, display: "block", marginBottom: "6px" }}>Nom *</label>
                  <input
                    type="text"
                    required
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.9rem", outline: "none" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: "700", color: COLORS.navy, display: "block", marginBottom: "6px" }}>Fonction *</label>
                <input
                  type="text"
                  required
                  value={editForm.jobFunction}
                  onChange={(e) => setEditForm({ ...editForm, jobFunction: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, fontSize: "0.9rem", outline: "none" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: "700", color: COLORS.navy, display: "block", marginBottom: "6px" }}>Wilaya *</label>
                <SelectDropdown
                  icon={MapPin}
                  searchable={true}
                  value={editForm.wilaya}
                  onChange={(val) => setEditForm({ ...editForm, wilaya: val })}
                  options={ALGERIA_WILAYAS_69.map((w) => ({
                    value: `${w.code} - ${w.name}`,
                    label: `${w.code} - ${w.name}`
                  }))}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: "700", color: COLORS.navy, display: "block", marginBottom: "6px" }}>Statut du Compte</label>
                <div style={{ display: "flex", gap: "16px", marginTop: "6px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.9rem" }}>
                    <input
                      type="radio"
                      name="isActive"
                      checked={editForm.isActive === true}
                      onChange={() => setEditForm({ ...editForm, isActive: true })}
                    />
                    <span style={{ fontWeight: "600", color: "#15803D" }}>Actif</span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.9rem" }}>
                    <input
                      type="radio"
                      name="isActive"
                      checked={editForm.isActive === false}
                      onChange={() => setEditForm({ ...editForm, isActive: false })}
                    />
                    <span style={{ fontWeight: "600", color: "#4B5563" }}>Inactif</span>
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{ padding: "10px 18px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, backgroundColor: "white", color: COLORS.navy, fontWeight: "600", cursor: "pointer" }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: "10px 22px", borderRadius: "10px", border: "none", backgroundColor: COLORS.navy, color: "white", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  {submitting && <RefreshCw size={16} className="animate-spin" />}
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
