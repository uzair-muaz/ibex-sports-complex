import crypto from "crypto";
import { apiOk, apiError } from "@/lib/api/response";
import { runReminders } from "@/lib/notifications/reminders";

/**
 * Scheduled job: 2-hour match reminders. Call every 10–15 minutes with
 *   Authorization: Bearer <CRON_SECRET>
 * (Vercel Cron sends this header itself when CRON_SECRET is set; on the
 * staging server use a cron/PM2 task with curl.) Never cancels or completes bookings.
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET || "";
  const given = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const ok =
    secret.length >= 16 &&
    given.length === secret.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return apiError("Unauthorized", 401, request, { code: "UNAUTHORIZED" });
  try {
    return apiOk(await runReminders(), request, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("jobs/reminders:", err);
    return apiError("Reminder job failed", 500, request, { code: "SERVER_ERROR" });
  }
}

export const GET = handle;
export const POST = handle;
