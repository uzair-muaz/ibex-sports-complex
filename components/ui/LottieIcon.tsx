'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Lottie from 'lottie-react';

interface LottieIconProps {
  animationData?: any;
  animationUrl?: string;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
}

export const LottieIcon = ({ 
  animationData, 
  animationUrl, 
  className = 'w-6 h-6',
  loop = true,
  autoplay = true 
}: LottieIconProps) => {
  const [animation, setAnimation] = useState<any>(null);

  useEffect(() => {
    if (animationUrl) {
      fetch(animationUrl)
        .then(res => res.json())
        .then(data => setAnimation(data))
        .catch(() => setAnimation(null));
    } else if (animationData) {
      setAnimation(animationData);
    }
  }, [animationUrl, animationData]);

  if (animation) {
    return (
      <div className={className}>
        <Lottie 
          animationData={animation} 
          loop={loop} 
          autoplay={autoplay}
          className="w-full h-full"
        />
      </div>
    );
  }

  return null;
};

// Phone Icon - Ringing/Pulsing Animation
export const AnimatedPhoneIcon = ({ className = 'w-6 h-6', color = 'currentColor' }: { className?: string; color?: string }) => {
  return (
    <motion.div
      className={className}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      whileHover={{ scale: 1.2 }}
    >
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <motion.path
          d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Pulsing rings for ringing effect */}
        <motion.circle
          cx="12"
          cy="12"
          r="8"
          stroke={color}
          strokeWidth="1"
          fill="none"
          opacity="0.3"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0, 0.3],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
        <motion.circle
          cx="12"
          cy="12"
          r="8"
          stroke={color}
          strokeWidth="1"
          fill="none"
          opacity="0.2"
          animate={{
            scale: [1, 1.8, 1],
            opacity: [0.2, 0, 0.2],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: 0.3,
            ease: "easeOut",
          }}
        />
      </svg>
    </motion.div>
  );
};

// MapPin Icon - Bouncing/Dropping Animation
export const AnimatedMapPinIcon = ({ className = 'w-6 h-6', color = 'currentColor' }: { className?: string; color?: string }) => {
  return (
    <motion.div
      className={className}
      initial={{ scale: 0, y: -50 }}
      animate={{ scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      whileHover={{ scale: 1.2, y: -5 }}
    >
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <motion.path
          d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <motion.circle
          cx="12"
          cy="10"
          r="3"
          stroke={color}
          strokeWidth="2"
          fill={color}
          animate={{
            scale: [1, 1.3, 1],
            y: [0, -3, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        {/* Ripple effect */}
        <motion.circle
          cx="12"
          cy="10"
          r="3"
          stroke={color}
          strokeWidth="1"
          fill="none"
          opacity="0.5"
          animate={{
            scale: [1, 2, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      </svg>
    </motion.div>
  );
};

// Clock Icon - Rotating Hands with Tick Animation (only animates on parent hover)
export const AnimatedClockIcon = ({ className = 'w-6 h-6', color = 'currentColor' }: { className?: string; color?: string }) => {
  return (
    <div className={className}>
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth="2"
          fill="none"
        />
        {/* Hour hand - slow rotation (only on group hover) */}
        <line
          x1="12"
          y1="12"
          x2="12"
          y2="8"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          className="clock-hour-hand"
          style={{ transformOrigin: '12px 12px' }}
        />
        {/* Minute hand - faster rotation (only on group hover) */}
        <line
          x1="12"
          y1="12"
          x2="16"
          y2="12"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          className="clock-minute-hand"
          style={{ transformOrigin: '12px 12px' }}
        />
        {/* Center dot - pulsing (only on group hover) */}
        <circle
          cx="12"
          cy="12"
          r="2"
          fill={color}
          className="group-hover:animate-pulse"
        />
      </svg>
    </div>
  );
};

// Coffee Icon - Steam Rising Animation
export const AnimatedCoffeeIcon = ({ className = 'w-6 h-6', color = 'currentColor' }: { className?: string; color?: string }) => {
  return (
    <motion.div
      className={className}
      initial={{ scale: 0, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      whileHover={{ scale: 1.2, y: -5 }}
    >
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <motion.path
          d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v8a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Steam lines - rising animation */}
        <motion.path
          d="M6 1v6"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          animate={{
            y: [0, -8, 0],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.path
          d="M10 1v6"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          animate={{
            y: [0, -10, 0],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            delay: 0.3,
            ease: "easeInOut",
          }}
        />
        <motion.path
          d="M14 1v6"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          animate={{
            y: [0, -8, 0],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2.1,
            repeat: Infinity,
            delay: 0.6,
            ease: "easeInOut",
          }}
        />
      </svg>
    </motion.div>
  );
};

// Utensils Icon - Chopping/Stirring Animation
export const AnimatedUtensilsIcon = ({ className = 'w-6 h-6', color = 'currentColor' }: { className?: string; color?: string }) => {
  return (
    <motion.div
      className={className}
      initial={{ scale: 0, rotate: 180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      whileHover={{ scale: 1.2 }}
    >
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Fork - chopping motion */}
        <motion.g
          animate={{
            rotate: [-5, 5, -5],
            y: [0, 2, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ transformOrigin: '7px 12px' }}
        >
          <path
            d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M3 2c0 1.1.9 2 2 2h4a2 2 0 0 0-2-2M3 2h7"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </motion.g>
        {/* Knife - stirring motion */}
        <motion.g
          animate={{
            rotate: [5, -5, 5],
            x: [0, 2, 0],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.3,
          }}
          style={{ transformOrigin: '17px 12px' }}
        >
          <path
            d="M11 2v20M11 2h7M11 12h7"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </motion.g>
      </svg>
    </motion.div>
  );
};

// Food Truck Icon - Moving Animation
export const AnimatedFoodTruckIcon = ({ className = 'w-6 h-6', color = 'currentColor' }: { className?: string; color?: string }) => {
  return (
    <motion.div
      className={className}
      initial={{ scale: 0, x: -50 }}
      animate={{ scale: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      whileHover={{ scale: 1.2, x: 5 }}
    >
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Truck body */}
        <motion.rect
          x="2"
          y="6"
          width="16"
          height="10"
          rx="1"
          stroke={color}
          strokeWidth="2"
          fill="none"
          animate={{
            x: [0, 2, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        {/* Truck cabin */}
        <motion.rect
          x="18"
          y="8"
          width="4"
          height="6"
          rx="0.5"
          stroke={color}
          strokeWidth="2"
          fill="none"
        />
        {/* Wheels */}
        <motion.circle
          cx="6"
          cy="18"
          r="2"
          stroke={color}
          strokeWidth="2"
          fill="none"
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ transformOrigin: '6px 18px' }}
        />
        <motion.circle
          cx="16"
          cy="18"
          r="2"
          stroke={color}
          strokeWidth="2"
          fill="none"
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ transformOrigin: '16px 18px' }}
        />
        {/* Window */}
        <motion.rect
          x="19"
          y="9"
          width="2"
          height="4"
          rx="0.5"
          stroke={color}
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
    </motion.div>
  );
};

// Instagram Icon - Heartbeat/Pulse Animation
export const AnimatedInstagramIcon = ({ className = 'w-6 h-6', color = 'currentColor' }: { className?: string; color?: string }) => {
  return (
    <motion.div
      className={className}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      whileHover={{ scale: 1.2, rotate: 15 }}
    >
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <motion.rect
          x="2"
          y="2"
          width="20"
          height="20"
          rx="5"
          stroke={color}
          strokeWidth="2"
          fill="none"
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.circle
          cx="12"
          cy="12"
          r="4"
          stroke={color}
          strokeWidth="2"
          fill="none"
        />
        <motion.circle
          cx="17"
          cy="7"
          r="1.5"
          fill={color}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [1, 0.7, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </svg>
    </motion.div>
  );
};

// Facebook Icon - Wave Animation
export const AnimatedFacebookIcon = ({ className = 'w-6 h-6', color = 'currentColor' }: { className?: string; color?: string }) => {
  return (
    <motion.div
      className={className}
      initial={{ scale: 0, rotate: 180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      whileHover={{ scale: 1.2, y: -3 }}
    >
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <motion.path
          d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          animate={{
            pathLength: [0, 1],
          }}
          transition={{
            duration: 1,
            ease: "easeInOut",
          }}
        />
        <motion.circle
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth="1"
          fill="none"
          opacity="0.2"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0, 0.2],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      </svg>
    </motion.div>
  );
};

// Twitter Icon - Flying/Twitter Bird Animation
export const AnimatedTwitterIcon = ({ className = 'w-6 h-6', color = 'currentColor' }: { className?: string; color?: string }) => {
  return (
    <motion.div
      className={className}
      initial={{ scale: 0, rotate: 180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      whileHover={{ scale: 1.2, rotate: -15 }}
    >
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <motion.path
          d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          animate={{
            y: [0, -2, 0],
            rotate: [0, 2, -2, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </svg>
    </motion.div>
  );
};
