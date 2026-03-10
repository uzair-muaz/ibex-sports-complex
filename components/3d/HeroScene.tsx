'use client';

import React from 'react';

export const HeroScene = () => {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
       {/* Base Background */}
       <div className="absolute inset-0 bg-white dark:bg-[#050505] transition-colors duration-500" />
       
       {/* Gradient orbs */}
       <div className="absolute top-[-15%] left-[-5%] w-[75vw] h-[75vw] max-w-[900px] max-h-[900px] rounded-full bg-[#2DD4BF]/15 dark:bg-[#2DD4BF]/8 blur-[100px] animate-pulse" />
       <div className="absolute bottom-[-15%] right-[-5%] w-[65vw] h-[65vw] max-w-[800px] max-h-[800px] rounded-full bg-cyan-400/15 dark:bg-white/[0.04] blur-[90px] animate-pulse" style={{ animationDelay: '1.5s' }} />
       <div className="absolute top-[35%] left-[25%] w-[45vw] h-[45vw] max-w-[500px] max-h-[500px] rounded-full bg-[#2DD4BF]/10 dark:bg-[#2DD4BF]/5 blur-[120px] animate-pulse" style={{ animationDelay: '3s' }} />

       {/* Grain Overlay for Texture */}
       <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]" 
         style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
       />
    </div>
  );
};
