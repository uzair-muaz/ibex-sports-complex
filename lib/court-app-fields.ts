import {
  COURT_FEATURE_KEYS,
  COURT_FEATURE_LABELS,
  type CourtFeature,
  type CourtFeatureKey,
} from "@/lib/court-features";

export { COURT_FEATURE_LABELS };

export type CourtAppFields = {
  image?: string;
  surfaceLabel?: string;
  isIndoor?: boolean;
  hasRacketRental?: boolean;
  features?: CourtFeature[];
  highlight?: CourtFeature | null;
};

function toFeature(raw: unknown): CourtFeature | null | "bad" {
  if (raw === null || raw === undefined || raw === "") return null;
  const obj = typeof raw === "string" ? { key: raw } : (raw as { key?: unknown; label?: unknown });
  const key = obj?.key as CourtFeatureKey;
  if (!COURT_FEATURE_KEYS.includes(key)) return "bad";
  const label =
    typeof obj.label === "string" && obj.label.trim() ? obj.label.trim().slice(0, 40) : COURT_FEATURE_LABELS[key];
  return { key, label };
}

/**
 * Check the app-only court fields an admin sends. Only fields present in the
 * input are returned, so a website edit that doesn't send them changes nothing.
 */
export function sanitizeCourtAppFields(
  input: Record<string, unknown>,
): { ok: true; value: CourtAppFields } | { ok: false; error: string } {
  const out: CourtAppFields = {};
  if (input.image !== undefined) {
    const img = typeof input.image === "string" ? input.image.trim() : "";
    if (img && !/^(https:\/\/|\/)/.test(img)) {
      return { ok: false, error: "Photo must be an https:// link or a /images/… path." };
    }
    out.image = img.slice(0, 1000);
  }
  if (input.surfaceLabel !== undefined) {
    if (typeof input.surfaceLabel !== "string" || input.surfaceLabel.trim().length > 40) {
      return { ok: false, error: "Surface must be at most 40 characters." };
    }
    out.surfaceLabel = input.surfaceLabel.trim();
  }
  for (const key of ["isIndoor", "hasRacketRental"] as const) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== "boolean") return { ok: false, error: `${key} must be true or false.` };
    out[key] = input[key] as boolean;
  }
  if (input.features !== undefined) {
    if (!Array.isArray(input.features) || input.features.length > 14) {
      return { ok: false, error: "Features must be a list (at most 14)." };
    }
    const features: CourtFeature[] = [];
    for (const raw of input.features) {
      const f = toFeature(raw);
      if (f === "bad" || f === null) return { ok: false, error: "Unknown feature." };
      if (!features.some((x) => x.key === f.key)) features.push(f);
    }
    out.features = features;
  }
  if (input.highlight !== undefined) {
    const h = toFeature(input.highlight);
    if (h === "bad") return { ok: false, error: "Unknown highlight feature." };
    out.highlight = h;
  }
  return { ok: true, value: out };
}
