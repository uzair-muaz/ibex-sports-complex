import { isStaffRole } from "@/lib/authz";
import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api/response";
import { verifyMobileAccessToken } from "@/lib/api/mobile-jwt";
import type { ApiUser } from "@/lib/api/types";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { BLOCKED_CODE, BLOCKED_MESSAGE } from "@/lib/customer-block-rules";

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

async function userFromSession(): Promise<ApiUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  // Customers: check the block on every request (website sessions last a long time).
  let blocked = false;
  if (!isStaffRole(session.user.role)) {
    try {
      await connectDB();
      blocked = !!(await User.exists({ _id: session.user.id, blockedAt: { $type: "date" } }));
    } catch {
      /* keep going */
    }
  }
  return {
    blocked,
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role || "user",
    phone: session.user.phone,
    image: session.user.image,
  };
}

async function userFromBearer(request: Request): Promise<ApiUser | null> {
  const token = bearerToken(request);
  if (!token) return null;
  const claims = await verifyMobileAccessToken(token);
  if (!claims) return null;

  // Refresh phone/image from DB so mobile stays current
  try {
    await connectDB();
    const dbUser = await User.findById(claims.sub).select(
      "email name role phone image blockedAt",
    );
    if (!dbUser) return null;
    return {
      id: dbUser._id.toString(),
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      phone: dbUser.phone,
      image: dbUser.image,
      blocked: !!dbUser.blockedAt,
    };
  } catch {
    return {
      id: claims.sub,
      email: claims.email,
      name: claims.name,
      role: claims.role,
    };
  }
}

/**
 * Resolve caller for web (NextAuth cookie) or mobile (Bearer access token).
 * Bearer takes precedence when present.
 */
export async function resolveApiUser(
  request: Request,
): Promise<ApiUser | null> {
  const fromBearer = await userFromBearer(request);
  if (fromBearer) return fromBearer;
  return userFromSession();
}

export async function requireApiCustomer(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) {
    return {
      ok: false as const,
      response: apiError("Unauthorized", 401, request, { code: "UNAUTHORIZED" }),
    };
  }
  if (isStaffRole(user.role)) {
    return {
      ok: false as const,
      response: apiError("Customer account required", 403, request, {
        code: "STAFF_ACCOUNT",
      }),
    };
  }
  if (user.blocked) {
    return {
      ok: false as const,
      response: apiError(BLOCKED_MESSAGE, 403, request, { code: BLOCKED_CODE }),
    };
  }
  return { ok: true as const, user };
}

export async function requireApiAdmin(request: Request) {
  const user = await resolveApiUser(request);
  if (!user || !isStaffRole(user.role)) {
    return {
      ok: false as const,
      response: apiError("Unauthorized", 401, request),
    };
  }
  return { ok: true as const, user };
}

export async function optionalApiUser(request: Request) {
  return resolveApiUser(request);
}
