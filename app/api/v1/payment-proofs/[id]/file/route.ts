import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import PaymentProof from "@/models/PaymentProof";
import { apiError } from "@/lib/api/response";
import { getFileStorage } from "@/lib/storage";
import { contentTypeFor, verifyFileLink } from "@/lib/payments/proofs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * The screenshot itself. Only works with the signed, short-lived link that
 * the booking / proof list hands out (?exp=&sig=), so files are never public.
 */
export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const url = new URL(request.url);
  const exp = Number(url.searchParams.get("exp"));
  const sig = url.searchParams.get("sig") || "";
  const denied = () => apiError("Link expired or not valid", 403, request, { code: "LINK_INVALID" });

  if (!mongoose.isValidObjectId(id) || !verifyFileLink(id, exp, sig)) return denied();

  await connectDB();
  const proof = await PaymentProof.findById(id).select("fileKey fileType").lean();
  const storage = getFileStorage();
  if (!proof?.fileKey || !proof.fileType || !storage) {
    return apiError("File not found", 404, request, { code: "FILE_NOT_FOUND" });
  }
  const data = await storage.get(proof.fileKey);
  if (!data) return apiError("File not found", 404, request, { code: "FILE_NOT_FOUND" });

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": contentTypeFor(proof.fileType),
      "Content-Length": String(data.length),
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `inline; filename="payment-${id}.${proof.fileType}"`,
    },
  });
}
