'use client';

import { usePathname } from 'next/navigation';
import { WhatsAppFloat } from './WhatsAppFloat';

export const ConditionalWhatsApp = () => {
  const pathname = usePathname();
  
  // Hide WhatsApp button on admin pages
  if (pathname?.startsWith('/admin')) {
    return null;
  }
  
  return <WhatsAppFloat />;
};
