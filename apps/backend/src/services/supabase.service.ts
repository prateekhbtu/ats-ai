/**
 * Supabase Storage Service
 * Uses the Supabase Storage REST API directly — no Node SDK needed.
 * Works in Cloudflare Workers (pure fetch-based).
 */

const BUCKET = 'resumes';

interface SupabaseConfig {
  supabaseUrl: string;
  supabaseSecretKey: string;
}

/**
 * Upload a file buffer to Supabase Storage.
 * Returns the public URL of the uploaded file.
 *
 * File paths follow the pattern: resumes/{userId}/{timestamp}-{sanitizedFilename}
 * This ensures uniqueness and prevents path guessing.
 */
export async function uploadResumeToSupabase(
  config: SupabaseConfig,
  fileBuffer: ArrayBuffer,
  fileName: string,
  userId: string,
): Promise<string> {
  const urlBase = config.supabaseUrl.trim();
  const secretKey = config.supabaseSecretKey.trim();

  const timestamp = Date.now();
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${userId}/${timestamp}-${sanitized}`;

  const ext = fileName.toLowerCase().split('.').pop();
  const contentType = ext === 'pdf'
    ? 'application/pdf'
    : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const uploadUrl = `${urlBase}/storage/v1/object/${BUCKET}/${filePath}`;

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': contentType,
      'x-upsert': 'false',
    },
    body: fileBuffer,
  });

  if (!res.ok) {
    const body = await res.text();
    const keyPrefix = secretKey ? secretKey.substring(0, 10) + '...' : 'FALSY';
    throw new Error(`Supabase Storage upload failed (${res.status}) [Key used: ${keyPrefix}]: ${body}`);
  }

  // Return the public URL
  const publicUrl = `${config.supabaseUrl}/storage/v1/object/public/${BUCKET}/${filePath}`;
  return publicUrl;
}

/**
 * Delete a file from Supabase Storage.
 * filePath should be the path segment after the bucket name, e.g. "userId/timestamp-file.pdf"
 */
export async function deleteResumeFromSupabase(
  config: SupabaseConfig,
  fileUrl: string,
): Promise<void> {
  const urlBase = config.supabaseUrl.trim();
  const secretKey = config.supabaseSecretKey.trim();

  // Extract the path from the full public URL
  const marker = `/object/public/${BUCKET}/`;
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return; // Not a Supabase URL — skip

  const filePath = fileUrl.slice(idx + marker.length);
  const deleteUrl = `${urlBase}/storage/v1/object/${BUCKET}/${filePath}`;

  const res = await fetch(deleteUrl, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Supabase Storage delete failed (${res.status}): ${body}`);
    // Non-fatal — log and continue
  }
}
