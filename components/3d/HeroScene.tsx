'use client';

import React from 'react';

export const HeroScene = () => {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
       {/* Base Background */}
       <div className="absolute inset-0 bg-white dark:bg-[#050505] transition-colors duration-500" />
       
       {/* Animated Gradient Orb 1 - Neon Yellow */}
       <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-[#2DD4BF]/30 dark:bg-[#2DD4BF]/10 blur-[120px] animate-pulse" />
       
       {/* Animated Gradient Orb 2 - White/Cyan for contrast */}
       <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-cyan-400/20 dark:bg-white/5 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />

       {/* Animated Gradient Orb 3 - Center subtle */}
       <div className="absolute top-[40%] left-[30%] w-[40vw] h-[40vw] rounded-full bg-[#2DD4BF]/10 blur-[150px] animate-pulse" style={{ animationDelay: '4s' }} />

       {/* Grain Overlay for Texture */}
       <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]" 
         style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
       />
    </div>
  );
};
