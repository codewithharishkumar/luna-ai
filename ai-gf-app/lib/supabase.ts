import { createClient } from "@supabase/supabase-js";

/**
 * lib/supabase.ts
 *
 * Legacy client-side Supabase instance.
 * This is a backwards-compatible re-export of supabase-client so that
 * existing client component imports ("@/lib/supabase") continue to work
 * without modification.
 *
 * The WebSocket transport override (ws package) was removed —
 * it is Node.js-only and must NOT be bundled into the browser.
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);