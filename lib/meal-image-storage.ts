import { getSupabaseAdmin } from "@/lib/supabase-admin";

const DEFAULT_BUCKET = "meal-images";

function normalizePublicUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function parseStoragePathFromPublicUrl(url: string) {
  const baseUrl = process.env.SUPABASE_URL;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;

  if (!baseUrl) return null;

  const prefix = `${normalizePublicUrl(baseUrl)}/storage/v1/object/public/${bucket}/`;
  if (!url.startsWith(prefix)) return null;
  return decodeURIComponent(url.slice(prefix.length));
}

export async function deleteMealImageObject(imageUrl?: string | null, userId?: string) {
  if (!imageUrl?.trim()) return;

  const objectPath = parseStoragePathFromPublicUrl(imageUrl.trim());
  if (!objectPath) return;
  if (userId && !objectPath.startsWith(`${userId}/`)) return;

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.storage.from(bucket).remove([objectPath]);

  if (error) {
    console.error("Delete meal image error:", error);
  }
}
