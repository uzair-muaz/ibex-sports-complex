import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date to YYYY-MM-DD string in LOCAL timezone (not UTC)
 * This prevents timezone conversion issues where dates shift by a day
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format time from decimal hours to HH:MM string
 * e.g., 17.5 -> "17:30", 18 -> "18:00"
 */
export function formatTime(decimalTime: number): string {
  const hours = Math.floor(decimalTime);
  const minutes = decimalTime % 1 === 0 ? "00" : "30";
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
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
