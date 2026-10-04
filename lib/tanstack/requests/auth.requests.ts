import { bffFetch } from "@/lib/bff/client";

export async function registerCustomerRequest(input: {
  name: string;
  email: string;
  password: string;
  phone: string;
}) {
  return bffFetch<{
    user: { id: string; email: string; name: string; role: "user" };
  }>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function forgotPasswordRequest(email: string) {
  return bffFetch<{ success: true; message: string }>(
    "/api/v1/auth/forgot-password",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
  );
}

export async function resetPasswordRequest(input: {
  token: string;
  newPassword: string;
}) {
  return bffFetch<{ success: true }>("/api/v1/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
