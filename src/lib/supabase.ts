/**
 * Supabase wiring placeholder.
 *
 * Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to use a real client.
 * Without them, a mock client is returned that resolves the same shapes the UI
 * expects, so the dashboard runs in demo mode.
 *
 * Replace mock data in src/lib/mockData.ts with queries such as:
 *   supabase.from("health_events").select("*").order("created_at", { ascending: false })
 */

export type Session = { user: { id: string; email: string; role: string } } | null;

type QueryResult<T> = Promise<{ data: T[] | null; error: { message: string } | null }>;

export interface MinimalSupabaseClient {
  auth: {
    signInWithPassword(credentials: {
      email: string;
      password: string;
    }): Promise<{ data: { session: Session }; error: { message: string } | null }>;
    signOut(): Promise<{ error: null }>;
  };
  from<T>(table: string): {
    select(columns?: string): QueryResult<T>;
  };
}

const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const anonKey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

function createMockClient(): MinimalSupabaseClient {
  return {
    auth: {
      async signInWithPassword({ email, password }) {
        await new Promise((r) => setTimeout(r, 700));
        if (password.length < 6) {
          return { data: { session: null }, error: { message: "Identifiants invalides." } };
        }
        return {
          data: { session: { user: { id: "mock-user", email, role: "health_authority" } } },
          error: null,
        };
      },
      async signOut() {
        return { error: null };
      },
    },
    from<T>() {
      return {
        async select(): QueryResult<T> {
          return { data: [], error: null };
        },
      };
    },
  };
}

/**
 * When credentials exist, swap this for:
 *   import { createClient } from "@supabase/supabase-js";
 *   export const supabase = createClient(url!, anonKey!);
 */
export const supabase: MinimalSupabaseClient = createMockClient();
