/**
 * Lightweight error reporting for API routes / actions.
 * Logs in non-production. Optional Sentry: install `@sentry/nextjs` and set
 * SENTRY_DSN, then replace the body of `reportToSentry` if desired.
 */

type CaptureContext = {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

function reportToSentry(_error: unknown, _context?: CaptureContext): void {
  // Intentionally no hard dependency on @sentry/nextjs (keeps `next build` clean).
  // When ready: `npm i @sentry/nextjs`, set SENTRY_DSN, and call Sentry.captureException here.
}

export function captureException(
  error: unknown,
  context?: CaptureContext,
): void {
  const message =
    error instanceof Error ? error.message : String(error ?? "Unknown error");

  if (process.env.NODE_ENV !== "production") {
    console.error("[monitor]", message, context?.extra || "");
  }

  if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
    reportToSentry(error, context);
  }
}

export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
): void {
  if (process.env.NODE_ENV !== "production") {
    console[level === "error" ? "error" : "log"](`[monitor:${level}]`, message);
  }
}
