'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from './theme-provider';
import { SmoothScroll } from '@/components/SmoothScroll';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <SmoothScroll>{children}</SmoothScroll>
      </ThemeProvider>
    </SessionProvider>
  );
}

