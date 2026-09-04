import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types.js";

export type Db = SupabaseClient<Database>;

/**
 * Supabase client for the CLI, or null when the env isn't configured — the
 * scanner stays fully usable with just CSV output.
 *
 * Uses the service role key, which bypasses RLS. That key is a full-database
 * credential: keep it in .env (gitignored) and never in a committed file.
 */
export function createDbClient(): Db | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
