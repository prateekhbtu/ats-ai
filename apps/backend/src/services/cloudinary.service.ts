/**
 * Cloudinary Service – Image upload via Cloudinary Upload API.
 * Works in Cloudflare Workers (fetch-based, no Node SDK).
 */

import { ValidationError } from '../middleware/error-handler.middleware.js';

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  version: number;
  format: string;
  width: number;
  height: number;
  bytes: number;
  created_at: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const UPLOAD_FOLDER = 'ats-ai/profile-pictures';

/**
 * Upload a profile picture to Cloudinary.
 * Uses unsigned upload with authenticated API credentials.
 */
export async function uploadProfilePicture(
  config: CloudinaryConfig,
  fileData: ArrayBuffer,
  contentType: string,
  userId: string
): Promise<string> {
  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new ValidationError(`Invalid image type: ${contentType}. Allowed: ${ALLOWED_TYPES.join(', ')}`);
  }

  if (fileData.byteLength > MAX_FILE_SIZE) {
    throw new ValidationError(`File too large: ${(fileData.byteLength / 1024 / 1024).toFixed(1)}MB. Max: 5MB`);
  }

  if (fileData.byteLength === 0) {
    throw new ValidationError('Empty file');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const eager = 'c_fill,w_256,h_256,g_face';

  // Build signature string
  const signatureParams: Record<string, string> = {
    eager,
    folder: UPLOAD_FOLDER,
    overwrite: 'true',
    public_id: userId,
    timestamp: String(timestamp),
  };

  const signatureString = Object.keys(signatureParams)
    .sort()
    .map((key) => `${key}=${signatureParams[key]}`)
    .join('&') + config.apiSecret;

  const signature = await sha1(signatureString);

  // Build multipart form
  const ext = contentType.split('/')[1] === 'jpeg' ? 'jpg' : contentType.split('/')[1];
  const fileName = `${userId}.${ext}`;

  const formData = new FormData();
  formData.append('file', new Blob([fileData], { type: contentType }), fileName);
  formData.append('api_key', config.apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('folder', UPLOAD_FOLDER);
  formData.append('public_id', userId);
  formData.append('overwrite', 'true');
  formData.append('eager', eager);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Cloudinary upload failed (${response.status}): ${errorBody}`);
  }

  const result = await response.json() as CloudinaryUploadResponse;
  return result.secure_url;
}

/**
 * Delete a profile picture from Cloudinary.
 */
export async function deleteProfilePicture(
  config: CloudinaryConfig,
  userId: string
): Promise<void> {
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `${UPLOAD_FOLDER}/${userId}`;

  const signatureParams: Record<string, string> = {
    public_id: publicId,
    timestamp: String(timestamp),
  };

  const signatureString = Object.keys(signatureParams)
    .sort()
    .map((key) => `${key}=${signatureParams[key]}`)
    .join('&') + config.apiSecret;

  const signature = await sha1(signatureString);

  const formData = new FormData();
  formData.append('api_key', config.apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('public_id', publicId);

  const deleteUrl = `https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`;

  const response = await fetch(deleteUrl, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Cloudinary delete failed (${response.status}): ${errorBody}`);
  }
}

/**
 * SHA-1 hash using Web Crypto API (available in Workers).
 */
async function sha1(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
