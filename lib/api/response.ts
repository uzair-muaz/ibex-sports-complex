import { NextResponse } from "next/server";

const DEFAULT_ORIGINS = ["http://localhost:3000"];

export function allowedOrigins(): string[] {
  const fromEnv = (process.env.API_CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : DEFAULT_ORIGINS;
}

export function corsHeaders(request?: Request): HeadersInit {
  const origin = request?.headers.get("origin") || "";
  const allowed = allowedOrigins();
  const wildcard = allowed.includes("*");

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  if (wildcard) {
    // Credentials cannot be used with *; omit credentials for open CORS
    headers["Access-Control-Allow-Origin"] = origin || "*";
    return headers;
  }

  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  // No matching origin → omit Allow-Origin (browser blocks credentialed cross-origin)

  return headers;
}

export function apiOk<T>(data: T, request?: Request, init?: ResponseInit) {
  return NextResponse.json(data, {
    status: init?.status ?? 200,
    headers: {
      ...corsHeaders(request),
      ...(init?.headers || {}),
    },
  });
}

export function apiError(
  error: string,
  status = 400,
  request?: Request,
  extras?: Record<string, unknown>,
) {
  return NextResponse.json(
    { error, ...extras },
    {
      status,
      headers: corsHeaders(request),
    },
  );
}

export function apiOptions(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}
