/**
 * Photos the super admin uploads (court and sport photos). Pure, so it is easy
 * to test and safe in the browser.
 */

export const MEDIA_KINDS = ["court_photo", "sport_photo"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

/** 3 MB: plenty for a phone photo, small enough to keep in the database. */
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

export type PhotoType = "jpg" | "png" | "webp";

const CONTENT_TYPES: Record<PhotoType, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Looks at the file's first bytes (not its name) to see what it really is. */
export function detectPhotoType(data: Uint8Array): PhotoType | null {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "jpg";
  if (data.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => data[i] === b)) return "png";
  const ascii = (from: number, to: number) => String.fromCharCode(...Array.from(data.subarray(from, to)));
  if (data.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  return null;
}

export function photoContentType(type: PhotoType): string {
  return CONTENT_TYPES[type];
}

/** Link the website and app use for an uploaded photo (relative; the app adds the host). */
export function mediaUrl(id: string): string {
  return `/api/v1/media/${id}`;
}

/** "/api/v1/media/abc…" or "https://host/api/v1/media/abc…" → the photo's id; null for other links. */
export function mediaIdFromUrl(url: string | null | undefined): string | null {
  const m = /\/api\/v1\/media\/([0-9a-f]{24})$/.exec(String(url ?? "").trim());
  return m ? m[1] : null;
}

export function checkPhoto(size: number): string | null {
  if (size <= 0) return "The file is empty.";
  if (size > MAX_PHOTO_BYTES) return "The photo is too big. The limit is 3 MB.";
  return null;
}
