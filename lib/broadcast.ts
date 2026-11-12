/**
 * Admin → Messages: send one message to many customers. Server-only.
 * Goes to the app's bell for everyone in the audience, and as a phone push
 * to those with the app (push only really goes out when NOTIFY_SEND_PUSH=true).
 */
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Device from "@/models/Device";
import Notification from "@/models/Notification";
import Broadcast from "@/models/Broadcast";
import { closureCustomers } from "@/lib/closure-admin";
import { allowedBySwitches, resolvePreferences } from "@/lib/preferences";
import { readServiceAccount, sendPushToUser } from "@/lib/notifications/push";
import { sendSwitches } from "@/lib/notifications";
import { validateBroadcastInput, type BroadcastInput } from "@/lib/broadcast-rules";
import { toPkIso } from "@/lib/api/time";

type Fail = { ok: false; status: number; code: string; error: string };
const bad = (error: string, code = "VALIDATION_ERROR", status = 400): Fail => ({ ok: false, status, code, error });

async function audienceOf(input: BroadcastInput): Promise<{ userIds: string[]; guestBookings: number } | Fail> {
  if (input.audience === "all") {
    const users = await User.find({ role: "user" }).select("_id").lean();
    return { userIds: users.map((u) => u._id.toString()), guestBookings: 0 };
  }
  if (input.audience === "closure") {
    const r = await closureCustomers(input.closureId!);
    return r ?? bad("Closure not found", "NOT_FOUND", 404);
  }
  const user = await User.findOne({ email: input.email }).select("_id").lean();
  if (!user) return bad("No account with that email.", "NOT_FOUND", 404);
  return { userIds: [user._id.toString()], guestBookings: 0 };
}

/** How many would get it, without sending (for the "Send to N customers?" check). */
export async function previewBroadcast(body: unknown) {
  const v = validateBroadcastInput(body);
  if (!v.ok) return bad(v.error);
  await connectDB();
  const a = await audienceOf(v.value);
  if ("ok" in a) return a;
  const withApp = (await Device.distinct("userId", { userId: { $in: a.userIds } })).length;
  return { ok: true as const, customers: a.userIds.length, withApp, guestBookings: a.guestBookings };
}

export async function sendBroadcast(body: unknown, staffId: string) {
  const v = validateBroadcastInput(body);
  if (!v.ok) return bad(v.error);
  const input = v.value;
  await connectDB();
  const a = await audienceOf(input);
  if ("ok" in a) return a;
  if (a.userIds.length === 0) return bad("Nobody to send to.", "NO_RECIPIENTS");

  const broadcast = await Broadcast.create({
    title: input.title,
    body: input.body,
    kind: input.kind,
    audience: input.audience,
    closureId: input.closureId,
    email: input.email,
    guestBookings: a.guestBookings,
    sentBy: staffId,
  });
  const id = broadcast._id.toString();

  // 1. The bell, in chunks. The key stops a customer getting the same message twice.
  let inAppCount = 0;
  for (let i = 0; i < a.userIds.length; i += 500) {
    const docs = a.userIds.slice(i, i + 500).map((userId) => ({
      userId,
      type: input.kind,
      title: input.title,
      body: input.body,
      dedupeKey: `broadcast:${id}:${userId}`,
    }));
    try {
      const r = await Notification.insertMany(docs, { ordered: false });
      inAppCount += r.length;
    } catch (err) {
      const e = err as { insertedDocs?: unknown[]; code?: number; writeErrors?: unknown[] };
      if (!e.writeErrors) throw err;
      inAppCount += e.insertedDocs?.length ?? 0;
    }
  }

  // 2. Push, only to customers with the app who allow this kind of message.
  const appUsers = (await Device.distinct("userId", { userId: { $in: a.userIds } })).map(String);
  const prefs = await User.find({ _id: { $in: appUsers } }).select("preferences").lean();
  const wanting = prefs
    .filter((u) => allowedBySwitches(resolvePreferences((u as { preferences?: never }).preferences), input.kind))
    .map((u) => u._id.toString());
  const sa = sendSwitches().push ? readServiceAccount() : null;
  let pushSent = 0;
  let pushLogged = 0;
  for (const userId of wanting) {
    if (!sa) {
      pushLogged++;
      continue;
    }
    try {
      const r = await sendPushToUser(sa, userId, { title: input.title, body: input.body, data: { type: input.kind, broadcastId: id } });
      pushSent += r.sent;
    } catch (err) {
      console.error("[broadcast] push failed:", err);
    }
  }
  if (!sa && pushLogged) console.info(`[broadcast] push not sent (switched off): ${pushLogged} customers`);

  await Broadcast.updateOne({ _id: id }, { $set: { inAppCount, pushSent, pushLogged } });
  return { ok: true as const, broadcast: { id, inAppCount, pushSent, pushLogged, guestBookings: a.guestBookings } };
}

export async function listBroadcasts() {
  await connectDB();
  const rows = await Broadcast.find().sort({ createdAt: -1 }).limit(100).populate("sentBy", "name").lean();
  return rows.map((b) => ({
    id: b._id.toString(),
    title: b.title,
    body: b.body,
    kind: b.kind,
    audience: b.audience,
    email: b.email ?? null,
    closureId: b.closureId ? String(b.closureId) : null,
    inAppCount: b.inAppCount,
    pushSent: b.pushSent,
    pushLogged: b.pushLogged,
    guestBookings: b.guestBookings,
    sentBy: (b.sentBy as unknown as { name?: string } | null)?.name ?? null,
    sentAt: toPkIso(b.createdAt),
  }));
}

export type AdminBroadcast = Awaited<ReturnType<typeof listBroadcasts>>[number];
