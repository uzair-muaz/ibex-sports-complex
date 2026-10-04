"use client";

import { useEffect, useState } from "react";
import {
  createSupportTicketRequest,
  fetchMySupportTickets,
  replySupportTicketRequest,
} from "@/lib/tanstack/requests/account.requests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const FAQS = [
  {
    q: "How do I pay for a booking?",
    a: "Bookings start as pending payment. Pay the 50% advance as instructed after booking; the venue confirms your slot.",
  },
  {
    q: "How do loyalty points work?",
    a: "You earn 10 points per hour on completed bookings. Redeem 100+ points at checkout (1 pt = PKR 1), up to 50% off.",
  },
  {
    q: "How do memberships work?",
    a: "Buy a package via WhatsApp. Once activated, use membership hours at checkout to cover full slot durations.",
  },
  {
    q: "Can I cancel online?",
    a: "Yes, if the booking is pending/confirmed and starts in 4+ hours. Points or membership hours are refunded.",
  },
];

export default function SupportPage() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const load = async () => {
    try {
      const result = await fetchMySupportTickets();
      setTickets(result.tickets as any[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onCreate = async () => {
    setSubmitting(true);
    try {
      await createSupportTicketRequest({ topic, message });
      setTopic("");
      setMessage("");
      toast.success("Ticket submitted");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const onReply = async (ticketId: string) => {
    const body = replyDrafts[ticketId]?.trim();
    if (!body) return;
    try {
      await replySupportTicketRequest(ticketId, body);
      setReplyDrafts((d) => ({ ...d, [ticketId]: "" }));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  if (loading) {
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
          {FAQS.map((f) => (
            <li key={f.q}>
              <p className="font-medium text-white">{f.q}</p>
              <p className="mt-1 text-sm text-zinc-400">{f.a}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">New ticket</h2>
        <div className="space-y-2">
          <Label htmlFor="topic">Topic</Label>
          <Input
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="bg-zinc-950 border-white/10"
            placeholder="Booking issue, membership, other…"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
          />
        </div>
        <Button
          onClick={onCreate}
          disabled={submitting}
          className="rounded-xl bg-[#2DD4BF] text-[#0F172A] font-semibold"
        >
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Submit
        </Button>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Your tickets</h2>
        {tickets.length === 0 ? (
          <p className="text-sm text-zinc-400">No tickets yet.</p>
        ) : (
          tickets.map((t) => (
            <div
              key={t._id}
              className="rounded-2xl border border-white/10 bg-zinc-950/40 p-5 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-white">{t.topic}</p>
                <span className="text-xs uppercase text-zinc-500">{t.status}</span>
              </div>
              <ul className="space-y-2">
                {t.messages?.map((m: any, idx: number) => (
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
                  >
                    Send
                  </Button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
