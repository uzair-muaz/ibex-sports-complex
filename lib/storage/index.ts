import { promises as fs } from "fs";
import path from "path";

/**
 * Private file storage (payment screenshots). Files are never public: the app
 * gets a short-lived signed link to our own server, which checks it first.
 *
 * Today there is one driver, "local" (a folder on the server's disk). It is
 * used automatically on a developer's computer and can be turned on for a
 * normal server (like the staging VPS) with FILE_STORAGE=local.
 * On Vercel the disk is not kept, so live needs S3 (or similar): add a driver
 * here with the same three functions and pick it with FILE_STORAGE=s3.
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

/** null = no storage set up on this server (uploads answer 503). */
export function getFileStorage(): FileStorage | null {
  const driver = (process.env.FILE_STORAGE || "").trim().toLowerCase();
  const useLocal = driver === "local" || (!driver && process.env.NODE_ENV !== "production");
  if (useLocal) {
    return localStorage(process.env.FILE_STORAGE_DIR || path.join(process.cwd(), ".uploads"));
  }
  return null;
}
