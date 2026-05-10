import { supabase } from "@/integrations/supabase/client";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export async function uploadFile(bucket: string, file: Blob, filename: string, onProgress?: (pct: number) => void): Promise<string> {
  // If Cloudinary is configured, use it for new uploads
  if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    
    onProgress?.(30);
    
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
      {
        method: "POST",
        body: formData,
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to upload to Cloudinary");
    }
    
    const data = await response.json();
    onProgress?.(100);
    // Return the full secure URL to be stored in the database
    return data.secure_url;
  }

  // Fallback to Supabase if Cloudinary is not configured
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${filename}`;
  onProgress?.(50);
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: (file as File).type || undefined, upsert: false });
  if (error) throw error;
  onProgress?.(100);
  return path;
}

export function publicUrl(bucket: string, path: string | null | undefined): string {
  if (!path) return "";
  
  // If the path is already a full URL (from Cloudinary), return it directly
  if (path.startsWith("http")) {
    // Add Cloudinary auto-optimization (format and quality)
    if (path.includes("cloudinary.com") && !path.includes("f_auto")) {
      return path.replace("/upload/", "/upload/f_auto,q_auto/");
    }
    return path;
  }
  
  // Otherwise, get the public URL from Supabase (for existing files)
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFiles(bucket: string, paths: string[]) {
  if (!paths.length) return;
  
  // Filter out full URLs (Cloudinary), as they cannot be deleted from the client easily
  const supabasePaths = paths.filter(p => !p.startsWith("http"));
  if (supabasePaths.length > 0) {
    await supabase.storage.from(bucket).remove(supabasePaths);
  }
}
