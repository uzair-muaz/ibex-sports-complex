import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export const Footer = () => {
  return (
    <footer className="bg-[var(--landing-bg)] dark:bg-[var(--landing-bg-dark)] border-t border-zinc-200/80 dark:border-white/10 py-8 px-6 transition-colors duration-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono uppercase tracking-widest text-zinc-500">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 hover:text-zinc-700 dark:hover:text-zinc-300 transition-all duration-300">
          <div className="relative w-8 h-8">
            <Image
              src="/logo.png"
              alt="IBEX Sports Complex Logo"
              width={32}
              height={32}
              className="w-full h-full"
            />
          </div>
          <span>Ibex sports Complex</span>
        </Link>
        
        <div className="flex gap-8">
           <a href="/sitemap.xml" className="hover:text-black dark:hover:text-white transition-colors duration-300">Sitemap</a>
        </div>

        <div>
            © {new Date().getFullYear()} Ibex sports Complex.
        </div>
      </div>
    </footer>
  );
};
