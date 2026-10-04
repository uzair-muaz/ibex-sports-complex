export type ApiUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  role: "super_admin" | "admin" | "user";
  phone?: string;
  image?: string | null;
};
