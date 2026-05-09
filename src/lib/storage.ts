import { supabase } from "@/integrations/supabase/client";

export async function uploadFile(bucket: string, file: Blob, filename: string, onProgress?: (pct: number) => void): Promise<string> {
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${filename}`;
  // Supabase JS has no progress callback in v2 storage; emulate completion.
  onProgress?.(50);
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: (file as File).type || undefined, upsert: false });
  if (error) throw error;
  onProgress?.(100);
  return path;
}

export function publicUrl(bucket: string, path: string | null | undefined): string {
  if (!path) return "";
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFiles(bucket: string, paths: string[]) {
  if (!paths.length) return;
  await supabase.storage.from(bucket).remove(paths);
}
