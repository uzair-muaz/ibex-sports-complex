import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { optionalApiUser } from "@/lib/api/guard";
import { isStaffRole } from "@/lib/authz";
import { hashToken } from "@/lib/api/create-app-booking";

/**
 * Who may see or pay for a booking from the app: the signed-in customer who
 * owns it, or a guest holding its X-Guest-Token. Returns the owner filter to
 * use in queries, or null (answer 404, so ids can't be probed).
 */
export async function bookingOwnerFilter(
  request: Request,
  bookingId: string,
): Promise<{ filter: Record<string, unknown>; userId: string | null } | null> {
  if (!mongoose.isValidObjectId(bookingId)) return null;
  await connectDB();

  const user = await optionalApiUser(request);
  if (user && !isStaffRole(user.role)) {
    const mine = await Booking.exists({ _id: bookingId, userId: user.id });
    if (mine) return { filter: { userId: user.id }, userId: user.id };
  }

  const token = request.headers.get("x-guest-token")?.trim();
  if (token && token.startsWith("gt_") && token.length <= 100) {
    const filter = { guestAccessTokenHash: hashToken(token) };
    const theirs = await Booking.exists({ _id: bookingId, ...filter });
    if (theirs) return { filter, userId: null };
  }
  return null;
}
