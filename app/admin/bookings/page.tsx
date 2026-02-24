import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAllBookings } from "@/app/actions/bookings";
import { BookingsPageClient } from "./BookingsPageClient";

export default async function BookingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin");
  }

  const userRole = (session.user as { role?: string }).role;
  const isAdmin = userRole === "admin" || userRole === "super_admin";

  if (!isAdmin) {
    redirect("/admin");
  }

  const result = await getAllBookings();
  const initialBookings = result.success ? result.bookings : [];

  return <BookingsPageClient initialBookings={initialBookings} />;
}
