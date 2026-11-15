"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReplySupportTicketMutation } from "@/lib/tanstack/hooks/mutations";
import { useMySupportTickets, useVenue } from "@/lib/tanstack/hooks/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GetTheApp } from "@/components/GetTheApp";
import { telHref, waHref } from "@/lib/venue-rules";
import { Loader2, Mail, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";

/** Shown only if the FAQs can't be loaded. The real ones come from /api/v1/content/faqs. */
const FALLBACK_FAQS = [
  {
    question: "How do I pay for a booking?",
    answer: "Send the advance by bank transfer and upload the payment screenshot. Our team checks it and confirms your booking.",
  },
  {
    question: "Need help?",
    answer: "Message us on WhatsApp or call the venue using the buttons below.",
  },
];

type Faq = { question: string; answer: string };

export default function SupportPage() {
  const ticketsQuery = useMySupportTickets();
  const faqsQuery = useQuery({
    queryKey: ["content", "faqs"],
    queryFn: async () => {
      const res = await fetch("/api/v1/content/faqs");
      if (!res.ok) throw new Error("Could not load FAQs");
      return ((await res.json()) as { items: Faq[] }).items;
    },
    staleTime: 5 * 60_000,
  });
  const faqs = faqsQuery.data?.length ? faqsQuery.data : faqsQuery.isError ? FALLBACK_FAQS : [];
  const replyTicket = useReplySupportTicketMutation();
  // Contacts from Admin → App Settings (same as the app's Support screen).
  const venue = useVenue();
  const whatsApp = waHref(venue.whatsApp);
  const tickets = (ticketsQuery.data?.tickets ?? []) as Array<{
    _id: string;
    topic: string;
    status: string;
    messages?: Array<{ authorType: string; body: string }>;
  }>;

  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const onReply = async (ticketId: string) => {
    const body = replyDrafts[ticketId]?.trim();
    if (!body) return;
    try {
      await replyTicket.mutateAsync({ ticketId, message: body });
      setReplyDrafts((d) => ({ ...d, [ticketId]: "" }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  if (ticketsQuery.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#2DD4BF]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">FAQs</h2>
        <ul className="space-y-4">
          {faqs.map((f) => (
            <li key={f.question}>
              <p className="font-medium text-white">{f.question}</p>
              <p className="mt-1 text-sm text-zinc-400">{f.answer}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Contact us</h2>
        <p className="text-sm text-zinc-400">Message or call the venue. We usually reply on WhatsApp within the hour.</p>
        <div className="flex flex-wrap gap-2">
          {whatsApp ? (
            <a href={whatsApp} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2DD4BF] px-4 text-sm font-semibold text-[#0F172A] hover:bg-[#14B8A6]">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          ) : null}
          {venue.phone ? (
            <a href={telHref(venue.phone)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-semibold text-white hover:border-[#2DD4BF]/50">
              <Phone className="h-4 w-4" /> Call {venue.phone}
            </a>
          ) : null}
          {venue.email ? (
            <a href={`mailto:${venue.email}`} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-semibold text-white hover:border-[#2DD4BF]/50">
              <Mail className="h-4 w-4" /> Email
            </a>
          ) : null}
        </div>
        <GetTheApp compact text="Get booking updates, payment alerts and match reminders on your phone." />
      </div>

      {tickets.length === 0 ? null : (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Your earlier tickets</h2>
        {tickets.map((t) => (
            <div
              key={t._id}
              className="rounded-2xl border border-white/10 bg-zinc-950/40 p-5 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-white">{t.topic}</p>
                <span className="text-xs uppercase text-zinc-500">{t.status}</span>
              </div>
              <ul className="space-y-2">
                {t.messages?.map((m, idx: number) => (
                  <li key={idx} className="text-sm">
                    <span className="text-zinc-500">
                      {m.authorType === "admin" ? "Support" : "You"}:{" "}
                    </span>
                    <span className="text-zinc-300">{m.body}</span>
                  </li>
                ))}
              </ul>
              {t.status === "open" ? (
                <div className="flex gap-2">
                  <Input
                    value={replyDrafts[t._id] || ""}
                    onChange={(e) =>
                      setReplyDrafts((d) => ({
                        ...d,
                        [t._id]: e.target.value,
                      }))
                    }
                    placeholder="Reply…"
                    className="bg-zinc-950 border-white/10"
                  />
                  <Button
                    type="button"
                    onClick={() => onReply(t._id)}
                    className="rounded-xl"
                    disabled={replyTicket.isPending}
                  >
                    Send
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
      </div>
      )}
    </div>
  );
}
