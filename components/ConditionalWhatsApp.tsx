'use client';

import { usePathname } from 'next/navigation';
import { WhatsAppFloat } from './WhatsAppFloat';

export const ConditionalWhatsApp = () => {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin') || false;
  
  if (isAdminPage) {
    return null;
  }
  
  return <WhatsAppFloat />;
};
