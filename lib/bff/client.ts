/** Browser → /api/v1 fetch helper (same-origin, cookies included). Client-safe. */
export async function bffFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (body && typeof body === "object" && "error" in body
        ? String((body as { error?: string }).error)
        : null) || `Request failed (${res.status})`,
    );
  }
  return body as T;
}
