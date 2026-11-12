import { describe, expect, it } from "vitest";
import { BLOCKED_CODE, cleanBlockReason, phoneVariants } from "@/lib/customer-block-rules";
import { apiError } from "@/lib/api/response";
import { BLOCKED_MESSAGE } from "@/lib/customer-block-rules";
import { getOpenApiDocument } from "@/lib/api/openapi";

describe("blocking customers", () => {
  it("needs a short reason", () => {
    expect(cleanBlockReason(" No-shows ")).toBe("No-shows");
    expect(cleanBlockReason("x")).toBeNull();
    expect(cleanBlockReason("x".repeat(301))).toBeNull();
    expect(cleanBlockReason(5)).toBeNull();
  });

  it("matches a phone however it was saved", () => {
    expect(phoneVariants("0300-1234567")).toEqual(["+923001234567", "03001234567", "923001234567"]);
    expect(phoneVariants("+92 300 1234567")).toEqual(["+923001234567", "03001234567", "923001234567"]);
    expect(phoneVariants("12345")).toEqual([]);
  });

  it("blocked answer is 403 with a clear code", async () => {
    const res = apiError(BLOCKED_MESSAGE, 403, new Request("http://localhost/api/v1/auth/login"), { code: BLOCKED_CODE });
    expect(res.status).toBe(403);
    expect(JSON.stringify(await res.json())).toContain(BLOCKED_CODE);
  });

  it("is in the docs", () => {
    expect(Object.keys((getOpenApiDocument() as { paths: Record<string, unknown> }).paths)).toContain("/api/v1/admin/customers/{id}/block");
  });
});
