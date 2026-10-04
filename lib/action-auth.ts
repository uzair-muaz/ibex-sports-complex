import { createTrustedApiActor, isTrustedApiActor, type TrustedApiActor } from "@/lib/trusted-api-actor";
import { auth } from "@/lib/auth";
import { isStaffRole, type AppRole } from "@/lib/authz";

export {
  createTrustedApiActor,
  isTrustedApiActor,
  type TrustedApiActor,
};

/**
 * Customer identity for server actions.
 * Cookie session is authoritative. Client-supplied actorUserId / trusted flags are ignored.
 * API routes must pass `createTrustedApiActor(gate.user)`.
 */
export async function resolveCustomerActor(opts?: unknown) {
  // Prefer branded API actor (Bearer path) — skip cookie session round-trip.
  if (isTrustedApiActor(opts)) {
    if (isStaffRole(opts.actorRole)) {
      return { ok: false as const, error: "Customer account required" };
    }
    return {
      ok: true as const,
      userId: opts.actorUserId,
      role: (opts.actorRole as AppRole) || "user",
    };
  }

  const session = await auth();

  if (session?.user?.id) {
    if (isStaffRole(session.user.role)) {
      return { ok: false as const, error: "Customer account required" };
    }
    if (
      opts &&
      typeof opts === "object" &&
      "actorUserId" in opts &&
      typeof (opts as { actorUserId?: string }).actorUserId === "string" &&
      (opts as { actorUserId: string }).actorUserId &&
      (opts as { actorUserId: string }).actorUserId !== session.user.id
    ) {
      return { ok: false as const, error: "Forbidden" };
    }
    return {
      ok: true as const,
      userId: session.user.id,
      role: session.user.role as AppRole,
    };
  }

  return { ok: false as const, error: "Please sign in" };
}

/**
 * Staff identity for admin server actions (cookie or branded trusted API actor).
 * Pass flags separately — never spread a TrustedApiActor (WeakSet identity).
 */
export async function requireStaffActor(
  opts?: StaffActorOpts,
  flags?: { superAdmin?: boolean },
) {
  const superAdmin = !!flags?.superAdmin;

  if (isTrustedApiActor(opts) && isStaffRole(opts.actorRole)) {
    if (superAdmin && opts.actorRole !== "super_admin") {
      return { ok: false as const, error: "Unauthorized" };
    }
    return {
      ok: true as const,
      userId: opts.actorUserId,
      role: opts.actorRole as AppRole,
    };
  }

  const session = await auth();

  if (session?.user?.id && isStaffRole(session.user.role)) {
    if (superAdmin && session.user.role !== "super_admin") {
      return { ok: false as const, error: "Unauthorized" };
    }
    return {
      ok: true as const,
      userId: session.user.id,
      role: session.user.role as AppRole,
    };
  }

  return { ok: false as const, error: "Unauthorized" };
}

/** Optional branded actor for staff actions (cookie session when omitted). */
export type StaffActorOpts =
  | TrustedApiActor
  | {
      actorUserId?: string;
      actorRole?: string;
      /** Ignored unless the object was registered via `createTrustedApiActor`. */
      trustedApiActor?: boolean;
    };
