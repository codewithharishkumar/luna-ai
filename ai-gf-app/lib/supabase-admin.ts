import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazily initialized to avoid build-time crashes when environment variables
// are not available during Next.js static analysis / page data collection.
let _adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_adminClient) return _adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "[supabase-admin] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "These must be set in your .env.local file."
    );
  }

  _adminClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _adminClient;
}

// Proxy export for backwards-compatible usage (supabaseAdmin.from(...) etc.)
// Uses a Proxy so existing code calling supabaseAdmin directly still works.
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabaseAdmin()[prop as keyof SupabaseClient];
  },
});