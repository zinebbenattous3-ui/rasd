import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { ALGERIA_WILAYAS_69, getWilayaByCode, getWilayaByName } from "@/lib/wilayas";

export interface PublicDiseaseCount {
  name: string;
  count: number;
}

export interface PublicWilayaStats {
  wilayaCode: string;
  wilayaName: string;
  wilayaNameAr: string;
  totalEvents: number;
  diseases: PublicDiseaseCount[];
}

export interface PublicHealthMapResponse {
  totalEvents: number;
  totalFacilities: number;
  unmappedCount: number;
  unmappedWilayas: string[];
  stats: Record<string, PublicWilayaStats>;
}

/**
 * Normalizes raw wilaya string stored in facilities.wilaya to 2-digit code ("01".."69")
 */
export function normalizeWilayaCode(rawWilaya?: string): string | undefined {
  if (!rawWilaya) return undefined;
  const trimmed = rawWilaya.trim();

  // 1. Check if string starts with 1 or 2 digits (e.g. "16 - Alger" or "16")
  const codeMatch = trimmed.match(/^(\d{1,2})/);
  if (codeMatch && codeMatch[1]) {
    const code = codeMatch[1].padStart(2, "0");
    if (getWilayaByCode(code)) return code;
  }

  // 2. Lookup by name (Latin or Arabic)
  const wilaya = getWilayaByName(trimmed);
  return wilaya?.code;
}

/**
 * Fetches and securely aggregates public health events by 69 wilayas
 */
export async function getPublicHealthMapData(): Promise<PublicHealthMapResponse> {
  // Initialize base stats for all 69 wilayas with 0 counts
  const stats: Record<string, PublicWilayaStats> = {};
  for (const w of ALGERIA_WILAYAS_69) {
    stats[w.code] = {
      wilayaCode: w.code,
      wilayaName: w.name,
      wilayaNameAr: w.nameAr,
      totalEvents: 0,
      diseases: [],
    };
  }

  if (!isSupabaseConfigured) {
    return {
      totalEvents: 0,
      totalFacilities: 0,
      unmappedCount: 0,
      unmappedWilayas: [],
      stats,
    };
  }

  try {
    // 1. Fetch total active facilities count
    const { count: facCount } = await supabase
      .from("facilities")
      .select("*", { count: "exact", head: true });

    // 2. Fetch health events joined with facility wilaya and disease name
    const { data: events, error } = await supabase
      .from("health_events")
      .select("id, facility_id, reportable_disease_id, facilities(id, name, wilaya), reportable_diseases(id, name)");

    if (error || !events) {
      console.error("Error fetching public health events:", error);
      return {
        totalEvents: 0,
        totalFacilities: facCount || 0,
        unmappedCount: 0,
        unmappedWilayas: [],
        stats,
      };
    }

    let totalEvents = 0;
    const unmappedSet = new Set<string>();
    const diseaseMapByWilaya: Record<string, Record<string, number>> = {};

    for (const ev of events) {
      totalEvents++;
      // Type assertion for Supabase joined relations
      const facObj = Array.isArray(ev.facilities) ? ev.facilities[0] : ev.facilities;
      const disObj = Array.isArray(ev.reportable_diseases) ? ev.reportable_diseases[0] : ev.reportable_diseases;

      const rawWilaya = facObj?.wilaya;
      const diseaseName = disObj?.name || "Événement de santé publique";

      const code = normalizeWilayaCode(rawWilaya);

      if (!code || !stats[code]) {
        if (rawWilaya) unmappedSet.add(rawWilaya);
        continue;
      }

      // Increment wilaya total count
      stats[code].totalEvents += 1;

      // Group disease count
      if (!diseaseMapByWilaya[code]) {
        diseaseMapByWilaya[code] = {};
      }
      diseaseMapByWilaya[code][diseaseName] = (diseaseMapByWilaya[code][diseaseName] || 0) + 1;
    }

    // Convert disease counts map to ordered arrays for each wilaya
    for (const code of Object.keys(diseaseMapByWilaya)) {
      const disObj = diseaseMapByWilaya[code];
      if (stats[code] && disObj) {
        stats[code].diseases = Object.entries(disObj)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
      }
    }

    const unmappedWilayas = Array.from(unmappedSet);

    return {
      totalEvents,
      totalFacilities: facCount || 0,
      unmappedCount: unmappedWilayas.length,
      unmappedWilayas,
      stats,
    };
  } catch (err) {
    console.error("Failed to load public health map data:", err);
    return {
      totalEvents: 0,
      totalFacilities: 0,
      unmappedCount: 0,
      unmappedWilayas: [],
      stats,
    };
  }
}
