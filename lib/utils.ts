import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the base URL for the application
 * Works in both development and production (including Vercel)
 */
export function getBaseUrl(): string {
  // In production, prefer explicit env vars
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  
  // Vercel provides VERCEL_URL automatically
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Fallback to localhost for development
  return process.env.NODE_ENV === 'production' 
    ? 'https://localhost:3000' 
    : 'http://localhost:3000';
}
