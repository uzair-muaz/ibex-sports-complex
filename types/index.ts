export type CourtType = "PADEL" | "CRICKET" | "PICKLEBALL" | "FUTSAL";

export interface Court {
  _id: string;
  name: string;
  type: CourtType;
  image: string;
  description: string;
  pricePerHour: number;
  isActive: boolean;
}

export interface AppliedDiscount {
  discountId: string;
  name: string;
  type: "percentage" | "fixed";
  value: number;
  amountSaved: number;
}

export interface Booking {
  _id: string;
  courtId: string;
  date: string; // YYYY-MM-DD
  startTime: number; // Hour (0-23)
  duration: number; // Hours
  userName: string;
  userEmail: string;
  userPhone?: string;
  status: "pending_payment" | "confirmed" | "cancelled" | "completed";
  originalPrice: number;
  discounts: AppliedDiscount[];
  discountAmount: number;
  totalPrice: number;
  amountPaid: number;
  createdAt: string;
  updatedAt: string;
}

export interface Discount {
  _id: string;
  name: string;
  type: "percentage" | "fixed";
  value: number;
  courtTypes: CourtType[];
  allDay: boolean;
  startHour: number;
  endHour: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TimeSlot {
  hour: number;
  available: boolean;
  courtId?: string;
}

export const OPERATING_HOURS = {
  start: 6, // 6 AM
  end: 23, // 11 PM
};

// Complex opening date - no bookings allowed before this date
export const COMPLEX_OPENING_DATE = new Date(2026, 1, 1); // February 1st, 2026 (month is 0-indexed)

export const GALLERY_IMAGES = [
  {
    url: "/images/paddle.jpg",
    title: "Elite Padel Court",
    category: "Padel",
  },
  {
    url: "/images/cricket.webp",
    title: "Professional Cricket",
    category: "Cricket",
  },
  {
    url: "/images/pickleball.jpg",
    title: "Premium Pickleball",
    category: "Pickleball",
  },
  {
    url: "/images/futsal.jpg",
    title: "Futsal Action",
    category: "Futsal",
  },
  {
    url: "/images/paddle.jpg",
    title: "Padel Excellence",
    category: "Padel",
  },
  {
    url: "/images/cricket.webp",
    title: "Cricket Training",
    category: "Cricket",
  },
];
