import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isStaffRole } from "@/lib/authz";

/**
 * Edge authorization (JWT only — no Mongoose on the Edge runtime):
 * - /admin and /admin/* → staff only (customers bounced to /account)
 * - /account/* → customers only
 * - /login → bounce authenticated users
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Behind a TLS-terminating proxy the request is plain http, but Auth.js set the
  // `__Secure-` session cookie; read the proxy's scheme to pick the right name.
  const secureCookie =
    req.headers.get("x-forwarded-proto") === "https" ||
    req.nextUrl.protocol === "https:";
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie,
  });

  const role = (token?.role as string | undefined) || undefined;
  const loggedIn = !!token?.id || !!token?.sub;

  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdminArea) {
    if (pathname === "/admin") {
      // Staff login page: customers go to their account; staff already in → bookings
      if (loggedIn && isStaffRole(role)) {
        return NextResponse.redirect(new URL("/admin/bookings", req.url));
      }
      if (loggedIn && !isStaffRole(role)) {
        return NextResponse.redirect(new URL("/account", req.url));
      }
      return NextResponse.next();
    }

    if (!loggedIn) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    if (!isStaffRole(role)) {
      return NextResponse.redirect(new URL("/account", req.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/account")) {
    if (!loggedIn) {
      const login = new URL("/login", req.url);
      login.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(login);
    }
    if (isStaffRole(role)) {
      return NextResponse.redirect(new URL("/admin/bookings", req.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/login" && loggedIn) {
    if (isStaffRole(role)) {
      return NextResponse.redirect(new URL("/admin/bookings", req.url));
    }
    return NextResponse.redirect(new URL("/account", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/account", "/account/:path*", "/login"],
};
