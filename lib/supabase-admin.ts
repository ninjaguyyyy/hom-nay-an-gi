import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isPlaceholderUrl =
    !supabaseUrl ||
    supabaseUrl.includes("your-project-ref.supabase.co") ||
    supabaseUrl.includes("your_supabase");
  const isPlaceholderRoleKey =
    !serviceRoleKey ||
    serviceRoleKey.includes("your_supabase_service_role_key") ||
    serviceRoleKey.includes("your-");

  if (isPlaceholderUrl || isPlaceholderRoleKey) {
    throw new Error("Supabase server config is missing or using placeholder values");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
