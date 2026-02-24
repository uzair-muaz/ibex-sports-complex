'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useVelocity,
  useAnimationFrame
} from 'framer-motion';
import { wrap } from '@motionone/utils';

interface ParallaxTextProps {
  children: React.ReactNode;
  baseVelocity: number;
}

function ParallaxText({ children, baseVelocity = 100 }: ParallaxTextProps) {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400
  });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], {
    clamp: false
  });

  const x = useTransform(baseX, (v) => `${wrap(-20, -45, v)}%`);

  const directionFactor = useRef<number>(1);
  useAnimationFrame((t, delta) => {
    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);

    if (velocityFactor.get() < 0) {
      directionFactor.current = -1;
    } else if (velocityFactor.get() > 0) {
      directionFactor.current = 1;
    }

    moveBy += directionFactor.current * moveBy * velocityFactor.get();

    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div className="overflow-hidden m-0 whitespace-nowrap flex flex-nowrap">
      <motion.div className="flex flex-nowrap whitespace-nowrap gap-8" style={{ x }}>
        {children}
        {children}
        {children}
        {children}
      </motion.div>
    </div>
  );
}

export const InfiniteGallery = ({ images }: { images: { url: string; title: string }[] }) => {
  return (
    <div className="py-24 overflow-hidden relative z-10">
      <ParallaxText baseVelocity={-2}>
        {images.map((img, i) => (
          <div key={i} className="relative w-[400px] h-[300px] md:w-[600px] md:h-[400px] flex-shrink-0 rounded-3xl overflow-hidden mx-4 group shadow-2xl">
            <Image
              src={img.url}
              alt={img.title}
              fill
              sizes="(max-width: 768px) 400px, 600px"
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
            <div className="absolute bottom-6 left-6 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-4 group-hover:translate-y-0">
                <span className="text-white text-2xl font-bold tracking-tighter">{img.title}</span>
            </div>
          </div>
        ))}
      </ParallaxText>
    </div>
  );
};
