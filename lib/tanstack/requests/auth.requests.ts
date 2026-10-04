import { bffFetch } from "@/lib/bff/client";

export async function registerCustomerRequest(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}) {
  return bffFetch<{
    user: { id: string; email: string; name: string; role: "user" };
  }>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
