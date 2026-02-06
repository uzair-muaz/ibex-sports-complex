'use client';

import React from 'react';

export const HeroScene = () => {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
       {/* Base Background - warm neutrals */}
       <div className="absolute inset-0 bg-[var(--landing-bg)] dark:bg-[var(--landing-bg-dark)] transition-colors duration-500" />
       
       {/* Soft gradient orbs - lower opacity, no pulse for premium feel */}
       <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-[#2DD4BF]/20 dark:bg-[#2DD4BF]/08 blur-[120px]" />
       <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-cyan-400/15 dark:bg-white/04 blur-[100px]" />
       <div className="absolute top-[40%] left-[30%] w-[40vw] h-[40vw] rounded-full bg-[#2DD4BF]/08 dark:bg-[#2DD4BF]/05 blur-[150px]" />

       {/* Subtle mesh gradient for depth */}
       <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(45,212,191,0.06),transparent_50%)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(45,212,191,0.03),transparent_50%)]" />

       {/* Grain Overlay for Texture */}
       <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]" 
         style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
       />
    </div>
  );
};
