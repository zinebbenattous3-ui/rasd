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
  return sessionToken;
}

// Clear authenticated session on logout
export async function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  document.cookie = `${SESSION_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  await supabase.auth.signOut().catch(() => {});
}

// Validate session against database (users.role & users.is_active)
export async function validateCurrentSession(allowedRoles?: UserRole[]): Promise<{
  authorized: boolean;
  user?: AuthenticatedUser;
  redirectTo?: string;
  reason?: string;
}> {
  const session = getStoredSession();
  if (!session || !session.userId) {
    return { authorized: false, redirectTo: "/login", reason: "NOT_AUTHENTICATED" };
  }

  // Fast pre-check based on stored session role
  if (allowedRoles && allowedRoles.length > 0 && session.role) {
    const sessionRole = (session.role || "").toUpperCase() as UserRole;
    if (!allowedRoles.includes(sessionRole)) {
      const roleRedirectMap: Record<UserRole, string> = {
        DOCTOR: "/doctor",
        PATIENT: "/patient",
        INSPECTOR: "/inspector",
        HEALTH_AUTHORITY: "/health-authority",
        SUPERADMIN: "/superadmin"
      };
      return {
        authorized: false,
        redirectTo: roleRedirectMap[sessionRole] || "/login",
        reason: "UNAUTHORIZED_ROLE"
      };
    }
  }

  try {
    // Database check: query users table for id, role, is_active
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, is_active')
      .eq('id', session.userId)
      .maybeSingle();

    if (error || !dbUser) {
      await clearSession();
      return { authorized: false, redirectTo: "/login", reason: "USER_NOT_FOUND" };
    }

    // Check account active status
    if (dbUser.is_active === false) {
      await clearSession();
      return { authorized: false, redirectTo: "/login", reason: "ACCOUNT_DEACTIVATED" };
    }

    const normRole = (dbUser.role || "").toUpperCase() as UserRole;
    
    // Check if role is valid
    const validRoles: UserRole[] = ["PATIENT", "DOCTOR", "INSPECTOR", "HEALTH_AUTHORITY", "SUPERADMIN"];
    if (!validRoles.includes(normRole)) {
      await clearSession();
      return { authorized: false, redirectTo: "/login", reason: "INVALID_ROLE" };
    }

    // Check role authorization for specific route namespace
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(normRole)) {
      const roleRedirectMap: Record<UserRole, string> = {
        DOCTOR: "/doctor",
        PATIENT: "/patient",
        INSPECTOR: "/inspector",
        HEALTH_AUTHORITY: "/health-authority",
        SUPERADMIN: "/superadmin"
      };
      return { 
        authorized: false, 
        user: { ...dbUser, role: normRole, session_token: session.token },
        redirectTo: roleRedirectMap[normRole] || "/login",
        reason: "UNAUTHORIZED_ROLE"
      };
    }

    return {
      authorized: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        first_name: dbUser.first_name,
        last_name: dbUser.last_name,
        role: normRole,
        is_active: dbUser.is_active,
        session_token: session.token
      }
    };
  } catch (err) {
    console.error("Auth validation error:", err);
    return { authorized: false, redirectTo: "/login", reason: "SERVER_ERROR" };
  }
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
