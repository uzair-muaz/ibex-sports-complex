/**
 * Reusable authentication and authorization utilities
 * For use in client components (React hooks)
 */

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export type UserRole = 'super_admin' | 'admin' | 'user';

/**
 * Role hierarchy - defines which roles can access what
 */
export const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  super_admin: ['super_admin', 'admin', 'user'],
  admin: ['admin', 'user'],
  user: ['user'],
} as const;

/**
 * Route access configuration
 * Maps routes to required roles
 */
export const ROUTE_ACCESS: Record<string, UserRole[]> = {
  '/admin/analytics': ['super_admin'],
  '/admin/courts': ['super_admin'],
  '/admin/users': ['super_admin'],
  '/admin/bookings': ['admin', 'super_admin'],
  '/admin/feedback': ['admin', 'super_admin'],
  '/admin/bookings/new': ['admin', 'super_admin'],
  '/admin/bookings/:id/edit': ['admin', 'super_admin'],
};

/**
 * Default redirect paths based on role
 */
export const ROLE_DEFAULT_ROUTES: Record<UserRole, string> = {
  super_admin: '/admin/analytics',
  admin: '/admin/bookings',
  user: '/admin',
};

/**
 * Check if user has required role for a route
 */
export function hasRequiredRole(userRole: UserRole | undefined, requiredRoles: UserRole[]): boolean {
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
}

/**
 * Get required roles for a specific pathname
 */
export function getRequiredRoles(pathname: string): UserRole[] {
  // Check exact matches first
  if (ROUTE_ACCESS[pathname]) {
    return ROUTE_ACCESS[pathname];
  }

  // Check dynamic routes (e.g., /admin/bookings/:id/edit)
  for (const [route, roles] of Object.entries(ROUTE_ACCESS)) {
    const routePattern = route.replace(':id', '[^/]+');
    const regex = new RegExp(`^${routePattern}$`);
    if (regex.test(pathname)) {
      return roles;
    }
  }

  // Default: require admin or super_admin for any admin route
  if (pathname.startsWith('/admin')) {
    return ['admin', 'super_admin'];
  }

  return [];
}

/**
 * React hook for authentication and authorization
 * Handles redirects and role-based access control
 */
export function useAuth(requiredRoles?: UserRole[]) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const userRole = (session?.user as any)?.role as UserRole | undefined;
  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';

  // Determine required roles for current route if not provided
  const routeRequiredRoles = requiredRoles || getRequiredRoles(pathname);
  const hasAccess = hasRequiredRole(userRole, routeRequiredRoles);

  // Redirect logic (skip for login page - let it handle its own redirects)
  useEffect(() => {
    if (isLoading) return;

    const isLoginPage = pathname === '/admin';
    
    // Don't redirect on login page - let the login page handle it
    if (isLoginPage) {
      return;
    }

    // If not authenticated and not on login page, redirect to login
    if (!isAuthenticated && !isLoginPage) {
      router.replace('/admin');
      return;
    }

    // If authenticated but doesn't have required role, redirect to default route
    if (isAuthenticated && userRole && routeRequiredRoles.length > 0 && !hasAccess) {
      const defaultRoute = ROLE_DEFAULT_ROUTES[userRole] || '/admin/bookings';
      router.replace(defaultRoute);
      return;
    }
  }, [status, isAuthenticated, userRole, pathname, hasAccess, routeRequiredRoles, isLoading, router]);

  return {
    session,
    userRole,
    isAuthenticated,
    isLoading,
    hasAccess,
    isSuperAdmin: userRole === 'super_admin',
    isAdmin: userRole === 'admin' || userRole === 'super_admin',
  };
}
