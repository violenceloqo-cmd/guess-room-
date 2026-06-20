import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "../config/env.js";

let client: SupabaseClient | undefined;

/** True when Supabase credentials are configured for the backend. */
export function isSupabaseConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Backend Supabase client using the service-role key. Bypasses RLS, so it must
 * NEVER be exposed to the browser. Throws if credentials are missing.
 */
export function getServiceClient(): SupabaseClient {
  if (!client) {
    const env = getEnv();
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "Supabase not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
      );
    }
    client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
