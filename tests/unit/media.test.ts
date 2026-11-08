import { describe, expect, it } from "vitest";
import { checkPhoto, detectPhotoType, mediaUrl, MAX_PHOTO_BYTES } from "@/lib/media-rules";
import { sanitizeCourtAppFields } from "@/lib/court-app-fields";
import { absoluteUrl } from "@/lib/api/catalog";

const bytes = (...b: number[]) => new Uint8Array(b);
const ascii = (s: string) => Array.from(s).map((c) => c.charCodeAt(0));

describe("uploaded photos", () => {
  it("knows JPG, PNG and WebP by their first bytes, and nothing else", () => {
    expect(detectPhotoType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpg");
    expect(detectPhotoType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("png");
    expect(detectPhotoType(bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")))).toBe("webp");
    expect(detectPhotoType(bytes(...ascii("%PDF-1.7")))).toBeNull();
    expect(detectPhotoType(bytes(...ascii("<svg onload=")))).toBeNull();
  });

  it("limits size to 3 MB", () => {
    expect(checkPhoto(0)).not.toBeNull();
    expect(checkPhoto(MAX_PHOTO_BYTES)).toBeNull();
    expect(checkPhoto(MAX_PHOTO_BYTES + 1)).not.toBeNull();
  });

  it("the link is accepted as a court photo and made full for the app", () => {
    const url = mediaUrl("6aef4e5a47e461d86cd61c01");
    expect(sanitizeCourtAppFields({ image: url })).toEqual({ ok: true, value: { image: url } });
    expect(absoluteUrl(url, "https://ibex.pk")).toBe("https://ibex.pk/api/v1/media/6aef4e5a47e461d86cd61c01");
  });
});
