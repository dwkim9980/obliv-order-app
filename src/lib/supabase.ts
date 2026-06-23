import { createClient } from "@supabase/supabase-js";

export const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET!;

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } }
);
