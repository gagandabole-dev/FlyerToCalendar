import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://egbbychdyuxhaymhjcvo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-key-for-build-validation";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
