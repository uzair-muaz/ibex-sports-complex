import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export const Footer = () => {
  return (
    <footer className="bg-white dark:bg-black border-t border-zinc-200 dark:border-white/5 py-8 px-6 transition-colors duration-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono uppercase tracking-widest text-zinc-500">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="relative w-8 h-8">
            <Image
              src="/logo.svg"
              alt="IBEX Sports Complex Logo"
              width={32}
              height={32}
              className="w-full h-full object-contain"
            />
          </div>
          <span>IBEX Systems v1.0</span>
        </Link>
        
        <div className="flex gap-8">
           <a href="/sitemap.xml" className="hover:text-black dark:hover:text-white transition-colors">Sitemap</a>
        </div>

        <div>
            © {new Date().getFullYear()} IBEX Sports Arena.
        </div>
      </div>
    </footer>
  );
};
