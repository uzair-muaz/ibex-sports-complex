import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";
import { captureException } from "@/lib/monitoring";

/** Liveness / readiness for uptime probes (UptimeRobot, Better Stack, Vercel). */
export async function GET(request: Request) {
  try {
    await connectDB();
    const state = mongoose.connection.readyState;
    if (state !== 1) {
      return apiError("Database not ready", 503, request, {
        status: "degraded",
        db: "not_ready",
      });
    }
    return apiOk(
      {
        status: "ok",
        db: "connected",
        time: new Date().toISOString(),
      },
      request,
    );
  } catch (error: unknown) {
    captureException(error, { tags: { route: "health" } });
    return apiError(
      error instanceof Error ? error.message : "Health check failed",
      503,
      request,
      { status: "error" },
    );
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
