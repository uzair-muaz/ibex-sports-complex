import { NextResponse } from "next/server";
import { getCourts } from "@/app/actions/courts";

// API route for SWR to fetch prices client-side
export async function GET() {
  try {
    const result = await getCourts();

    if (result.success) {
      return NextResponse.json(result.courts, {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=899",
        },
      });
    }

    return NextResponse.json(
      { error: result.error || "Failed to fetch courts" },
      { status: 500 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
