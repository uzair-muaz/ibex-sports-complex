'use client';

import { usePathname } from 'next/navigation';
import { WhatsAppFloat } from './WhatsAppFloat';

export const ConditionalWhatsApp = () => {
  const pathname = usePathname();
  
  // Hide on app dashboards and full-screen auth pages
  if (
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/account') ||
    pathname === '/login' ||
    pathname?.startsWith('/login/') ||
    pathname === '/forgot-password' ||
    pathname?.startsWith('/forgot-password/') ||
    pathname === '/reset-password' ||
    pathname?.startsWith('/reset-password/')
  ) {
    return null;
  }
  
  return <WhatsAppFloat />;
};
