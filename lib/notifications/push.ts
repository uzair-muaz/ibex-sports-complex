import crypto from "crypto";
import connectDB from "@/lib/mongodb";
import Device from "@/models/Device";

/**
 * Firebase Cloud Messaging (HTTP v1), with no extra package.
 * FIREBASE_SERVICE_ACCOUNT = the service-account JSON (or the same, base64).
 */
type ServiceAccount = { project_id: string; client_email: string; private_key: string; token_uri?: string };

export function readServiceAccount(raw = process.env.FIREBASE_SERVICE_ACCOUNT): ServiceAccount | null {
  if (!raw?.trim()) return null;
  try {
    const text = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const sa = JSON.parse(text) as ServiceAccount;
    return sa.project_id && sa.client_email && sa.private_key ? sa : null;
  } catch {
    return null;
  }
}

let cached: { token: string; expiresAt: number } | null = null;

async function accessToken(sa: ServiceAccount): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  const tokenUri = sa.token_uri || "https://oauth2.googleapis.com/token";
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = crypto.createSign("RSA-SHA256").update(unsigned).sign(sa.private_key).toString("base64url");
  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (!res.ok) throw new Error(`Firebase sign-in failed (${res.status})`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

/** Send to every phone of this customer. Tokens Firebase says are dead are removed. */
export async function sendPushToUser(
  sa: ServiceAccount,
  userId: string,
  message: { title: string; body: string; data: Record<string, string> },
): Promise<{ sent: number; removed: number }> {
  await connectDB();
  const devices = await Device.find({ userId }).select("pushToken").lean();
  if (devices.length === 0) return { sent: 0, removed: 0 };
  const token = await accessToken(sa);
  let sent = 0;
  let removed = 0;
  for (const d of devices) {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: { token: d.pushToken, notification: { title: message.title, body: message.body }, data: message.data },
      }),
    });
    if (res.ok) {
      sent++;
    } else if (res.status === 404 || res.status === 400) {
      // UNREGISTERED / invalid token: the app was removed or the token changed.
      await Device.deleteOne({ _id: d._id });
      removed++;
    } else {
      console.error(`[notify] push failed (${res.status})`);
    }
  }
  return { sent, removed };
}
