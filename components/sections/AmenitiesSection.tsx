'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { ParallaxSection } from '@/components/ui/ParallaxSection';
import { TextReveal } from '@/components/ui/TextReveal';
import { AnimatedCoffeeIcon, AnimatedFoodTruckIcon } from '@/components/ui/LottieIcon';

export const AmenitiesSection = () => {
  const premiumImages = {
    // Temporary: using food image everywhere
    cafe: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1920&q=90&auto=format&fit=crop',
    food: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1920&q=90&auto=format&fit=crop',
  };

  return (
    <section className="py-32 px-6 bg-zinc-50 dark:bg-[#080808] transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        <ParallaxSection speed={0.2}>
          <div className="mb-24">
            <TextReveal className="text-6xl md:text-8xl font-bold tracking-tighter gradient-text">
              BEYOND THE GAME.
            </TextReveal>
          </div>
        </ParallaxSection>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <ParallaxSection speed={0.15}>
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="group space-y-8"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-xl">
                <Image 
                  src={premiumImages.cafe}
                  alt="Coffee Shop" 
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute top-6 right-6 bg-black/50 backdrop-blur-md p-4 rounded-full">
                  <AnimatedCoffeeIcon className="w-8 h-8" color="#2DD4BF" />
                </div>
              </div>
              <div>
                <h3 className="text-4xl font-bold mb-4 text-black dark:text-white">Courtside Café</h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-lg">
                  Refuel with our specialty grade coffee and fresh pastries. 
                  The perfect spot to analyze your match or relax before the game.
                </p>
              </div>
            </motion.div>
          </ParallaxSection>

          <ParallaxSection speed={0.15}>
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="group space-y-8 md:mt-24"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-xl">
                <Image 
                  src={premiumImages.food}
                  alt="Food Cart" 
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute top-6 right-6 bg-black/50 backdrop-blur-md p-4 rounded-full">
                  <AnimatedFoodTruckIcon className="w-8 h-8" color="#2DD4BF" />
                </div>
              </div>
              <div>
                <h3 className="text-4xl font-bold mb-4 text-black dark:text-white">Gourmet Nutrition</h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-lg">
                  Healthy bowls, wraps, and energizing snacks. 
                  Curated nutrition to keep you performing at your peak.
                </p>
              </div>
            </motion.div>
          </ParallaxSection>
        </div>
      </div>
    </section>
  );
};

