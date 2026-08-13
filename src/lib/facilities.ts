export const FACILITY_TYPES = [
  {
    value: "EPSP",
    label: "EPSP",
    description: "Établissement Public de Santé de Proximité",
  },
  {
    value: "EPH",
    label: "EPH",
    description: "Établissement Public Hospitalier",
  },
  {
    value: "CHU",
    label: "CHU",
    description: "Centre Hospitalo-Universitaire",
  },
  {
    value: "Clinique privée",
    label: "Clinique privée",
    description: "Clinique privée",
  },
] as const;

export type FacilityTypeValue = typeof FACILITY_TYPES[number]["value"];

export const FACILITY_TYPE_VALUES: FacilityTypeValue[] = ["EPSP", "EPH", "CHU", "Clinique privée"];

export const FACILITY_TYPE_LABELS: Record<string, string> = {
  EPSP: "EPSP — Établissement Public de Santé de Proximité",
  EPH: "EPH — Établissement Public Hospitalier",
  CHU: "CHU — Centre Hospitalo-Universitaire",
  "Clinique privée": "Clinique privée",
};

/**
 * Utility to determine if a facility is a private clinic based ONLY on its facility_type.
 * NEVER inspects facility.name!
 */
export function isPrivateClinic(facilityType?: string | null): boolean {
  return facilityType === "Clinique privée";
}
