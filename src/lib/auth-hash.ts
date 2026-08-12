import bcrypt from "bcryptjs";

/**
 * Consistently hashes a plaintext password using bcrypt (cost factor 10)
 * and formats it with $2a$ prefix compatible with PostgreSQL pgcrypto and Supabase RPC functions.
 */
export function hashPassword(plainText: string): string {
  if (!plainText) return "";
  const rawHash = bcrypt.hashSync(plainText, 10);
  // Ensure $2a$ prefix for PostgreSQL pgcrypto compatibility
  return rawHash.replace(/^\$2b\$/, "$2a$");
}

/**
 * Safely verifies a plaintext password against a stored bcrypt hash ($2a$, $2b$, or $2y$).
 * Never matches plaintext strings or no-login placeholders.
 */
export function verifyPassword(plainText: string, storedHash: string): boolean {
  if (!plainText || !storedHash) return false;
  if (storedHash === "PATIENT_NO_LOGIN_HASH") return false;
  
  // If storedHash is not a bcrypt string (e.g. legacy or invalid format), return false
  if (!storedHash.startsWith("$2a$") && !storedHash.startsWith("$2b$") && !storedHash.startsWith("$2y$")) {
    return false;
  }

  // Normalize prefix for bcryptjs comparison
  const normalizedHash = storedHash.startsWith("$2a$") ? storedHash.replace(/^\$2a\$/, "$2b$") : storedHash;
  try {
    return bcrypt.compareSync(plainText, normalizedHash);
  } catch {
    return false;
  }
}
