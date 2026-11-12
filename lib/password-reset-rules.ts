/** How long a password reset link works. Shared by the reset action, the API and the email. */
export const RESET_LINK_MINUTES = 60;

/** The email as the reset code sees it (trimmed, lower case). */
export function normaliseResetEmail(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}
