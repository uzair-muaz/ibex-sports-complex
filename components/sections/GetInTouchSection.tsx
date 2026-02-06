"use client";

import { motion } from "framer-motion";
import { TextReveal } from "@/components/ui/TextReveal";
import {
  AnimatedPhoneIcon,
  AnimatedMapPinIcon,
  AnimatedClockIcon,
  AnimatedInstagramIcon,
  AnimatedFacebookIcon,
} from "@/components/ui/LottieIcon";

export const GetInTouchSection = () => {
  const mapUrl = "https://maps.app.goo.gl/4SJSmPKZHhHhF3tMA?g_st=ic";
  const instagramUrl =
    "https://www.instagram.com/ibexsportscomplex?igsh=MXRhYnRhdGw0ZjlrcA==";
  const facebookUrl =
    "https://www.facebook.com/share/1E1fH2mPGT/?mibextid=wwXIfr";
  const phoneNumber = "+923255429429";
  const email = "ibexsportscomplex@gmail.com";
  const address =
    "Ibex Sports Complex, Toot Stop Near Orchid Marquee, Wild Life Park Road, Main Islamabad Expy, Islamabad, 42700";

  // Google Maps embed URL with location marker for Ibex Sports Complex
  const mapEmbedUrl = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3323.7842767507145!2d73.1439709!3d33.5849499!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38dfed0d4fd052a7%3A0x36114e312659cf3a!2sIbex%20Sports%20Complex!5e0!3m2!1sen!2s!4v1768089209428!5m2!1sen!2s`;

  return (
    <section className="py-20 px-6 bg-[var(--landing-bg)] dark:bg-[#050505] border-t border-zinc-200/80 dark:border-white/5 transition-colors duration-500">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <TextReveal className="text-[12vw] leading-[0.8] font-black tracking-tighter gradient-text uppercase">
            Get In Touch
          </TextReveal>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Map Card */}
          <div className="md:col-span-2 relative h-[400px] md:h-[500px] rounded-3xl overflow-hidden group">
            <iframe
              src={mapEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full"
              title="Ibex Sports Complex Location"
            />
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-4 right-4 bg-white/90 dark:bg-black/80 backdrop-blur-md px-4 py-2 rounded-lg shadow-lg border border-white/10 hover:bg-white dark:hover:bg-black transition-colors z-10"
            >
              <p className="text-xs font-semibold text-[#0F172A] dark:text-white flex items-center gap-2">
                <AnimatedMapPinIcon className="w-4 h-4" color="#2DD4BF" />
                Open in Google Maps
              </p>
            </a>
            <div className="absolute bottom-4 left-4 right-4 md:bottom-8 md:left-8 md:right-auto p-4 md:p-6 bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-2xl max-w-xs shadow-xl border border-white/10 pointer-events-none">
              <div className="flex items-center gap-3 mb-2 text-[#2DD4BF]">
                <AnimatedMapPinIcon className="w-5 h-5" color="#2DD4BF" />
                <span className="font-bold text-[#0F172A] dark:text-white text-sm md:text-base">
                  Main Entrance
                </span>
              </div>
              <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-300">
                {address}
              </p>
            </div>
          </div>

          {/* Contact Info Card */}
          <div className="bg-zinc-100/80 dark:bg-zinc-900/80 p-6 md:p-8 rounded-3xl flex flex-col justify-between hover:shadow-xl transition-all duration-300 border border-zinc-200/80 dark:border-white/10 group">
            <div>
              <div className="w-12 h-12 bg-[#2DD4BF] rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <AnimatedPhoneIcon className="w-6 h-6" color="#000" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-2">
                Book a Session
              </h3>
              <p className="text-sm md:text-base text-zinc-500 dark:text-zinc-400">
                Ready to play? Give us a call or book online.
              </p>
            </div>
            <div className="space-y-2 mt-4">
              <a
                href={`tel:${phoneNumber}`}
                className="text-lg md:text-xl font-mono hover:text-[#2DD4BF] transition-colors block"
              >
                {phoneNumber}
              </a>
              <a
                href={`mailto:${email}`}
                className="text-sm md:text-base text-zinc-500 hover:text-[#2DD4BF] transition-colors block break-all"
              >
                {email}
              </a>
            </div>
          </div>

          {/* Opening Hours Card */}
          <div className="group bg-zinc-900 dark:bg-zinc-900 text-white p-6 md:p-8 rounded-3xl flex flex-col justify-between border border-white/10 hover:border-[#2DD4BF]/50 transition-colors">
            <div>
              <div className="mb-6">
                <AnimatedClockIcon className="w-8 h-8" color="#2DD4BF" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-2">
                Opening Hours
              </h3>
            </div>
            <ul className="space-y-4 font-mono text-xs md:text-sm text-zinc-400">
              <li className="flex justify-between border-b border-white/10 pb-2">
                <span>Mon - Fri</span>
                <span className="text-white">12:00 PM - 2:00 AM</span>
              </li>
              <li className="flex justify-between border-b border-white/10 pb-2">
                <span>Saturday</span>
                <span className="text-white">12:00 PM - 2:00 AM</span>
              </li>
              <li className="flex justify-between pt-2">
                <span>Sunday</span>
                <span className="text-white">12:00 PM - 2:00 AM</span>
              </li>
            </ul>
          </div>

          {/* Social Links Card */}
          <div className="md:col-span-2 bg-[#2DD4BF] p-6 md:p-8 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 text-[#0F172A] relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <div className="relative z-10">
              <h3 className="text-2xl md:text-3xl font-bold mb-2">
                Follow the Action
              </h3>
              <p className="text-sm md:text-base text-[#0F172A]/70 font-medium">
                Stay updated with tournaments and events.
              </p>
            </div>
            <div className="relative z-10 flex gap-4">
              {[
                {
                  Icon: AnimatedInstagramIcon,
                  delay: 0,
                  name: "instagram",
                  url: instagramUrl,
                },
                {
                  Icon: AnimatedFacebookIcon,
                  delay: 0.1,
                  name: "facebook",
                  url: facebookUrl,
                },
              ].map(({ Icon, delay, name, url }) => (
                <motion.a
                  key={name}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ scale: 0, rotate: -180 }}
                  whileInView={{ scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.2, rotate: 360 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ delay, type: "spring", stiffness: 200 }}
                  className="p-3 bg-black/10 backdrop-blur-sm rounded-full hover:bg-white/20 hover:scale-110 transition-all cursor-pointer"
                >
                  <Icon className="w-5 h-5" color="#000" />
                </motion.a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
