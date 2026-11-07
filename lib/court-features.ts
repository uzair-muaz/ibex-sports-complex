/** Feature icons the mobile app knows. Safe to import in the browser (no database code). */
export const COURT_FEATURE_KEYS = [
  "lighting", "lounge", "video", "glass", "turf", "bench", "certified",
  "net", "audio", "scoreboard", "kit", "racket", "ball", "shower",
] as const;
export type CourtFeatureKey = (typeof COURT_FEATURE_KEYS)[number];
export type CourtFeature = { key: CourtFeatureKey; label: string };

/** Default label for each feature icon. */
export const COURT_FEATURE_LABELS: Record<CourtFeatureKey, string> = {
  lighting: "LED lighting",
  lounge: "Lounge",
  video: "Match replay",
  glass: "Panoramic glass",
  turf: "Pro turf",
  bench: "Benches",
  certified: "Certified court",
  net: "Pro net",
  audio: "Sound system",
  scoreboard: "Scoreboard",
  kit: "Kit available",
  racket: "Racket rental",
  ball: "Balls provided",
  shower: "Showers",
};
