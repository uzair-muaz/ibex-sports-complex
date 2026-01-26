import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * ============================
 * Role & Access Configuration
 * ============================
 */

type UserRole = 'super_admin' | 'admin' | 'user';

const ROUTE_ACCESS: Record<string, UserRole[]> = {
  '/admin/analytics': ['super_admin'],
  '/admin/courts': ['super_admin'],
  '/admin/users': ['super_admin'],
  '/admin/bookings': ['admin', 'super_admin'],
  '/admin/bookings/new': ['admin', 'super_admin'],
  '/admin/feedback': ['admin', 'super_admin'],
};

/**
 * ============================
 * Helpers
 * ============================
 */

function hasRequiredRole(
  userRole: UserRole | undefined,
  requiredRoles: UserRole[]
): boolean {
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
}

function getRequiredRoles(pathname: string): UserRole[] {
  // Exact match first
  if (ROUTE_ACCESS[pathname]) {
    return ROUTE_ACCESS[pathname];
  }

  // Dynamic routes (e.g. /admin/bookings/:id/edit)
  for (const [route, roles] of Object.entries(ROUTE_ACCESS)) {
    const regex = new RegExp(`^${route.replace(/:\w+/g, '[^/]+')}$`);
    if (regex.test(pathname)) {
      return roles;
    }
  }

  // Default admin protection
  return ['admin', 'super_admin'];
}

async function getAuthToken(request: NextRequest) {
  try {
    return await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
  } catch (err) {
    console.error('[Proxy] Token read failed:', err);
    return null;
  }
}

function redirectToLogin(request: NextRequest, pathname: string) {
  const url = new URL('/admin', request.url);
  url.searchParams.set('callbackUrl', pathname);
  return NextResponse.redirect(url);
}

function redirectToDefaultRoute(
  request: NextRequest,
  role: UserRole
) {
  const defaults: Record<UserRole, string> = {
    super_admin: '/admin/analytics',
    admin: '/admin/bookings',
    user: '/admin',
  };

  return NextResponse.redirect(
    new URL(defaults[role] || '/admin', request.url)
  );
}

function withSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}

/**
 * ============================
 * Proxy Entry
 * ============================
 */

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /**
   * --------------------------------------------------
   * HARD EXCLUDES (never touch these)
   * --------------------------------------------------
   */
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|css|js|map)$/)
  ) {
    return NextResponse.next();
  }

  /**
   * --------------------------------------------------
   * Only protect /admin routes
   * --------------------------------------------------
   */
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  /**
   * --------------------------------------------------
   * Authentication
   * --------------------------------------------------
   */
  const token = await getAuthToken(request);

  // Login page
  if (pathname === '/admin') {
    if (token?.role) {
      return withSecurityHeaders(
        redirectToDefaultRoute(request, token.role as UserRole)
      );
    }
    return withSecurityHeaders(NextResponse.next());
  }

  // Protected admin routes
  if (!token) {
    return withSecurityHeaders(
      redirectToLogin(request, pathname)
    );
  }

  const userRole = token.role as UserRole | undefined;

  if (!userRole) {
    return withSecurityHeaders(
      redirectToLogin(request, pathname)
    );
  }

  const requiredRoles = getRequiredRoles(pathname);

  if (!hasRequiredRole(userRole, requiredRoles)) {
    return withSecurityHeaders(
      redirectToDefaultRoute(request, userRole)
    );
  }

  /**
   * --------------------------------------------------
   * Access granted
   * --------------------------------------------------
   */
  const response = NextResponse.next();
  response.headers.set('X-User-Role', userRole);
  return withSecurityHeaders(response);
}

/**
 * ============================
 * Matcher
 * ============================
 *
 * NOTE:
 * - No regex gymnastics
 * - Explicit exclusions handled in code
 */
export const config = {
  matcher: ['/:path*'],
};
