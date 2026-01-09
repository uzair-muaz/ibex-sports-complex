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
    // Temporary: using food image everywhere
    url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=90&auto=format&fit=crop",
    title: "Elite Padel Court",
    category: "Padel",
  },
  {
    url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=90&auto=format&fit=crop",
    title: "Professional Cricket",
    category: "Cricket",
  },
  {
    url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=90&auto=format&fit=crop",
    title: "Premium Pickleball",
    category: "Pickleball",
  },
  {
    url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=90&auto=format&fit=crop",
    title: "Padel Action",
    category: "Padel",
  },
  {
    url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=90&auto=format&fit=crop",
    title: "Cricket Training",
    category: "Cricket",
  },
  {
    url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=90&auto=format&fit=crop",
    title: "Pickleball Excellence",
    category: "Pickleball",
  },
];
