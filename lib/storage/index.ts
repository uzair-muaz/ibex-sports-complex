import { promises as fs } from "fs";
import path from "path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * Private file storage (payment screenshots). Files are never public: the app
 * gets a short-lived signed link to our own server, which checks it first.
 *
 * Two drivers:
 * - "local": a folder on the server's disk. Used automatically on a developer's
 *   computer, or on a normal server (like the staging VPS) with FILE_STORAGE=local.
 * - "s3": a private AWS S3 bucket. Needed on Vercel, where the disk is not kept.
 *   Turn on with FILE_STORAGE=s3 plus S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID and
 *   S3_SECRET_ACCESS_KEY. The bucket must block all public access.
 */
export interface FileStorage {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  remove(key: string): Promise<void>;
}

function safeKey(key: string): string {
  if (!/^[a-zA-Z0-9/_.-]{1,200}$/.test(key) || key.includes("..")) {
    throw new Error("Invalid file key");
  }
  return key;
}

function localStorage(root: string): FileStorage {
  const full = (key: string) => path.join(root, safeKey(key));
  return {
    async put(key, data) {
      const file = full(key);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, data, { mode: 0o600 });
    },
    async get(key) {
      try {
        return await fs.readFile(full(key));
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw err;
      }
    },
    async remove(key) {
      await fs.rm(full(key), { force: true });
    },
  };
}

function s3Storage(bucket: string, region: string, accessKeyId: string, secretAccessKey: string): FileStorage {
  const client = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
  return {
    async put(key, data, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: safeKey(key),
          Body: data,
          ContentType: contentType,
          ServerSideEncryption: "AES256",
        }),
      );
    },
    async get(key) {
      try {
        const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: safeKey(key) }));
        if (!res.Body) return null;
        return Buffer.from(await res.Body.transformToByteArray());
      } catch (err) {
        if (err instanceof NoSuchKey || (err as { name?: string }).name === "NoSuchKey") return null;
        throw err;
      }
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: safeKey(key) }));
    },
  };
}

let cachedS3: { sig: string; storage: FileStorage } | null = null;

/** null = no storage set up on this server (uploads answer 503). */
export function getFileStorage(): FileStorage | null {
  const driver = (process.env.FILE_STORAGE || "").trim().toLowerCase();
  const useLocal = driver === "local" || (!driver && process.env.NODE_ENV !== "production");
  if (useLocal) {
    return localStorage(process.env.FILE_STORAGE_DIR || path.join(process.cwd(), ".uploads"));
  }
  if (driver === "s3") {
    const bucket = (process.env.S3_BUCKET || "").trim();
    const region = (process.env.S3_REGION || "").trim();
    const id = (process.env.S3_ACCESS_KEY_ID || "").trim();
    const secret = (process.env.S3_SECRET_ACCESS_KEY || "").trim();
    if (!bucket || !region || !id || !secret) {
      console.error("FILE_STORAGE=s3 but S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID or S3_SECRET_ACCESS_KEY is missing.");
      return null;
    }
    const sig = `${bucket}|${region}|${id}`;
    if (cachedS3?.sig !== sig) cachedS3 = { sig, storage: s3Storage(bucket, region, id, secret) };
    return cachedS3.storage;
  }
  return null;
}
