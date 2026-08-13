import { supabase } from "@/lib/supabase";

export type UserRole = "PATIENT" | "DOCTOR" | "INSPECTOR" | "HEALTH_AUTHORITY" | "SUPERADMIN";

export interface AuthenticatedUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  session_token: string;
}

const SESSION_KEY = "rased_auth_session";
const SESSION_COOKIE = "rased_session_token";

// Single authoritative auth initialization promise
let authInitPromise: Promise<AuthenticatedUser | null> | null = null;

export function resetAuthInitPromise() {
  authInitPromise = null;
}

// Get current local session metadata
export function getStoredSession(): { userId: string; token: string; role: string; loginTime: number } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Store authenticated session with single active session token
export function storeSession(userId: string, role: string, token?: string) {
  const sessionToken = token || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const data = { userId, role: role.toUpperCase(), token: sessionToken, loginTime: Date.now() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  
  // Set cookie for HTTP session persistence
  document.cookie = `${SESSION_COOKIE}=${sessionToken}; path=/; SameSite=Lax; ${window.location.protocol === 'https:' ? 'Secure;' : ''}`;
  resetAuthInitPromise();
  return sessionToken;
}

// Clear authenticated session on logout
export async function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  document.cookie = `${SESSION_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  resetAuthInitPromise();
  await supabase.auth.signOut().catch(() => {});
}

// Single authoritative auth initializer that resolves Supabase session first
export async function ensureAuthInitialized(): Promise<AuthenticatedUser | null> {
  if (!authInitPromise) {
    authInitPromise = (async () => {
      try {
        // 1. Await Supabase auth session initialization
        const { data: sbData } = await supabase.auth.getSession();
        const sbSession = sbData?.session;
        
        let userId = sbSession?.user?.id;
        let sessionToken = sbSession?.access_token;

        // 2. Fallback to local session storage if Supabase session is not populated
        if (!userId) {
          const local = getStoredSession();
          if (local?.userId) {
            userId = local.userId;
            sessionToken = local.token;
          }
        }

        if (!userId) {
          return null;
        }

        // 3. Query centralized database for authoritative user record & status
        const { data: dbUser, error } = await supabase
          .from('users')
          .select('id, email, first_name, last_name, role, is_active')
          .eq('id', userId)
          .maybeSingle();

        if (error || !dbUser || dbUser.is_active === false) {
          localStorage.removeItem(SESSION_KEY);
          document.cookie = `${SESSION_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
          return null;
        }

        const normRole = (dbUser.role || "").toUpperCase() as UserRole;
        const validRoles: UserRole[] = ["PATIENT", "DOCTOR", "INSPECTOR", "HEALTH_AUTHORITY", "SUPERADMIN"];
        
        if (!validRoles.includes(normRole)) {
          localStorage.removeItem(SESSION_KEY);
          return null;
        }

        // Store active session metadata
        storeSession(dbUser.id, normRole, sessionToken);

        return {
          id: dbUser.id,
          email: dbUser.email,
          first_name: dbUser.first_name,
          last_name: dbUser.last_name,
          role: normRole,
          is_active: dbUser.is_active,
          session_token: sessionToken || ""
        };
      } catch (err) {
        console.error("Auth initialization error:", err);
        return null;
      }
    })();
  }
  return authInitPromise;
}

// Validate session against database and check role authorization
export async function validateCurrentSession(
  allowedRoles?: UserRole[],
  currentPath?: string
): Promise<{
  authorized: boolean;
  user?: AuthenticatedUser;
  redirectTo?: string;
  reason?: string;
}> {
  // Await complete Supabase auth restoration FIRST
  const user = await ensureAuthInitialized();

  if (!user) {
    const loginRedirect = currentPath 
      ? `/login?redirect=${encodeURIComponent(currentPath)}` 
      : "/login";
    return { 
      authorized: false, 
      redirectTo: loginRedirect, 
      reason: "NOT_AUTHENTICATED" 
    };
  }

  // Check role authorization for specific route namespace
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const roleDashboard = getRoleDashboardPath(user.role);
    return { 
      authorized: false, 
      user,
      redirectTo: roleDashboard,
      reason: "UNAUTHORIZED_ROLE"
    };
  }

  return {
    authorized: true,
    user
  };
}

// Get home route path based on user role
export function getRoleDashboardPath(role: string): string {
  const normRole = (role || "").toUpperCase() as UserRole;
  switch (normRole) {
    case "DOCTOR":
      return "/doctor";
    case "HEALTH_AUTHORITY":
      return "/health-authority";
    case "SUPERADMIN":
      return "/superadmin";
    case "PATIENT":
      return "/patient";
    case "INSPECTOR":
      return "/inspector";
    default:
      return "/login";
  }
}
