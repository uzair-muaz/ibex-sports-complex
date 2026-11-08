/** Save and read uploaded photos. Server-only. */
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import MediaFile from "@/models/MediaFile";
import { checkPhoto, detectPhotoType, mediaIdFromUrl, mediaUrl, photoContentType, MEDIA_KINDS, type MediaKind } from "@/lib/media-rules";

type Fail = { ok: false; status: number; code: string; error: string };

export async function savePhoto(params: {
  file: FormDataEntryValue | null;
  kind: unknown;
  uploadedBy: string;
}): Promise<{ ok: true; id: string; url: string } | Fail> {
  const bad = (error: string): Fail => ({ ok: false, status: 400, code: "INVALID_FILE", error });
  const kind = MEDIA_KINDS.includes(params.kind as MediaKind) ? (params.kind as MediaKind) : null;
  if (!kind) return { ok: false, status: 400, code: "VALIDATION_ERROR", error: "kind must be court_photo or sport_photo." };
  const file = params.file;
  if (!file || typeof file === "string") return bad("Please choose a photo (JPG, PNG or WebP).");
  const sizeError = checkPhoto(file.size);
  if (sizeError) return bad(sizeError);
  const data = Buffer.from(await file.arrayBuffer());
  const type = detectPhotoType(data);
  if (!type) return bad("Only JPG, PNG or WebP photos are accepted.");

  await connectDB();
  const doc = await MediaFile.create({
    kind,
    contentType: photoContentType(type),
    size: data.length,
    data,
    uploadedBy: mongoose.isValidObjectId(params.uploadedBy) ? params.uploadedBy : null,
  });
  return { ok: true, id: doc._id.toString(), url: mediaUrl(doc._id.toString()) };
}

export async function readPhoto(id: string): Promise<{ data: Buffer; contentType: string } | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDB();
  const doc = await MediaFile.findById(id).select("data contentType").lean();
  if (!doc) return null;
  const raw = doc.data as unknown as Buffer | { buffer: ArrayBuffer };
  const data = Buffer.isBuffer(raw) ? raw : Buffer.from((raw as { buffer: ArrayBuffer }).buffer);
  return { data, contentType: doc.contentType };
}

/**
 * After a court or sport photo is replaced or removed: delete uploaded photos
 * (our /api/v1/media/... links) that no court and no sport uses any more.
 * Never throws: a failed clean-up must not break the save.
 */
export async function deleteUnusedPhotos(urls: Array<string | null | undefined>): Promise<void> {
  try {
    const ids = [...new Set(urls.map((u) => mediaIdFromUrl(u)).filter((id): id is string => Boolean(id)))];
    if (!ids.length) return;
    await connectDB();
    const [{ default: Court }, { default: AppSettings }] = await Promise.all([
      import("@/models/Court"),
      import("@/models/AppSettings"),
    ]);
    for (const id of ids) {
      const link = new RegExp(`/api/v1/media/${id}$`);
      const [courts, sports] = await Promise.all([
        Court.countDocuments({ image: link }),
        AppSettings.countDocuments({ "sports.imageUrl": link }),
      ]);
      if (courts === 0 && sports === 0) await MediaFile.deleteOne({ _id: id });
    }
  } catch (err) {
    console.error("[media] clean-up failed:", err);
  }
}
