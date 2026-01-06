import React from 'react';

export const Footer = () => {
  return (
    <footer className="bg-white dark:bg-black border-t border-zinc-200 dark:border-white/5 py-8 px-6 transition-colors duration-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono uppercase tracking-widest text-zinc-500">
        <div className="flex items-center gap-2">
           <span className="w-2 h-2 bg-[#ccff00] rounded-full"></span>
           <span>IBEX Systems v1.0</span>
        </div>
        
        <div className="flex gap-8">
           <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Privacy</a>
           <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Terms</a>
           <a href="/sitemap.xml" className="hover:text-black dark:hover:text-white transition-colors">Sitemap</a>
        </div>

        <div>
            © {new Date().getFullYear()} IBEX Arena.
        </div>
      </div>
    </footer>
  );
};
