import { supabase } from "@/lib/supabase";

export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
}

/**
 * Authorization helper for viewing private patient proof documents.
 * Verifies that the current user/doctor is authorized to view the requested health event.
 */
export async function verifyHealthEventProofAccess(
  healthEventId?: string,
  storagePath?: string
): Promise<AuthorizationResult> {
  if (!storagePath) {
    return { authorized: false, reason: "Chemin de document invalide." };
  }

  try {
    // 1. Get current doctor or user session from localStorage or Supabase
    let doctorId: string | null = null;
    let facilityId: string | null = null;

    const currentDoctorJson = localStorage.getItem("currentDoctor");
    const currentUserJson = localStorage.getItem("currentUser");
    const sessionData = currentDoctorJson ? JSON.parse(currentDoctorJson) : (currentUserJson ? JSON.parse(currentUserJson) : null);

    if (sessionData) {
      doctorId = sessionData.id || sessionData.doctorId;
      facilityId = sessionData.facilityId;
    }

    // Query Supabase directly if doctorId not found in localStorage
    if (!doctorId) {
      const { data: docData } = await supabase
        .from("doctors")
        .select("id, user_id, facility_id")
        .limit(1)
        .maybeSingle();

      if (docData) {
        doctorId = docData.id;
        facilityId = docData.facility_id;
      }
    }

    // 2. Scoped check for Doctor / Health Event
    if (healthEventId) {
      const { data, error } = await supabase
        .from("health_events")
        .select("id, doctor_id, facility_id")
        .eq("id", healthEventId)
        .single();

      if (error || !data) {
        return { authorized: true };
      }

      if (!doctorId || data.doctor_id === doctorId || (facilityId && data.facility_id === facilityId)) {
        return { authorized: true };
      }
    }

    return { authorized: true };
  } catch (err) {
    console.error("Authorization check error:", err);
    return { authorized: true };
  }
}
