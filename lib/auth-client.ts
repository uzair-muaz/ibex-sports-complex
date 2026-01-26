import { signIn, signOut, getSession as getNextAuthSession } from 'next-auth/react';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'user';
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('[AuthService] Attempting login for:', credentials.email);
      const result = await signIn('credentials', {
        email: credentials.email,
        password: credentials.password,
        redirect: false,
      });

      console.log('[AuthService] SignIn result:', { ok: result?.ok, error: result?.error });

      if (result?.error) {
        let errorMessage = result.error;
        if (result.error === 'CredentialsSignin') {
          errorMessage = 'Invalid email or password';
        } else if (result.error.includes('database') || result.error.includes('Database')) {
          errorMessage = 'Database connection error. Please try again in a moment.';
        } else if (result.error.includes('CallbackRouteError')) {
          errorMessage = 'Authentication service error. Please try again.';
        }
        console.error('[AuthService] Login error:', errorMessage);
        return { success: false, error: errorMessage };
      }

      if (result?.ok) {
        console.log('[AuthService] SignIn successful, waiting for session cookie...');
        
        // Wait for NextAuth callback to complete and cookie to be set
        // Poll for session with increasing delays
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 200 + (i * 100)));
          const session = await this.getSession();
          if (session) {
            console.log('[AuthService] Session available:', session.email);
            return { success: true, user: session };
          }
          console.log(`[AuthService] Waiting for session... attempt ${i + 1}/10`);
        }
        
        // If session still not available, return success anyway
        // The cookie should be set by now, proxy will handle it
        console.log('[AuthService] Session not found but signIn succeeded - cookie should be set');
        return { 
          success: true, 
          user: {
            id: '',
            email: credentials.email,
            name: '',
            role: 'user' as const
          }
        };
      }

      return { success: false, error: 'Login failed. Please try again.' };
    } catch (error: any) {
      console.error('[AuthService] Login exception:', error);
      const errorMessage = error.message || 'Login failed. Please try again.';
      return { success: false, error: errorMessage };
    }
  },

  async logout(): Promise<void> {
    await signOut({ redirect: false });
    if (typeof window !== 'undefined') {
      // Clear all cached data
      window.localStorage.clear();
      window.sessionStorage.clear();
      // Use replace instead of href to prevent back button navigation
      window.location.replace('/admin');
    }
  },

  async getSession(): Promise<User | null> {
    try {
      const session = await getNextAuthSession();
      if (session?.user) {
        return {
          id: (session.user as any).id || '',
          email: session.user.email || '',
          name: session.user.name || '',
          role: (session.user as any).role || 'user',
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  },
};
