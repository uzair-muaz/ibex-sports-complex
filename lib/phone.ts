/**
 * Pakistani mobile numbers. Stored as "+923XXXXXXXXX"; the app shows "03XXXXXXXXX".
 * Returns null if the number is not a valid Pakistani mobile.
 */
export function normalizePakPhone(raw: string | null | undefined): string | null {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("03")) {
    return `+92${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith("923")) {
    return `+${digits}`;
  }
  return null;
}
