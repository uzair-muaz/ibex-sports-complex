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

export interface Booking {
  _id: string;
  courtId: string;
  date: string; // YYYY-MM-DD
  startTime: number; // Hour (0-23)
  duration: number; // Hours
  userName: string;
  userEmail: string;
  userPhone?: string;
  status: "confirmed" | "cancelled" | "completed";
  totalPrice: number;
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
