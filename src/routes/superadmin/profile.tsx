import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  User, 
  Lock, 
  Calendar, 
  Phone, 
  Save, 
  Edit2, 
  X, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle,
  Mail,
  ShieldCheck
} from "lucide-react";

export const Route = createFileRoute("/superadmin/profile")({
  component: ProfilePage,
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

function getPasswordStrength(pwd: string) {
  if (!pwd) return { score: 0, label: "", color: "#e2e8f0", width: "0%" };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) return { score: 1, label: "Faible", color: "#EF4444", width: "33%" };
  if (score <= 3) return { score: 2, label: "Moyen", color: "#F59E0B", width: "66%" };
  return { score: 3, label: "Fort", color: "#10B981", width: "100%" };
}

function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'personal' | 'security'>('personal');
  const [loading, setLoading] = useState(true);

  // Tab 1: Personal details state
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [personalForm, setPersonalForm] = useState({
    first_name: "",
    last_name: "",
    phone: ""
  });
  const [savedPersonal, setSavedPersonal] = useState({
    first_name: "",
    last_name: "",
    phone: ""
  });
  const [createdAt, setCreatedAt] = useState<string>("");
  const [personalMessage, setPersonalMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Tab 2: Security details state
  const [email, setEmail] = useState("");
  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [securityMessage, setSecurityMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('superadmins')
          .select('*, users(email, created_at)')
          .limit(1)
          .maybeSingle();

        if (data) {
          const initialPersonal = {
            first_name: data.first_name || "Super",
            last_name: data.last_name || "Admin",
            phone: data.phone || "0550000000"
          };
          setPersonalForm(initialPersonal);
          setSavedPersonal(initialPersonal);
          setEmail(data.users?.email || "admin@rased.dz");
          setCreatedAt(data.users?.created_at || new Date().toISOString());
        } else {
          const defaultPersonal = { first_name: "Super", last_name: "Admin", phone: "0550000000" };
          setPersonalForm(defaultPersonal);
          setSavedPersonal(defaultPersonal);
          setEmail("admin@rased.dz");
          setCreatedAt(new Date().toISOString());
        }
      } catch (err) {
        console.error("Error fetching profile", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  // Handlers for Tab 1
  const handleEditPersonal = () => {
    setIsEditingPersonal(true);
    setPersonalMessage(null);
  };

  const handleCancelPersonal = () => {
    setPersonalForm(savedPersonal);
    setIsEditingPersonal(false);
    setPersonalMessage(null);
  };

  const handleSavePersonal = () => {
    setSavedPersonal(personalForm);
    setIsEditingPersonal(false);
    setPersonalMessage({ type: 'success', text: 'Informations personnelles mises à jour avec succès.' });
  };

  // Password validation logic for Tab 2
  const strength = getPasswordStrength(securityForm.newPassword);
  const passwordsMatch = securityForm.newPassword.length > 0 && securityForm.newPassword === securityForm.confirmPassword;
  const passwordsMismatch = securityForm.confirmPassword.length > 0 && !passwordsMatch;

  const isSecurityValid = 
    securityForm.currentPassword.trim().length > 0 &&
    securityForm.newPassword.length >= 6 &&
    passwordsMatch;

  const handleSaveSecurity = () => {
    if (!isSecurityValid) return;
    setSecurityForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setSecurityMessage({ type: 'success', text: 'Paramètres de sécurité mis à jour avec succès.' });
  };

  return (
    <div style={{ gap: '24px', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: COLORS.navy, marginBottom: '8px' }}>
          Mon Profil
        </h2>
        <p style={{ color: COLORS.muted, fontSize: '0.95rem', margin: 0 }}>
          Gérez vos informations personnelles et vos paramètres de sécurité.
        </p>
      </div>

      {/* Horizontal Chrome-style Navigation Tabs */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: `2px solid ${COLORS.border}`, paddingLeft: '8px' }}>
        <button 
          type="button"
          onClick={() => setActiveTab('personal')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            padding: '12px 24px', 
            borderRadius: '12px 12px 0 0', 
            border: `1px solid ${activeTab === 'personal' ? COLORS.border : 'transparent'}`, 
            borderBottom: activeTab === 'personal' ? '2px solid white' : 'none',
            background: activeTab === 'personal' ? 'white' : '#f1f5f9', 
            color: activeTab === 'personal' ? COLORS.navy : COLORS.muted, 
            fontWeight: activeTab === 'personal' ? '700' : '500', 
            marginBottom: '-2px',
            cursor: 'pointer', 
            transition: 'all 0.15s',
            fontSize: '0.95rem',
            boxShadow: activeTab === 'personal' ? '0 -4px 12px rgba(0,0,0,0.03)' : 'none'
          }}
        >
          <User size={18} color={activeTab === 'personal' ? COLORS.teal : COLORS.muted} />
          Détails Superadmin
        </button>

        <button 
          type="button"
          onClick={() => setActiveTab('security')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            padding: '12px 24px', 
            borderRadius: '12px 12px 0 0', 
            border: `1px solid ${activeTab === 'security' ? COLORS.border : 'transparent'}`, 
            borderBottom: activeTab === 'security' ? '2px solid white' : 'none',
            background: activeTab === 'security' ? 'white' : '#f1f5f9', 
            color: activeTab === 'security' ? COLORS.navy : COLORS.muted, 
            fontWeight: activeTab === 'security' ? '700' : '500', 
            marginBottom: '-2px',
            cursor: 'pointer', 
            transition: 'all 0.15s',
            fontSize: '0.95rem',
            boxShadow: activeTab === 'security' ? '0 -4px 12px rgba(0,0,0,0.03)' : 'none'
          }}
        >
          <Lock size={18} color={activeTab === 'security' ? COLORS.teal : COLORS.muted} />
          Sécurité (Email & Mdp)
        </button>
      </div>

      {/* Content Card attached directly under Chrome tabs */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '0 12px 12px 12px', 
        border: `1px solid ${COLORS.border}`, 
        borderTop: 'none',
        padding: '24px', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: COLORS.muted }}>
              Chargement des informations...
            </div>
          ) : activeTab === 'personal' ? (
            /* TAB 1: Détails Superadmin */
            <div style={{ animation: 'fadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Card Title & Header Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '16px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: COLORS.navy, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <User size={22} color={COLORS.teal} />
                  Détails Superadmin
                </h3>

                {/* Right-aligned Header Actions */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {isEditingPersonal ? (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelPersonal}
                        style={{
                          backgroundColor: 'transparent',
                          color: COLORS.muted,
                          border: `1px solid ${COLORS.border}`,
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <X size={16} />
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleSavePersonal}
                        style={{
                          backgroundColor: COLORS.navy,
                          color: 'white',
                          border: 'none',
                          padding: '8px 20px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 12px rgba(6,44,84,0.2)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Save size={16} />
                        Sauvegarder les modifications
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleEditPersonal}
                      style={{
                        backgroundColor: COLORS.lightTeal,
                        color: COLORS.teal,
                        border: 'none',
                        padding: '8px 18px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Edit2 size={16} />
                      Modifier
                    </button>
                  )}
                </div>
              </div>

              {/* Status Banner */}
              {personalMessage && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  padding: '12px 16px', 
                  backgroundColor: personalMessage.type === 'success' ? '#F0FDF4' : '#FEF2F2',
                  border: `1px solid ${personalMessage.type === 'success' ? '#86EFAC' : '#F87171'}`,
                  color: personalMessage.type === 'success' ? '#166534' : '#B91C1C',
                  borderRadius: '8px',
                  fontSize: '0.9rem'
                }}>
                  {personalMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <span>{personalMessage.text}</span>
                </div>
              )}

              {/* Fields Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Prénom */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: COLORS.muted, marginBottom: '8px', fontWeight: '600' }}>
                    <User size={14} color={COLORS.muted} />
                    Prénom
                  </label>
                  {isEditingPersonal ? (
                    <input 
                      type="text" 
                      value={personalForm.first_name} 
                      onChange={(e) => setPersonalForm({ ...personalForm, first_name: e.target.value })} 
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        borderRadius: '8px', 
                        border: `1px solid ${COLORS.border}`, 
                        outline: 'none',
                        fontSize: '0.95rem',
                        color: COLORS.text
                      }} 
                    />
                  ) : (
                    <div style={{ 
                      padding: '10px 14px', 
                      backgroundColor: COLORS.bgLight, 
                      borderRadius: '8px', 
                      border: `1px solid ${COLORS.border}`, 
                      fontSize: '0.95rem', 
                      fontWeight: '500', 
                      color: COLORS.navy 
                    }}>
                      {savedPersonal.first_name || "—"}
                    </div>
                  )}
                </div>

                {/* Nom */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: COLORS.muted, marginBottom: '8px', fontWeight: '600' }}>
                    <User size={14} color={COLORS.muted} />
                    Nom
                  </label>
                  {isEditingPersonal ? (
                    <input 
                      type="text" 
                      value={personalForm.last_name} 
                      onChange={(e) => setPersonalForm({ ...personalForm, last_name: e.target.value })} 
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        borderRadius: '8px', 
                        border: `1px solid ${COLORS.border}`, 
                        outline: 'none',
                        fontSize: '0.95rem',
                        color: COLORS.text
                      }} 
                    />
                  ) : (
                    <div style={{ 
                      padding: '10px 14px', 
                      backgroundColor: COLORS.bgLight, 
                      borderRadius: '8px', 
                      border: `1px solid ${COLORS.border}`, 
                      fontSize: '0.95rem', 
                      fontWeight: '500', 
                      color: COLORS.navy 
                    }}>
                      {savedPersonal.last_name || "—"}
                    </div>
                  )}
                </div>

                {/* Téléphone */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: COLORS.muted, marginBottom: '8px', fontWeight: '600' }}>
                    <Phone size={14} color={COLORS.muted} />
                    Téléphone
                  </label>
                  {isEditingPersonal ? (
                    <input 
                      type="text" 
                      value={personalForm.phone} 
                      onChange={(e) => setPersonalForm({ ...personalForm, phone: e.target.value })} 
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        borderRadius: '8px', 
                        border: `1px solid ${COLORS.border}`, 
                        outline: 'none',
                        fontSize: '0.95rem',
                        color: COLORS.text
                      }} 
                    />
                  ) : (
                    <div style={{ 
                      padding: '10px 14px', 
                      backgroundColor: COLORS.bgLight, 
                      borderRadius: '8px', 
                      border: `1px solid ${COLORS.border}`, 
                      fontSize: '0.95rem', 
                      fontWeight: '500', 
                      color: COLORS.navy 
                    }}>
                      {savedPersonal.phone || "—"}
                    </div>
                  )}
                </div>

                {/* Date de création */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: COLORS.muted, marginBottom: '8px', fontWeight: '600' }}>
                    <Calendar size={14} color={COLORS.muted} />
                    Date de création
                  </label>
                  <div style={{ 
                    padding: '10px 14px', 
                    backgroundColor: COLORS.bgLight, 
                    borderRadius: '8px', 
                    border: `1px solid ${COLORS.border}`, 
                    fontSize: '0.95rem', 
                    color: COLORS.text,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>{createdAt ? new Date(createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Inconnue'}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: Sécurité (Email & Mdp) */
            <div style={{ animation: 'fadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Header Title */}
              <div style={{ borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '16px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: COLORS.navy, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={22} color={COLORS.teal} />
                  Sécurité du Compte
                </h3>
              </div>

              {/* Status Banner */}
              {securityMessage && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  padding: '12px 16px', 
                  backgroundColor: securityMessage.type === 'success' ? '#F0FDF4' : '#FEF2F2',
                  border: `1px solid ${securityMessage.type === 'success' ? '#86EFAC' : '#F87171'}`,
                  color: securityMessage.type === 'success' ? '#166534' : '#B91C1C',
                  borderRadius: '8px',
                  fontSize: '0.9rem'
                }}>
                  {securityMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <span>{securityMessage.text}</span>
                </div>
              )}

              {/* Form Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '480px' }}>
                {/* Email Field */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: COLORS.muted, marginBottom: '8px', fontWeight: '600' }}>
                    <Mail size={14} color={COLORS.muted} />
                    Adresse Email
                  </label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    style={{ 
                      width: '100%', 
                      padding: '10px 14px', 
                      borderRadius: '8px', 
                      border: `1px solid ${COLORS.border}`, 
                      outline: 'none',
                      fontSize: '0.95rem',
                      color: COLORS.text
                    }} 
                  />
                </div>

                <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: '16px', margin: '4px 0 0 0' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: COLORS.navy, marginBottom: '16px' }}>
                    Changement de mot de passe
                  </h4>
                </div>

                {/* 1. Mot de passe actuel */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: COLORS.muted, marginBottom: '8px', fontWeight: '600' }}>
                    Mot de passe actuel
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showPasswords.current ? "text" : "password"} 
                      value={securityForm.currentPassword} 
                      onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })} 
                      placeholder="••••••••"
                      style={{ 
                        width: '100%', 
                        padding: '10px 40px 10px 14px', 
                        borderRadius: '8px', 
                        border: `1px solid ${COLORS.border}`, 
                        outline: 'none',
                        fontSize: '0.95rem',
                        color: COLORS.text
                      }} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: COLORS.muted,
                        cursor: 'pointer'
                      }}
                    >
                      {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* 2. Nouveau mot de passe */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: COLORS.muted, marginBottom: '8px', fontWeight: '600' }}>
                    Nouveau mot de passe
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showPasswords.new ? "text" : "password"} 
                      value={securityForm.newPassword} 
                      onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })} 
                      placeholder="••••••••"
                      style={{ 
                        width: '100%', 
                        padding: '10px 40px 10px 14px', 
                        borderRadius: '8px', 
                        border: `1px solid ${COLORS.border}`, 
                        outline: 'none',
                        fontSize: '0.95rem',
                        color: COLORS.text
                      }} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: COLORS.muted,
                        cursor: 'pointer'
                      }}
                    >
                      {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {securityForm.newPassword.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ height: '4px', width: '100%', backgroundColor: COLORS.border, borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: strength.width, backgroundColor: strength.color, transition: 'all 0.3s' }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: strength.color, fontWeight: '600', textAlign: 'right' }}>
                        Force : {strength.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* 3. Confirmer le nouveau mot de passe */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: COLORS.muted, marginBottom: '8px', fontWeight: '600' }}>
                    Confirmer le nouveau mot de passe
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showPasswords.confirm ? "text" : "password"} 
                      value={securityForm.confirmPassword} 
                      onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })} 
                      placeholder="••••••••"
                      style={{ 
                        width: '100%', 
                        padding: '10px 40px 10px 14px', 
                        borderRadius: '8px', 
                        border: `1px solid ${passwordsMismatch ? '#F87171' : COLORS.border}`, 
                        outline: 'none',
                        fontSize: '0.95rem',
                        color: COLORS.text
                      }} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: COLORS.muted,
                        cursor: 'pointer'
                      }}
                    >
                      {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {passwordsMismatch && (
                    <span style={{ color: '#DC2626', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                      Les mots de passe ne correspondent pas.
                    </span>
                  )}
                  {passwordsMatch && (
                    <span style={{ color: '#166534', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                      Les mots de passe correspondent.
                    </span>
                  )}
                </div>
              </div>

              {/* Card Footer Actions (Right Aligned) */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: `1px solid ${COLORS.border}`, paddingTop: '16px' }}>
                <button
                  type="button"
                  disabled={!isSecurityValid}
                  onClick={handleSaveSecurity}
                  style={{
                    backgroundColor: isSecurityValid ? COLORS.navy : COLORS.muted,
                    color: 'white',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    cursor: isSecurityValid ? 'pointer' : 'not-allowed',
                    opacity: isSecurityValid ? 1 : 0.6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: isSecurityValid ? '0 4px 12px rgba(6,44,84,0.2)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <Save size={18} />
                  Mettre à jour
                </button>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
