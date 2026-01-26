/**
 * Detects if code is running during Next.js build phase
 * This prevents database connections and other runtime operations during build
 */
export function isBuildTime(): boolean {
  // Check for explicit build phase indicators (most reliable)
  if (
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.NEXT_PHASE === 'phase-development-build' ||
    process.env.NEXT_PHASE === 'phase-export'
  ) {
    return true;
  }

  // Check if we're running the build command
  if (typeof process !== 'undefined' && process.argv) {
    const isNextBuild = process.argv.some(arg => 
      typeof arg === 'string' && 
      (arg.includes('next') && arg.includes('build')) ||
      arg.includes('next-build')
    );
    if (isNextBuild) {
      return true;
    }
  }

  // During build, we're in Node.js (not browser) and not in a runtime environment
  // This is a fallback check - be conservative
  if (
    typeof process !== 'undefined' &&
    typeof window === 'undefined' &&
    !process.env.VERCEL &&
    !process.env.NETLIFY &&
    !process.env.RAILWAY_ENVIRONMENT &&
    process.env.NODE_ENV === 'production'
  ) {
    // Only return true if we're definitely building (check for build artifacts)
    // This prevents false positives during production runtime
    return false; // Be conservative - don't block production runtime
  }

  return false;
}
