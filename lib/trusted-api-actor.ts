/**
 * Brand trusted API actors so client-serialized server-action args cannot forge them.
 * Only objects created here are registered in the WeakSet.
 */

import type { AppRole } from "@/lib/authz";

const trustedActorRegistry = new WeakSet<object>();

export type TrustedApiActor = {
  actorUserId: string;
  actorRole?: AppRole | string;
};

export function createTrustedApiActor(user: {
  id: string;
  role?: string;
}): TrustedApiActor {
  const actor: TrustedApiActor = {
    actorUserId: user.id,
    actorRole: user.role,
  };
  trustedActorRegistry.add(actor);
  return actor;
}

export function isTrustedApiActor(opts?: unknown): opts is TrustedApiActor {
  return (
    !!opts &&
    typeof opts === "object" &&
    trustedActorRegistry.has(opts) &&
    typeof (opts as TrustedApiActor).actorUserId === "string" &&
    !!(opts as TrustedApiActor).actorUserId
  );
}
