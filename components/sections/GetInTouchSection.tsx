'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { MapPin, Phone } from 'lucide-react';
import { TextReveal } from '@/components/ui/TextReveal';
import { AnimatedPhoneIcon, AnimatedMapPinIcon, AnimatedClockIcon, AnimatedInstagramIcon, AnimatedFacebookIcon, AnimatedTwitterIcon } from '@/components/ui/LottieIcon';

export const GetInTouchSection = () => {
  const premiumImages = {
    map: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1920&q=90',
  };

  return (
    <section className="py-20 px-6 bg-white dark:bg-[#050505] border-t border-zinc-200 dark:border-white/5 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <TextReveal className="text-[12vw] leading-[0.8] font-black tracking-tighter gradient-text uppercase">
            Get In Touch
          </TextReveal>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Map Card */}
          <div className="md:col-span-2 relative h-[400px] rounded-3xl overflow-hidden group">
            <Image 
              src={premiumImages.map}
              alt="Map"
              fill
              sizes="(max-width: 768px) 100vw, 66vw"
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
            <div className="absolute bottom-8 left-8 p-6 bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-2xl max-w-xs shadow-xl border border-white/10">
              <div className="flex items-center gap-3 mb-2 text-[#2DD4BF]">
                <AnimatedMapPinIcon className="w-5 h-5" color="#2DD4BF" />
                <span className="font-bold text-[#0F172A] dark:text-white">Main Entrance</span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                123 Victory Lane, Sports District<br/>Metropolis, NY 10012
              </p>
            </div>
          </div>

          {/* Contact Info Card */}
          <div className="bg-zinc-100 dark:bg-zinc-900 p-8 rounded-3xl flex flex-col justify-between hover:shadow-xl transition-shadow border border-zinc-200 dark:border-white/5 group">
            <div>
              <div className="w-12 h-12 bg-[#2DD4BF] rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <AnimatedPhoneIcon className="w-6 h-6" color="#000" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Book a Session</h3>
              <p className="text-zinc-500 dark:text-zinc-400">Ready to play? Give us a call or book online.</p>
            </div>
            <div className="space-y-2">
              <p className="text-xl font-mono">+1 (555) 123-4567</p>
              <p className="text-zinc-500">hello@ibexarena.com</p>
            </div>
          </div>

          {/* Opening Hours Card */}
          <div className="group bg-zinc-900 dark:bg-zinc-900 text-white p-8 rounded-3xl flex flex-col justify-between border border-white/10 hover:border-[#2DD4BF]/50 transition-colors">
            <div>
              <div className="mb-6">
                <AnimatedClockIcon className="w-8 h-8" color="#2DD4BF" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Opening Hours</h3>
            </div>
            <ul className="space-y-4 font-mono text-sm text-zinc-400">
              <li className="flex justify-between border-b border-white/10 pb-2">
                <span>Mon - Fri</span>
                <span className="text-white">06:00 - 23:00</span>
              </li>
              <li className="flex justify-between border-b border-white/10 pb-2">
                <span>Saturday</span>
                <span className="text-white">08:00 - 22:00</span>
              </li>
              <li className="flex justify-between pt-2">
                <span>Sunday</span>
                <span className="text-white">08:00 - 20:00</span>
              </li>
            </ul>
          </div>

          {/* Social Links Card */}
          <div className="md:col-span-2 bg-[#2DD4BF] p-8 rounded-3xl flex items-center justify-between text-[#0F172A] relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <div className="relative z-10">
              <h3 className="text-3xl font-bold mb-2">Follow the Action</h3>
              <p className="text-[#0F172A]/70 font-medium">Stay updated with tournaments and events.</p>
            </div>
            <div className="relative z-10 flex gap-4">
              {[
                { Icon: AnimatedInstagramIcon, delay: 0, name: 'instagram' },
                { Icon: AnimatedFacebookIcon, delay: 0.1, name: 'facebook' },
                { Icon: AnimatedTwitterIcon, delay: 0.2, name: 'twitter' },
              ].map(({ Icon, delay, name }) => (
                <motion.button
                  key={name}
                  initial={{ scale: 0, rotate: -180 }}
                  whileInView={{ scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.2, rotate: 360 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ delay, type: "spring", stiffness: 200 }}
                  className="p-3 bg-black/10 backdrop-blur-sm rounded-full hover:bg-white/20 hover:scale-110 transition-all cursor-pointer"
                >
                  <Icon className="w-5 h-5" color="#000" />
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
