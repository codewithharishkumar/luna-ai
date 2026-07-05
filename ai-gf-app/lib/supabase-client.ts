import { createClient } from "@supabase/supabase-js";

// Client-safe Supabase instance using only public anon keys.
// MUST NEVER use the service role key.
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
