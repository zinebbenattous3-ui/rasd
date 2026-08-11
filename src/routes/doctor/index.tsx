import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Users, 
  Activity, 
  Clock, 
  CheckCircle2, 
  Plus, 
  ChevronRight, 
  RefreshCw, 
  Stethoscope,
  Calendar,
  AlertTriangle,
  UserPlus
} from "lucide-react";

export const Route = createFileRoute("/doctor/")({
  component: DoctorDashboardPage,
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

function DoctorDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [currentDoctor, setCurrentDoctor] = useState<any>(null);
  
  // Real Statistics
  const [stats, setStats] = useState({
    patientsCount: 0,
    totalEvents: 0,
    pendingEvents: 0,
    validatedEvents: 0
  });

  // Recent Activity
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch current Doctor identity & scope
      const { data: docData } = await supabase
        .from('doctors')
        .select(`
          *,
          users:user_id (
            id,
            email,
            first_name,
            last_name
          ),
          facility:facility_id (
            id,
            name,
            wilaya,
            facility_type
          )
        `)
        .limit(1)
        .maybeSingle();

      if (!docData?.user_id) {
        setLoading(false);
        return;
      }

      const userObj = Array.isArray(docData.users) ? docData.users[0] : docData.users;
      const facObj = Array.isArray(docData.facility) ? docData.facility[0] : docData.facility;

      setCurrentDoctor({
        id: docData.id,
        userId: userObj?.id,
        firstName: userObj?.first_name || '',
        lastName: userObj?.last_name || '',
        specialty: docData.specialty,
        facilityId: docData.facility_id,
        facilityName: facObj?.name,
        facilityWilaya: facObj?.wilaya
      });

      // 2. Fetch real count of total patients
      const { data: patientsData, count: patientsCount } = await supabase
        .from('patients')
        .select(`
          *,
          users:user_id (
            first_name,
            last_name,
            email
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (patientsData) {
        setRecentPatients(patientsData.slice(0, 4));
      }

      // 3. Fetch real health events declared by this doctor
      const { data: eventsData } = await supabase
        .from('health_events')
        .select(`
          *,
          patient:patient_id (
            id,
            nin,
            users:user_id (
              first_name,
              last_name
            )
          ),
          facility:facility_id (
            name,
            wilaya
          )
        `)
        .eq('doctor_id', docData.id)
        .order('created_at', { ascending: false });

      if (eventsData) {
        const totalEvents = eventsData.length;
        const pendingEvents = eventsData.filter(e => e.status === 'PENDING').length;
        const validatedEvents = eventsData.filter(e => e.status === 'VALIDATED').length;

        setStats({
          patientsCount: patientsCount || patientsData?.length || 0,
          totalEvents,
          pendingEvents,
          validatedEvents
        });

        setRecentEvents(eventsData.slice(0, 5));
      }
    } catch (err) {
      console.error("Error loading Doctor dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Premium Greeting Banner */}
      <div style={{
        backgroundColor: COLORS.navy,
        borderRadius: '20px',
        padding: '32px 36px',
        color: 'white',
        background: `linear-gradient(135deg, ${COLORS.navy} 0%, #0d4680 100%)`,
        boxShadow: '0 12px 30px -5px rgba(6, 44, 84, 0.25)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(15, 162, 155, 0.2)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600', color: '#5eead4', marginBottom: '12px' }}>
            <Stethoscope size={16} /> Espace Praticien Déclarant
          </div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: '800', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
            Bonjour, Dr. {currentDoctor?.firstName || ''} {currentDoctor?.lastName || ''}
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.98rem', color: '#e2e8f0', maxWidth: '600px', lineHeight: '1.5' }}>
            Voici l'aperçu de vos activités médicales et déclarations d'événements de santé pour {currentDoctor?.facilityName || 'votre établissement'}.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={loadDashboardData}
            disabled={loading}
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '11px 18px',
              borderRadius: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.88rem'
            }}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Quick Action Toolbar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <Link
          to="/doctor/patients"
          style={{
            backgroundColor: COLORS.teal,
            color: 'white',
            padding: '18px 20px',
            borderRadius: '16px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 14px rgba(15, 162, 155, 0.3)',
            transition: 'transform 0.15s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <UserPlus size={22} />
            <div>
              <div style={{ fontWeight: '800', fontSize: '0.98rem' }}>+ Ajouter un patient</div>
              <div style={{ fontSize: '0.78rem', opacity: 0.9 }}>Nouvelle fiche médicale</div>
            </div>
          </div>
          <ChevronRight size={18} />
        </Link>

        <Link
          to="/doctor/health-events"
          style={{
            backgroundColor: COLORS.navy,
            color: 'white',
            padding: '18px 20px',
            borderRadius: '16px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 14px rgba(6, 44, 84, 0.25)',
            transition: 'transform 0.15s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Plus size={22} color={COLORS.teal} />
            <div>
              <div style={{ fontWeight: '800', fontSize: '0.98rem' }}>+ Déclarer un événement</div>
              <div style={{ fontSize: '0.78rem', opacity: 0.9 }}>Signalement sanitaire</div>
            </div>
          </div>
          <ChevronRight size={18} />
        </Link>

        <Link
          to="/doctor/patients"
          style={{
            backgroundColor: 'white',
            color: COLORS.navy,
            padding: '18px 20px',
            borderRadius: '16px',
            border: `1px solid ${COLORS.border}`,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users size={20} color={COLORS.teal} />
            <div style={{ fontWeight: '700', fontSize: '0.92rem' }}>Consulter les Patients</div>
          </div>
          <ChevronRight size={18} color={COLORS.muted} />
        </Link>

        <Link
          to="/doctor/health-events"
          style={{
            backgroundColor: 'white',
            color: COLORS.navy,
            padding: '18px 20px',
            borderRadius: '16px',
            border: `1px solid ${COLORS.border}`,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Activity size={20} color={COLORS.teal} />
            <div style={{ fontWeight: '700', fontSize: '0.92rem' }}>Historique Événements</div>
          </div>
          <ChevronRight size={18} color={COLORS.muted} />
        </Link>
      </div>

      {/* Real Statistics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {/* Total Patients */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: `1px solid ${COLORS.border}`, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Patients Enregistrés</span>
            <Users size={18} color={COLORS.teal} />
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: '800', color: COLORS.navy, marginTop: '8px' }}>{stats.patientsCount}</div>
          <div style={{ fontSize: '0.75rem', color: COLORS.muted, marginTop: '4px' }}>Patients au registre</div>
        </div>

        {/* Total Health Events */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: `1px solid ${COLORS.border}`, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mes Déclarations</span>
            <Activity size={18} color="#1D4ED8" />
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: '800', color: '#1D4ED8', marginTop: '8px' }}>{stats.totalEvents}</div>
          <div style={{ fontSize: '0.75rem', color: COLORS.muted, marginTop: '4px' }}>Événements déclarés</div>
        </div>

        {/* Pending Events */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: `1px solid ${COLORS.border}`, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#B45309', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>En Attente de Validation</span>
            <Clock size={18} color="#D97706" />
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: '800', color: '#B45309', marginTop: '8px' }}>{stats.pendingEvents}</div>
          <div style={{ fontSize: '0.75rem', color: COLORS.muted, marginTop: '4px' }}>En revue par l'autorité</div>
        </div>

        {/* Validated Events */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: `1px solid ${COLORS.border}`, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#15803D', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Événements Validés</span>
            <CheckCircle2 size={18} color="#15803D" />
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: '800', color: '#15803D', marginTop: '8px' }}>{stats.validatedEvents}</div>
          <div style={{ fontSize: '0.75rem', color: COLORS.muted, marginTop: '4px' }}>Validés et enregistrés</div>
        </div>
      </div>

      {/* Two Column Layout: Recent Declared Events & Patient Registrations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        {/* Left Column: Recent Health Events */}
        <div style={{ backgroundColor: 'white', borderRadius: '18px', border: `1px solid ${COLORS.border}`, padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.08rem', fontWeight: '800', color: COLORS.navy, margin: 0 }}>Dernières Déclarations</h3>
              <p style={{ fontSize: '0.8rem', color: COLORS.muted, margin: '2px 0 0 0' }}>Événements sanitaires récents</p>
            </div>
            <Link to="/doctor/health-events" style={{ color: COLORS.teal, textDecoration: 'none', fontWeight: '600', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Voir tout <ChevronRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: COLORS.muted }}>Chargement des déclarations...</div>
          ) : recentEvents.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: COLORS.muted }}>
              Aucun événement sanitaire déclaré pour le moment.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentEvents.map((evt) => {
                const patientObj = Array.isArray(evt.patient) ? evt.patient[0] : evt.patient;
                const userObj = Array.isArray(patientObj?.users) ? patientObj.users[0] : patientObj?.users;
                const pName = userObj ? `${userObj.first_name || ''} ${userObj.last_name || ''}`.trim() : "Patient";

                return (
                  <div key={evt.id} style={{ padding: '14px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '0.92rem' }}>{evt.incident_type}</div>
                      <div style={{ fontSize: '0.8rem', color: COLORS.muted, marginTop: '2px' }}>
                        Patient: <strong>{pName}</strong> (NIN: {patientObj?.nin || '—'})
                      </div>
                      <div style={{ fontSize: '0.75rem', marginTop: '4px', display: 'inline-flex', gap: '8px' }}>
                        <span style={{
                          fontWeight: '700',
                          color: evt.severity === 'CRITICAL' ? '#DC2626' : evt.severity === 'HIGH' ? '#EA580C' : evt.severity === 'MEDIUM' ? '#D97706' : '#2563EB'
                        }}>
                          Grave : {evt.severity}
                        </span>
                        <span>•</span>
                        <span style={{
                          fontWeight: '700',
                          color: evt.status === 'VALIDATED' ? '#15803D' : evt.status === 'REJECTED' ? '#DC2626' : '#D97706'
                        }}>
                          Statut : {evt.status === 'VALIDATED' ? 'Validé' : evt.status === 'REJECTED' ? 'Refusé' : 'En attente'}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: COLORS.muted, textAlign: 'right' }}>
                      <Calendar size={13} style={{ marginBottom: '2px' }} />
                      <div>{new Date(evt.created_at).toLocaleDateString('fr-FR')}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Patients Overview */}
        <div style={{ backgroundColor: 'white', borderRadius: '18px', border: `1px solid ${COLORS.border}`, padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.08rem', fontWeight: '800', color: COLORS.navy, margin: 0 }}>Patients Récents</h3>
              <p style={{ fontSize: '0.8rem', color: COLORS.muted, margin: '2px 0 0 0' }}>Dernières fiches patients consultées</p>
            </div>
            <Link to="/doctor/patients" style={{ color: COLORS.teal, textDecoration: 'none', fontWeight: '600', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Voir tout <ChevronRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: COLORS.muted }}>Chargement des patients...</div>
          ) : recentPatients.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: COLORS.muted }}>
              Aucun patient enregistré.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentPatients.map((p) => {
                const userObj = Array.isArray(p.users) ? p.users[0] : p.users;
                const pName = userObj ? `${userObj.first_name || ''} ${userObj.last_name || ''}`.trim() : "Patient";

                return (
                  <div key={p.id} style={{ padding: '14px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, backgroundColor: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '700', color: COLORS.navy, fontSize: '0.92rem' }}>{pName}</div>
                      <div style={{ fontSize: '0.8rem', color: COLORS.muted, marginTop: '2px' }}>
                        NIN: {p.nin} • Sexe: {p.gender === 'M' ? 'Homme' : 'Femme'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: '700', color: COLORS.teal, backgroundColor: COLORS.lightTeal, padding: '3px 8px', borderRadius: '6px' }}>
                        {p.blood_type || '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
