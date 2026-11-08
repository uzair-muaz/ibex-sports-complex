import mongoose, { Schema, Document, Model } from "mongoose";
import { MEDIA_KINDS, type MediaKind } from "@/lib/media-rules";

/**
 * A photo uploaded by the super admin (court or sport photo), kept in the
 * database so it works on any server without extra file storage.
 * Never changed after upload: a new photo gets a new id (and a new link).
 */
export interface IMediaFile extends Document {
  kind: MediaKind;
  contentType: string;
  size: number;
  data: Buffer;
  uploadedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
}

const MediaFileSchema = new Schema(
  {
    kind: { type: String, enum: MEDIA_KINDS, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const MediaFile: Model<IMediaFile> =
  mongoose.models.MediaFile || mongoose.model<IMediaFile>("MediaFile", MediaFileSchema);

export default MediaFile;
