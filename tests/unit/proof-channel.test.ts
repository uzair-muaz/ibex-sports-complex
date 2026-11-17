import { describe, expect, it } from "vitest";
import { toMobileProof } from "@/lib/payments/proofs";

const proof = (source: "app" | "web" | "whatsapp") =>
  ({ _id: "6650c0ffee0000000000f031", amount: 2000, status: "submitted", source, fileKey: null }) as never;

describe("payment proof channel", () => {
  it("keeps the old source for the app; website uploads show as app", () => {
    expect(toMobileProof(proof("web")).source).toBe("app");
    expect(toMobileProof(proof("app")).source).toBe("app");
    expect(toMobileProof(proof("whatsapp")).source).toBe("whatsapp");
  });
  it("tells staff where it really came from", () => {
    expect(toMobileProof(proof("web")).channel).toBe("web");
    expect(toMobileProof(proof("app")).channel).toBe("app");
    expect(toMobileProof(proof("whatsapp")).channel).toBe("whatsapp");
  });
});
