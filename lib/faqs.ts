import { getAppSettings, type Faq, type ResolvedAppSettings } from "@/lib/app-settings";

/**
 * Support FAQs for the app and website. The super admin can write their own
 * (Admin → App Settings → FAQs); until then these built-in ones are used.
 * They are written from the current settings, so the numbers stay right.
 */
export function defaultFaqs(s: ResolvedAppSettings): Faq[] {
  const l = s.loyalty;
  const hours = Math.round((s.cancellationNoticeMinutes / 60) * 10) / 10;
  const earn =
    l.earnBasis === "per_hour"
      ? `${l.earnPoints} points for every hour you play`
      : `${l.earnPoints} points for every PKR ${l.earnPerPkr.toLocaleString("en-PK")} you pay`;
  return [
    {
      question: "How do I pay for a booking?",
      answer: `Your booking is reserved straight away. Send at least ${s.payments.minAdvancePercent}% as an advance by bank transfer, then upload the payment screenshot in the app. Our team checks it by hand and confirms your booking. Pay the rest at the venue.`,
    },
    {
      question: "How do reward points work?",
      answer: `You earn ${earn}, added after your match. Use them at checkout from ${l.minRedeemPoints} points (1 point = PKR ${l.pkrPerPoint}), for up to ${l.maxRedeemPercent}% of the court fee.`,
    },
    {
      question: "How does membership work?",
      answer: "Plans give you hours for each sport. Buy a plan on WhatsApp and we activate it. At checkout, choose to use your hours: if you don't have enough, the hours you have are used and you pay the rest.",
    },
    {
      question: "Can I cancel a booking?",
      answer: `Yes, in the app until ${hours} hours before the start. Money you paid goes to your IBEX wallet, and points and membership hours come back.`,
    },
    {
      question: "What is the IBEX wallet?",
      answer: "Money from cancelled bookings is kept in your wallet. It never expires and you can use it on your next booking. To get it back to your bank, ask our team.",
    },
  ];
}

export async function listFaqs(): Promise<Faq[]> {
  const settings = await getAppSettings();
  return settings.faqs ?? defaultFaqs(settings);
}
