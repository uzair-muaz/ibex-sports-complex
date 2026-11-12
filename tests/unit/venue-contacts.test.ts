import { describe, expect, it } from "vitest";
import { DEFAULT_VENUE, isWebLink, mapEmbedUrl, mapLink, telHref, waHref } from "@/lib/venue-rules";
import { resolveAppSettings, validateSettingsPatch } from "@/lib/app-settings";
import { generateBookingConfirmationEmail, type BookingEmailData } from "@/lib/email-templates/booking-confirmation";

describe("venue link helpers", () => {
  it("builds phone and WhatsApp links", () => {
    expect(telHref("+92 325 5429429")).toBe("tel:+923255429429");
    expect(waHref("+92 325-5429429")).toBe("https://wa.me/923255429429");
    expect(waHref("123")).toBeNull();
  });

  it("keeps the original map until the pin moves", () => {
    expect(mapEmbedUrl(DEFAULT_VENUE)).toContain("Ibex%20Sports%20Complex");
    expect(mapEmbedUrl({ latitude: 33.6, longitude: 73.1 })).toBe("https://maps.google.com/maps?q=33.6,73.1&z=16&output=embed");
    expect(mapLink({ mapUrl: null, latitude: 33.6, longitude: 73.1 })).toContain("query=33.6,73.1");
    expect(mapLink(DEFAULT_VENUE)).toBe(DEFAULT_VENUE.mapUrl);
  });

  it("only accepts web links", () => {
    expect(isWebLink("https://instagram.com/ibex")).toBe(true);
    expect(isWebLink("javascript:alert(1)")).toBe(false);
    expect(isWebLink("instagram.com")).toBe(false);
  });
});

describe("venue settings", () => {
  it("uses today's links when nothing is saved, and hides cleared ones", () => {
    expect(resolveAppSettings(null).venue.instagramUrl).toBe(DEFAULT_VENUE.instagramUrl);
    const v = resolveAppSettings({ venue: { instagramUrl: null, facebookUrl: "", phone: "+92 300 1234567" } }).venue;
    expect(v.instagramUrl).toBeNull();
    expect(v.facebookUrl).toBeNull();
    expect(v.phone).toBe("+92 300 1234567");
    expect(v.email).toBe(DEFAULT_VENUE.email);
  });

  it("checks links the admin saves", () => {
    expect(validateSettingsPatch({ venue: { instagramUrl: "javascript:alert(1)" } }).ok).toBe(false);
    expect(validateSettingsPatch({ venue: { facebookUrl: null, mapUrl: "https://maps.app.goo.gl/x" } }).ok).toBe(true);
  });
});

describe("booking email footer", () => {
  const base = {
    userName: "A", userEmail: "a@example.com", courtName: "Padel Court 1", date: "2027-01-07", startTime: 3, duration: 1,
    totalPrice: 1000, bookingId: "IBX-1", entryVerificationUrl: "x", feedbackUrl: "y", entryQRCode: "q", feedbackQRCode: "r",
  } satisfies BookingEmailData;

  it("uses App Settings contacts, or today's if missing", () => {
    expect(generateBookingConfirmationEmail(base)).toContain(DEFAULT_VENUE.email);
    const html = generateBookingConfirmationEmail({ ...base, contact: { email: "hi@ibex.pk", phone: "+92 300 1234567" } });
    expect(html).toContain("mailto:hi@ibex.pk");
    expect(html).toContain("tel:+923001234567");
    expect(html).not.toContain(DEFAULT_VENUE.email);
  });
});
