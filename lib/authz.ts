/** Shared role helpers for middleware, layouts, and API guards. */

export type AppRole = "super_admin" | "admin" | "user";

export function isStaffRole(role?: string | null): boolean {
  return role === "admin" || role === "super_admin";
}

export function isCustomerRole(role?: string | null): boolean {
  return !!role && !isStaffRole(role);
}

export function isSuperAdminRole(role?: string | null): boolean {
  return role === "super_admin";
}
