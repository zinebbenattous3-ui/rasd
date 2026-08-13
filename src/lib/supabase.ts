import { createClient } from "@supabase/supabase-js";
import { extractRelativeStoragePath, PROOF_BUCKET } from "@/lib/proof-storage";

const url = ((import.meta as any).env?.VITE_SUPABASE_URL || process.env["VITE_SUPABASE_URL"]) as string | undefined;
const anonKey = ((import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"]) as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!url || !anonKey) {
  throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");
}

export const supabase = createClient(url, anonKey);

/**
 * Fetch signed short-lived URL for storage objects in exact 'patient-proofs' bucket
 */
export async function getSecureProofUrl(proofPath: string): Promise<string> {
  if (!proofPath) return "";
  if (proofPath.startsWith("blob:") || proofPath.startsWith("data:")) {
    return proofPath;
  }
  try {
    const cleanPath = extractRelativeStoragePath(proofPath);
    if (!cleanPath) return proofPath;

    // Generate signed URL using exact bucket 'patient-proofs'
    const { data, error } = await supabase.storage
      .from(PROOF_BUCKET)
      .createSignedUrl(cleanPath, 3600);

    if (data?.signedUrl) {
      return data.signedUrl;
    }

    if (error) {
      console.warn("Signed URL generation warning for patient-proofs:", error.message);
    }

    // Fallback: get public URL from patient-proofs bucket
    const { data: pubData } = supabase.storage
      .from(PROOF_BUCKET)
      .getPublicUrl(cleanPath);

    return pubData?.publicUrl || proofPath;
  } catch (err) {
    console.error("Error fetching secure proof URL from patient-proofs:", err);
    return proofPath;
  }
}
