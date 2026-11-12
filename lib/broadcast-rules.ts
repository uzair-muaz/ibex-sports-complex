/** Messages to customers (Admin → Messages). Pure rules, safe for the browser and tests. */

/** venue_news always reaches phones (closures, changes); offer only if the customer allows offers. */
export const BROADCAST_KINDS = ["venue_news", "offer"] as const;
export type BroadcastKind = (typeof BROADCAST_KINDS)[number];

/**
 * all = every customer with an account.
 * closure = customers with a booking inside one closure.
 * one = one customer by email (to try a message first).
 */
export const BROADCAST_AUDIENCES = ["all", "closure", "one"] as const;
export type BroadcastAudience = (typeof BROADCAST_AUDIENCES)[number];

export const KIND_LABELS: Record<BroadcastKind, string> = {
  venue_news: "Venue news (always sent)",
  offer: "Offer (only to customers who allow offers)",
};

export const AUDIENCE_LABELS: Record<BroadcastAudience, string> = {
  all: "All customers",
  closure: "Customers booked during a closure",
  one: "One customer (to try it first)",
};

export type BroadcastInput = {
  title: string;
  body: string;
  kind: BroadcastKind;
  audience: BroadcastAudience;
  closureId: string | null;
  email: string | null;
};

export function validateBroadcastInput(body: unknown): { ok: true; value: BroadcastInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Nothing to send." };
  const b = body as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const text = typeof b.body === "string" ? b.body.trim() : "";
  if (title.length < 3 || title.length > 80) return { ok: false, error: "Title must be 3 to 80 letters." };
  if (text.length < 3 || text.length > 500) return { ok: false, error: "Message must be 3 to 500 letters." };
  if (!BROADCAST_KINDS.includes(b.kind as BroadcastKind)) return { ok: false, error: "Pick venue news or offer." };
  if (!BROADCAST_AUDIENCES.includes(b.audience as BroadcastAudience)) return { ok: false, error: "Pick who gets it." };
  const audience = b.audience as BroadcastAudience;
  let closureId: string | null = null;
  let email: string | null = null;
  if (audience === "closure") {
    if (typeof b.closureId !== "string" || !/^[a-f0-9]{24}$/i.test(b.closureId)) return { ok: false, error: "Pick the closure." };
    closureId = b.closureId;
  }
  if (audience === "one") {
    email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Write the customer's email." };
  }
  return { ok: true, value: { title, body: text, kind: b.kind as BroadcastKind, audience, closureId, email } };
}
