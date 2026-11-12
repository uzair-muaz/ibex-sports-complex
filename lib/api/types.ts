export type ApiUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  role: "super_admin" | "admin" | "user";
  phone?: string;
  image?: string | null;
  /** Blocked by the super admin (can't book or use the account). */
  blocked?: boolean;
};
