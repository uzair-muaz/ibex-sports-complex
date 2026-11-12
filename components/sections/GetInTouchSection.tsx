"use client";

import { motion } from "framer-motion";

import {
  AnimatedPhoneIcon,
  AnimatedMapPinIcon,
  AnimatedInstagramIcon,
  AnimatedFacebookIcon,
} from "@/components/ui/AnimatedIcons";
import { useVenue } from "@/lib/tanstack/hooks/queries";
import { mapEmbedUrl, mapLink, telHref } from "@/lib/venue-rules";

export const GetInTouchSection = () => {
  // Contacts come from Admin → App Settings.
  const venue = useVenue();
  const mapUrl = mapLink(venue);
  const phoneNumber = venue.phone;
  const email = venue.email;
  const address = venue.address;
  const mapEmbed = mapEmbedUrl(venue);
  const socials = [
    { Icon: AnimatedInstagramIcon, name: "instagram", url: venue.instagramUrl },
    { Icon: AnimatedFacebookIcon, name: "facebook", url: venue.facebookUrl },
  ].filter((s): s is typeof s & { url: string } => Boolean(s.url));

  return (
    <section className="py-12 sm:py-16 md:py-24 lg:py-32 px-4 sm:px-6 bg-[#050505] border-t border-white/5 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 sm:mb-14 md:mb-20 lg:mb-28">
          <p className="text-[#2DD4BF] font-mono text-xs uppercase tracking-[0.25em] mb-3 sm:mb-5">
            Contact
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight gradient-text">
            Get In Touch
          </h2>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Map Card */}
          <div className="md:col-span-2 relative h-[260px] sm:h-[360px] md:h-[500px] rounded-2xl sm:rounded-3xl overflow-hidden group">
            <iframe
              src={mapEmbed}
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
              className="absolute top-4 right-4 bg-black/80 backdrop-blur-md px-4 py-2 rounded-lg shadow-lg border border-white/10 hover:bg-black transition-colors z-10"
            >
              <span className="text-xs font-semibold text-white flex items-center gap-2">
                <AnimatedMapPinIcon className="w-4 h-4" color="#2DD4BF" />
                Open in Google Maps
              </span>
            </a>
            <div className="absolute bottom-4 left-4 right-4 md:bottom-8 md:left-8 md:right-auto p-4 md:p-6 bg-black/80 backdrop-blur-md rounded-2xl max-w-xs shadow-xl border border-white/10 pointer-events-none">
              <div className="flex items-center gap-3 mb-2 text-[#2DD4BF]">
                <AnimatedMapPinIcon className="w-5 h-5" color="#2DD4BF" />
                <span className="font-bold text-white text-sm md:text-base">
                  Main Entrance
                </span>
              </div>
              <p className="text-xs md:text-sm text-zinc-300">
                {address}
              </p>
            </div>
          </div>

          {/* Contact Info Card */}
          <div className="bg-zinc-900 p-5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl flex flex-col justify-between hover:shadow-xl transition-shadow border border-white/5 group">
            <div>
              <div className="w-11 h-11 sm:w-12 sm:h-12 bg-[#2DD4BF] rounded-full flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <AnimatedPhoneIcon className="w-5 h-5 sm:w-6 sm:h-6" color="#000" />
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2">
                Book a Session
              </h3>
              <p className="text-sm md:text-base text-zinc-400">
                Ready to play? Give us a call or book online.
              </p>
            </div>
            <div className="space-y-2 mt-4">
              <a
                href={telHref(phoneNumber)}
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

          {/* Social Links Card */}
          <div className="md:col-span-3 bg-[#2DD4BF] p-5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 text-[#0F172A] relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <div className="relative z-10">
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">
                Follow the Action
              </h3>
              <p className="text-sm md:text-base text-[#0F172A]/70 font-medium">
                Stay updated with tournaments and events.
              </p>
            </div>
            <div className="relative z-10 flex gap-4">
              {socials.map(({ Icon, name, url }, i) => (
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
                  transition={{ delay: i * 0.1, type: "spring", stiffness: 200 }}
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
