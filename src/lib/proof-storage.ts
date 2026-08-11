import { supabase } from "@/lib/supabase";

export const PROOF_BUCKET = "patient-proofs";

export const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates file extension and size (Max 10MB, PDF/JPG/PNG/WEBP only).
 */
export function validateProofFile(file: File): FileValidationResult {
  if (!file) {
    return { valid: false, error: "Aucun fichier sélectionné." };
  }

  // Check File Size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: "Le fichier dépasse la taille maximale autorisée de 10 MB."
    };
  }

  // Check File Extension
  const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: "Format non supporté. Formats acceptés : PDF, JPG, JPEG, PNG, WEBP."
    };
  }

  return { valid: true };
}

/**
 * Helper to format file size in KB / MB for display.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Utility to extract clean relative storage path inside patient-proofs bucket from any path format.
 */
export function extractRelativeStoragePath(pathOrUrl: string): string {
  if (!pathOrUrl) return "";
  let path = pathOrUrl.trim();

  if (path.includes("/patient-proofs/")) {
    path = path.split("/patient-proofs/")[1] || path;
  } else if (path.includes("/object/")) {
    const parts = path.split("/object/");
    path = parts[1] || path;
    if (path.startsWith("public/")) {
      path = path.replace("public/", "");
    }
  }

  if (path.startsWith(`${PROOF_BUCKET}/`)) {
    path = path.replace(`${PROOF_BUCKET}/`, "");
  }

  return path;
}

/**
 * Extracts clean original filename from stored object path or full URL.
 */
export function extractFileName(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return "document";
  const parts = pathOrUrl.split("/");
  let filename = parts[parts.length - 1] ?? "document";
  // Remove query params if any
  filename = filename.split("?")[0] || filename;
  // Remove timestamp prefix if added (e.g. 1786149000_document.pdf -> document.pdf)
  if (filename && /^\d+_/.test(filename)) {
    filename = filename.replace(/^\d+_/, "");
  }
  return filename || "document";
}

/**
 * Checks if the file path is a PDF document based on extension.
 */
export function isPdfFile(pathOrUrl?: string | null): boolean {
  if (!pathOrUrl) return false;
  const cleanPath = pathOrUrl.toLowerCase().split("?")[0];
  return cleanPath ? cleanPath.endsWith(".pdf") : false;
}

/**
 * Generates a 10-minute short-lived signed URL for a private storage object path or full URL.
 */
export async function getProofSignedUrl(pathOrUrl: string, expiresInSeconds: number = 600): Promise<string> {
  if (!pathOrUrl) throw new Error("Chemin de fichier invalide");

  const cleanPath = extractRelativeStoragePath(pathOrUrl);

  const { data, error } = await supabase.storage
    .from(PROOF_BUCKET)
    .createSignedUrl(cleanPath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
      return pathOrUrl;
    }
    console.error("Error creating signed URL for proof:", error);
    throw new Error("Impossible d'ouvrir le document. Le lien sécurisé a peut-être expiré.");
  }

  return data.signedUrl;
}

/**
 * Uploads a proof file to the private patient-proofs bucket.
 * Returns the FULL public storage URL stored in DB.
 */
export async function uploadProofDocument(
  eventId: string,
  file: File
): Promise<string> {
  const validation = validateProofFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Sanitize filename
  const cleanOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueFilename = `${Date.now()}_${cleanOriginalName}`;
  const storagePath = `health-events/${eventId}/${uniqueFilename}`;

  const { error } = await supabase.storage
    .from(PROOF_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: true
    });

  if (error) {
    console.error("Error uploading document to patient-proofs bucket:", error);
    throw new Error("Impossible d'ajouter le document. Veuillez réessayer.");
  }

  // Return full public/object URL for DB persistence
  const { data: urlData } = supabase.storage
    .from(PROOF_BUCKET)
    .getPublicUrl(storagePath);

  return urlData.publicUrl;
}

/**
 * Deletes a proof file from the private patient-proofs bucket.
 */
export async function deleteProofDocument(pathOrUrl?: string | null): Promise<boolean> {
  if (!pathOrUrl) return true;

  const cleanPath = extractRelativeStoragePath(pathOrUrl);
  if (!cleanPath) return true;

  const { error } = await supabase.storage
    .from(PROOF_BUCKET)
    .remove([cleanPath]);

  if (error) {
    console.error("Error deleting document from patient-proofs bucket:", error);
    return false;
  }

  return true;
}
