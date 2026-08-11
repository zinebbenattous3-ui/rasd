import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  User, 
  Stethoscope, 
  Building2, 
  CheckCircle2, 
  Mail, 
  Phone, 
  FileText, 
  MapPin, 
  Award,
  RefreshCw
} from "lucide-react";

export const Route = createFileRoute("/doctor/profile")({
  component: DoctorProfilePage,
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

function DoctorProfilePage() {
  const [loading, setLoading] = useState(true);
  const [doctorProfile, setDoctorProfile] = useState<any>(null);

  const loadDoctorProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          *,
          users:user_id (
            id,
            email,
            first_name,
            last_name,
            role,
            is_active
          ),
          facility:facility_id (
            id,
            name,
            facility_type,
            wilaya,
            address
          )
        `)
        .limit(1)
        .maybeSingle();

      if (data && data.users) {
        const userObj = Array.isArray(data.users) ? data.users[0] : data.users;
        const facObj = Array.isArray(data.facility) ? data.facility[0] : data.facility;

        setDoctorProfile({
          id: data.id,
          email: userObj?.email,
          firstName: userObj?.first_name,
          lastName: userObj?.last_name,
          nin: data.nin,
          phone: data.phone,
          specialty: data.specialty,
          status: data.status,
          verifiedAt: data.verified_at,
          facilityName: facObj?.name,
          facilityType: facObj?.facility_type,
          facilityWilaya: facObj?.wilaya,
          facilityAddress: facObj?.address
        });
      }
    } catch (err) {
      console.error("Error loading doctor profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctorProfile();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '850px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
              <User size={24} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: COLORS.navy, margin: 0 }}>
              Profil Médecin Déclarant
            </h2>
          </div>
          <p style={{ color: COLORS.muted, fontSize: '0.95rem', margin: 0 }}>
            Informations d'accréditation et de rattachement à la structure sanitaire.
          </p>
        </div>

        <button
          onClick={loadDoctorProfile}
          disabled={loading}
          style={{
            backgroundColor: 'white',
            color: COLORS.navy,
            border: `1px solid ${COLORS.border}`,
            padding: '10px 18px',
            borderRadius: '10px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Actualiser
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: COLORS.muted }}>Chargement du profil...</div>
      ) : doctorProfile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Identity Card */}
          <div style={{ backgroundColor: 'white', borderRadius: '20px', border: `1px solid ${COLORS.border}`, padding: '28px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: COLORS.navy, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: '800' }}>
                Dr
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: COLORS.navy, margin: 0 }}>
                    Dr. {doctorProfile.firstName} {doctorProfile.lastName}
                  </h3>
                  <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <CheckCircle2 size={14} /> Médecin Agréé
                  </span>
                </div>
                <div style={{ color: COLORS.teal, fontWeight: '700', fontSize: '0.95rem', marginTop: '2px' }}>
                  {doctorProfile.specialty}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '14px', border: `1px solid ${COLORS.border}` }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} /> Email Professionnel
                </div>
                <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '0.92rem', marginTop: '4px' }}>{doctorProfile.email}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={14} /> Téléphone
                </div>
                <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '0.92rem', marginTop: '4px' }}>{doctorProfile.phone}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} /> NIN
                </div>
                <div style={{ fontWeight: '800', color: COLORS.navy, fontSize: '0.92rem', marginTop: '4px' }}>{doctorProfile.nin}</div>
              </div>
            </div>
          </div>

          {/* Facility Assignment Card */}
          <div style={{ backgroundColor: 'white', borderRadius: '20px', border: `1px solid ${COLORS.border}`, padding: '28px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: COLORS.navy, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={20} color={COLORS.teal} /> Établissement de Rattachement
            </div>

            <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '20px', backgroundColor: '#F8FAFC' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: COLORS.navy }}>
                {doctorProfile.facilityName || 'Établissement non spécifié'}
              </div>
              <div style={{ fontSize: '0.88rem', color: COLORS.muted, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Type : <strong>{doctorProfile.facilityType}</strong></span>
                <span>•</span>
                <span>Wilaya : <strong>{doctorProfile.facilityWilaya}</strong></span>
              </div>
              {doctorProfile.facilityAddress && (
                <div style={{ fontSize: '0.82rem', color: COLORS.text, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} color={COLORS.teal} /> Adresse : {doctorProfile.facilityAddress}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '3rem', textAlign: 'center', color: COLORS.muted }}>
          Profil non disponible.
        </div>
      )}
    </div>
  );
}
