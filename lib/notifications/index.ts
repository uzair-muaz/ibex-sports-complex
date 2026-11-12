import mongoose from "mongoose";
import { allowedBySwitches, getPreferences } from "@/lib/preferences";
import connectDB from "@/lib/mongodb";
import Notification, { type NotificationType } from "@/models/Notification";
import { sendHtmlEmail } from "@/lib/email";
import { readServiceAccount, sendPushToUser } from "@/lib/notifications/push";

/**
 * One place that tells a customer something: the in-app list (always, for
 * signed-in customers), a phone push and an email.
 *
 * SAFETY: push and email are only really sent when switched on:
 *   NOTIFY_SEND_PUSH=true  (and FIREBASE_SERVICE_ACCOUNT set)
 *   NOTIFY_SEND_EMAIL=true
 * Otherwise they are only written to the log. Keep both off on laptops and
 * staging. Never throws: a failed message must never break a booking.
 */

export type NotifyInput = {
  /** Signed-in customer (in-app + push). null for guests. */
  userId: string | mongoose.Types.ObjectId | null;
  /** In-app/push type. null = email only (e.g. "booking received"). */
  type: NotificationType | null;
  title: string;
  body: string;
  bookingId?: string | mongoose.Types.ObjectId | null;
  amount?: number | null;
  /** Same key twice → the second call does nothing (sent once). */
  dedupeKey?: string;
  /** Email, when this message should also be emailed. */
  email?: { to: string; subject: string; html: string } | null;
};

export type NotifyResult = { inApp: boolean; push: "sent" | "logged" | "skipped"; email: "sent" | "logged" | "skipped" };

export function sendSwitches() {
  return {
    push: process.env.NOTIFY_SEND_PUSH === "true",
    email: process.env.NOTIFY_SEND_EMAIL === "true",
  };
}

/** "someone@example.com" → "so***@example.com" (for logs). */
function maskEmail(e: string) {
  const [name, domain] = e.split("@");
  return `${name.slice(0, 2)}***@${domain ?? ""}`;
}

/**
 * Whether this customer wants this kind of message by push or email
 * (their switches in Preferences). The in-app list always keeps everything.
 */
async function wants(userId: string, type: NotificationType | null): Promise<boolean> {
  try {
    return allowedBySwitches(await getPreferences(userId), type);
  } catch {
    return true;
  }
}

export async function notify(input: NotifyInput): Promise<NotifyResult> {
  const result: NotifyResult = { inApp: false, push: "skipped", email: "skipped" };
  try {
    await connectDB();
    const userId = input.userId ? input.userId.toString() : null;

    if (userId && input.type) {
      try {
        await Notification.create({
          userId,
          type: input.type,
          title: input.title.slice(0, 120),
          body: input.body.slice(0, 500),
          bookingId: input.bookingId ?? null,
          amount: input.amount ?? null,
          dedupeKey: input.dedupeKey,
        });
        result.inApp = true;
      } catch (err) {
        // Already sent this one (same dedupeKey): stop here, don't push or email again.
        if ((err as { code?: number }).code === 11000) return result;
        throw err;
      }
    }

    const switches = sendSwitches();
    if (userId && input.type && (await wants(userId, input.type))) {
      const sa = switches.push ? readServiceAccount() : null;
      if (sa) {
        const data: Record<string, string> = { type: input.type };
        if (input.bookingId) data.bookingId = input.bookingId.toString();
        await sendPushToUser(sa, userId, { title: input.title, body: input.body, data });
        result.push = "sent";
      } else {
        console.info(`[notify] push not sent (switched off): ${input.type} → user ${userId}`);
        result.push = "logged";
      }
    }

    if (input.email?.to && (!userId || (await wants(userId, input.type)))) {
      if (switches.email) {
        const sent = await sendHtmlEmail(input.email);
        result.email = sent.success ? "sent" : "skipped";
        if (!sent.success) console.error(`[notify] email failed: ${sent.message}`);
      } else {
        console.info(`[notify] email not sent (switched off): "${input.email.subject}" → ${maskEmail(input.email.to)}`);
        result.email = "logged";
      }
    }
  } catch (err) {
    console.error("[notify] failed:", err);
  }
  return result;
}
