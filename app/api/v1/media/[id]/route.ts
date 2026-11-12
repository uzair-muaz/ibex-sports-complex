import { readPhoto } from "@/lib/media";

/** Public: an uploaded court or sport photo. A photo never changes, so it can be cached for a year. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const photo = await readPhoto(id);
    if (!photo) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(photo.data), {
      headers: {
        "Content-Type": photo.contentType,
        "Content-Length": String(photo.data.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch (err) {
    console.error("GET /api/v1/media:", err);
    return new Response("Could not load photo", { status: 500 });
  }
}
