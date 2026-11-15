"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import type { PaymentInstructions } from "@/lib/tanstack/hooks/queries";
import { waHref } from "@/lib/venue-rules";

/**
 * Where to send the advance: the venue's bank accounts from Admin → App
 * Settings, with copy buttons. Falls back to WhatsApp when none are saved.
 */
export function BankDetails({
  info,
  reference,
  amount,
}: {
  info: PaymentInstructions | undefined;
  /** "IBX-8821", added to the WhatsApp message. */
  reference: string;
  /** Advance to send, in PKR. */
  amount: number;
}) {
  const copy = (text: string, what: string) => {
    void navigator.clipboard?.writeText(text).then(
      () => toast.success(`${what} copied`),
      () => toast.error("Could not copy"),
    );
  };

  if (!info) {
    return <div className="h-24 animate-pulse rounded-2xl bg-white/5" />;
  }

  const wa = waHref(info.whatsAppNumber);
  const waMessage = encodeURIComponent(
    `Hi IBEX, I've booked ${reference}. Please send me the bank details for the PKR ${amount.toLocaleString()} advance.`,
  );

  if (info.bankAccounts.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
        Message us on WhatsApp for the bank details.{" "}
        {wa ? (
          <a href={`${wa}?text=${waMessage}`} target="_blank" rel="noreferrer" className="text-[#2DD4BF] hover:underline">
            Open WhatsApp
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {info.bankAccounts.map((a, i) => (
        <div key={`${a.accountNumber}-${i}`} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
          <p className="font-semibold text-white">{a.bankName}</p>
          <p className="text-zinc-400">{a.accountTitle}</p>
          <CopyRow label="Account number" value={a.accountNumber} onCopy={() => copy(a.accountNumber, "Account number")} />
          {a.iban ? <CopyRow label="IBAN" value={a.iban} onCopy={() => copy(a.iban!, "IBAN")} /> : null}
        </div>
      ))}
      {info.transferNote ? <p className="text-xs text-zinc-400">{info.transferNote}</p> : null}
    </div>
  );
}

function CopyRow({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div className="mt-2 flex items-center justify-between gap-3">
      <span className="min-w-0">
        <span className="block text-[11px] uppercase tracking-wider text-zinc-500">{label}</span>
        <span className="block break-all font-mono text-white">{value}</span>
      </span>
      <button
        type="button"
        onClick={onCopy}
        aria-label={`Copy ${label}`}
        className="shrink-0 rounded-lg border border-white/10 p-2 text-zinc-300 hover:border-[#2DD4BF]/50 hover:text-white"
      >
        <Copy className="h-4 w-4" />
      </button>
    </div>
  );
}
