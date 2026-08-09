export type AdminFeedback = {
  _id: string;
  userName: string;
  userEmail: string;
  rating: number;
  courtType?: string;
  comment?: string;
  createdAt: string;
  bookingId: string | { _id?: string };
};
