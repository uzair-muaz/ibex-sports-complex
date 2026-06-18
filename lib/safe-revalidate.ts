import { revalidatePath } from "next/cache";

/** No-op when called outside a Next.js request (e.g. tsx scripts). */
export function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // CLI / test scripts have no static generation store
  }
}
