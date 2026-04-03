"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

export const InfiniteGallery = ({
  images,
}: {
  images: { url: string; title: string }[];
}) => {
  const col1 = images.filter((_, i) => i % 3 === 0);
  const col2 = images.filter((_, i) => i % 3 === 1);
  const col3 = images.filter((_, i) => i % 3 === 2);

  return (
    <div className="px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        {/* Column 1 */}
        <div className="flex flex-col gap-2 sm:gap-3 md:gap-4">
          {col1.map((img, i) => (
            <CollageItem
              key={img.url}
              img={img}
              tall={i % 2 === 0}
              index={i}
            />
          ))}
        </div>
        {/* Column 2 */}
        <div className="flex flex-col gap-2 sm:gap-3 md:gap-4 md:mt-8">
          {col2.map((img, i) => (
            <CollageItem
              key={img.url}
              img={img}
              tall={i % 2 !== 0}
              index={i + col1.length}
            />
          ))}
        </div>
        {/* Column 3 — hidden on mobile, shown on md+ */}
        <div className="hidden md:flex flex-col gap-2 sm:gap-3 md:gap-4 mt-16">
          {col3.map((img, i) => (
            <CollageItem
              key={img.url}
              img={img}
              tall={i % 2 === 0}
              index={i + col1.length + col2.length}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

function CollageItem({
  img,
  tall,
  index,
}: {
  img: { url: string; title: string };
  tall: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{
        duration: 0.6,
        delay: index * 0.05,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`relative overflow-hidden rounded-2xl group ring-1 ring-white/10 ${
        tall ? "aspect-[3/4]" : "aspect-[4/3]"
      }`}
    >
      <Image
        src={img.url}
        alt={img.title}
        fill
        sizes="(max-width: 768px) 50vw, 33vw"
        className="object-cover transition-transform duration-700 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute bottom-4 left-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span className="text-white text-sm md:text-base font-semibold">
          {img.title}
        </span>
      </div>
    </motion.div>
  );
}
