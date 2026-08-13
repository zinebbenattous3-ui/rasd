import { createClient } from "@supabase/supabase-js";

const url = ((import.meta as any).env?.VITE_SUPABASE_URL || process.env["VITE_SUPABASE_URL"]) as string | undefined;
const anonKey = ((import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"]) as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!url || !anonKey) {
  throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");
}

export const supabase = createClient(url, anonKey);

export async function getSecureProofUrl(proofPath: string): Promise<string> {
  if (!proofPath) return "";
  if (proofPath.startsWith("http://") || proofPath.startsWith("https://") || proofPath.startsWith("blob:") || proofPath.startsWith("data:")) {
    return proofPath;
  }
  try {
    const cleanPath = proofPath.replace(/^\/+/, "");
    const { data } = await supabase.storage.from("patient_proofs").createSignedUrl(cleanPath, 3600);
    if (data?.signedUrl) return data.signedUrl;

    const { data: pubData } = supabase.storage.from("patient_proofs").getPublicUrl(cleanPath);
    return pubData.publicUrl || proofPath;
  } catch (err) {
    console.error("Error fetching secure proof URL:", err);
    return proofPath;
  }
}
