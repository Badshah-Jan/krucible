/**
 * Client-side content sanitization and validation.
 * Server rules remain the source of truth; this blocks obvious abuse early.
 */

const SCRIPT_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const HTML_TAG_PATTERN = /<[^>]*>/g;
const DANGEROUS_URL_PATTERN = /javascript:|data:text\/html|vbscript:/gi;

/** Strip HTML/script tags and normalize whitespace. */
export function sanitizeText(input: string, maxLength = 5000): string {
  if (!input || typeof input !== "string") return "";
  let text = input
    .replace(SCRIPT_PATTERN, "")
    .replace(HTML_TAG_PATTERN, "")
    .replace(DANGEROUS_URL_PATTERN, "")
    .trim();
  if (text.length > maxLength) {
    text = text.slice(0, maxLength);
  }
  return text;
}

/** Basic email format check (Firebase Auth performs authoritative validation). */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Reject obviously malicious URLs in user content. */
export function sanitizeUrl(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (DANGEROUS_URL_PATTERN.test(trimmed)) return null;
  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

const ALLOWED_IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "heic",
  "heif",
]);

/** Validate local image URI before upload. */
export function isAllowedImageUri(uri: string): boolean {
  if (!uri || typeof uri !== "string") return false;
  const ext = uri.split(".").pop()?.toLowerCase().split("?")[0] ?? "";
  if (ALLOWED_IMAGE_EXTENSIONS.has(ext)) return true;
  // Expo ImagePicker may return content:// or ph:// URIs without extensions
  return uri.startsWith("file://") || uri.startsWith("content://") || uri.startsWith("ph://");
}

/** Max upload size: 10 MB */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
