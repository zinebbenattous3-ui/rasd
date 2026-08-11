// Mock data shaped after supabase_schema.sql — swap for real queries when wiring.

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type EventStatus = "pending" | "under_review" | "confirmed" | "closed";

export interface Facility {
  id: string;
  name: string;
  facility_type: string;
  wilaya: string;
  address: string;
}

export interface HealthEvent {
  id: string;
  doctor_id: string;
  facility_id: string;
  patient_nin: string;
  reportable_disease_id: string;
  reportable_disease?: {
    id: string;
    name: string;
  };
  description: string;
  severity: Severity;
  status: EventStatus;
  patient_proof_url: string | null;
  created_at: string;
}

export const facilities: Facility[] = [
  { id: "f1", name: "CHU Mustapha Pacha", facility_type: "CHU", wilaya: "Alger", address: "Place du 1er Mai" },
  { id: "f2", name: "EPH Oran Est", facility_type: "EPH", wilaya: "Oran", address: "Rue Larbi Ben M'hidi" },
  { id: "f3", name: "Polyclinique Sidi Mabrouk", facility_type: "Polyclinique", wilaya: "Constantine", address: "Sidi Mabrouk" },
  { id: "f4", name: "EPSP Ghardaïa", facility_type: "EPSP", wilaya: "Ghardaïa", address: "Cité El Moudjahidine" },
];

export const facilityById = (id: string) => facilities.find((f) => f.id === id);

export const healthEvents: HealthEvent[] = [
  {
    id: "e1",
    doctor_id: "d1",
    facility_id: "f1",
    patient_nin: "1098•••4421",
    reportable_disease_id: "rd-1",
    reportable_disease: { id: "rd-1", name: "Choléra" },
    description: "Trois cas de diarrhée aiguë déshydratante rapportés dans le même quartier.",
    severity: "CRITICAL",
    status: "under_review",
    patient_proof_url: "https://example.org/proofs/e1.pdf",
    created_at: "2026-08-07T20:41:00Z",
  },
  {
    id: "e2",
    doctor_id: "d2",
    facility_id: "f2",
    patient_nin: "2087•••1130",
    reportable_disease_id: "rd-2",
    reportable_disease: { id: "rd-2", name: "Rougeole" },
    description: "Éruption fébrile chez un enfant non vacciné, contact scolaire.",
    severity: "HIGH",
    status: "confirmed",
    patient_proof_url: "https://example.org/proofs/e2.pdf",
    created_at: "2026-08-07T17:12:00Z",
  },
  {
    id: "e3",
    doctor_id: "d3",
    facility_id: "f3",
    patient_nin: "3341•••7752",
    reportable_disease_id: "rd-3",
    reportable_disease: { id: "rd-3", name: "Intoxication alimentaire collective" },
    description: "Sept personnes admises après un repas collectif.",
    severity: "MEDIUM",
    status: "pending",
    patient_proof_url: null,
    created_at: "2026-08-07T11:05:00Z",
  },
  {
    id: "e4",
    doctor_id: "d4",
    facility_id: "f4",
    patient_nin: "4410•••2298",
    reportable_disease_id: "rd-4",
    reportable_disease: { id: "rd-4", name: "Leishmaniose cutanée/viscérale" },
    description: "Cas isolé, zone endémique, suivi dermatologique en cours.",
    severity: "LOW",
    status: "closed",
    patient_proof_url: null,
    created_at: "2026-08-06T08:30:00Z",
  },
  {
    id: "e5",
    doctor_id: "d2",
    facility_id: "f2",
    patient_nin: "5520•••6614",
    reportable_disease_id: "rd-5",
    reportable_disease: { id: "rd-5", name: "Méningite Cérébro-spinale" },
    description: "Syndrome méningé fébrile, ponction lombaire positive.",
    severity: "CRITICAL",
    status: "confirmed",
    patient_proof_url: "https://example.org/proofs/e5.pdf",
    created_at: "2026-08-05T22:47:00Z",
  },
];

export const kpis = {
  activeCases: 128,
  epidemics: 3,
  wilayasCovered: 14,
  alerts: 9,
};

export const wilayaCoverage: { wilaya: string; events: number }[] = [
  { wilaya: "Alger", events: 42 },
  { wilaya: "Oran", events: 31 },
  { wilaya: "Constantine", events: 22 },
  { wilaya: "Ghardaïa", events: 13 },
  { wilaya: "Blida", events: 11 },
  { wilaya: "Sétif", events: 9 },
];
