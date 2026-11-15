"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import type { MobileBooking } from "@/lib/api/booking-view";
import { BankDetails } from "@/components/booking/BankDetails";
import { StatusPill } from "@/components/account/StatusPill";
import { usePaymentInstructions } from "@/lib/tanstack/hooks/queries";
import { useUploadPaymentProofMutation } from "@/lib/tanstack/hooks/mutations";
import { PAYMENT_STATUS_LABEL, canUploadProof } from "@/lib/web-booking-labels";

const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString()}`;

const PROOF_STATUS: Record<string, { label: string; tone: "blue" | "green" | "red" }> = {
  submitted: { label: "Under review", tone: "blue" },
  verified: { label: "Verified", tone: "green" },
  rejected: { label: "Not accepted", tone: "red" },
};

/**
 * Booking page: what is paid, what is left, and (while waiting for the
 * advance) the bank details and the screenshot upload. Same rules as the app.
 */
export function PaymentPanel({ booking }: { booking: MobileBooking }) {
  const p = booking.payment;
  const status = PAYMENT_STATUS_LABEL[p.status];
  const showUpload = canUploadProof(booking);
  const info = usePaymentInstructions({ enabled: showUpload });
  // What is still owed of the advance (wallet credit already counts towards it).
  const advanceLeft = Math.max(0, p.advanceRequired - p.amountVerified - p.walletCreditUsed);

  if (booking.status === "cancelled") return null;

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-white">Payment</h3>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </div>
      <p className="text-sm text-zinc-400">{status.hint}</p>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Amount label="Booking total" value={pkr(booking.price.total)} />
        <Amount label="Advance needed" value={pkr(p.advanceRequired)} />
        <Amount label="Paid so far" value={pkr(p.amountVerified + p.walletCreditUsed)} />
        <Amount label="Still to pay" value={pkr(p.balanceDue)} highlight={p.balanceDue > 0} />
      </dl>

      {showUpload ? (
        <div className="space-y-4 border-t border-white/10 pt-4">
          <p className="text-sm text-zinc-200">
            Send <span className="font-semibold text-white">{pkr(advanceLeft || p.balanceDue)}</span> or more to one of
            these accounts, then upload the screenshot.
          </p>
          <BankDetails info={info.data} reference={booking.reference} amount={advanceLeft || p.balanceDue} />
          <UploadForm bookingId={booking.id} suggested={advanceLeft || p.balanceDue} max={p.balanceDue} maxMb={info.data?.maxFileSizeMb ?? 5} />
        </div>
      ) : null}

      {p.proofs.length > 0 ? (
        <div className="space-y-2 border-t border-white/10 pt-4">
          <h4 className="text-sm font-semibold text-white">Your screenshots</h4>
          <ul className="space-y-2">
            {[...p.proofs].reverse().map((proof) => {
              const s = PROOF_STATUS[proof.status] ?? PROOF_STATUS.submitted;
              return (
                <li key={proof.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm">
                  <span className="text-zinc-300">
                    {pkr(proof.verifiedAmount ?? proof.amount)}
                    {proof.submittedAt ? (
                      <span className="text-zinc-500"> · {new Date(proof.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                    ) : null}
                    {proof.status === "rejected" && proof.rejectionReason ? (
                      <span className="block text-xs text-red-300">Reason: {proof.rejectionReason}</span>
                    ) : null}
                  </span>
                  <StatusPill tone={s.tone}>{s.label}</StatusPill>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function Amount({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl bg-white/5 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</dt>
      <dd className={highlight ? "font-semibold text-amber-300" : "font-semibold text-white"}>{value}</dd>
    </div>
  );
}

function UploadForm({ bookingId, suggested, max, maxMb }: { bookingId: string; suggested: number; max: number; maxMb: number }) {
  const upload = useUploadPaymentProofMutation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [amount, setAmount] = useState(String(suggested));
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    const n = Number(amount);
    if (!file) return setError("Choose the screenshot of your transfer.");
    if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) {
      return setError("The screenshot must be a JPG, PNG or PDF.");
    }
    if (file.size > maxMb * 1024 * 1024) return setError(`The file must be ${maxMb} MB or smaller.`);
    if (!Number.isFinite(n) || n <= 0) return setError("Enter the amount you sent (PKR).");
    if (n > max) return setError(`That is more than the ${pkr(max)} still to pay.`);
    try {
      await upload.mutateAsync({ bookingId, file, amount: Math.round(n), transferReference: reference.trim() || undefined });
      toast.success("Screenshot sent. We'll confirm your booking once it's checked.");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the screenshot.");
    }
  };

  const field =
    "w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2.5 text-white placeholder:text-zinc-500 outline-none focus:border-[#2DD4BF]/70";

  return (
    <div className="space-y-3 rounded-2xl border border-[#2DD4BF]/25 bg-[#2DD4BF]/5 p-4">
      <h4 className="text-sm font-semibold text-white">Upload payment screenshot</h4>
      <label className="block space-y-1 text-sm">
        <span className="text-zinc-400">Screenshot (JPG, PNG or PDF, up to {maxMb} MB)</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Amount you sent (PKR)</span>
          <input type="number" inputMode="numeric" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} className={field} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Transfer reference (optional)</span>
          <input type="text" maxLength={60} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. TID 123456" className={field} />
        </label>
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="button"
        onClick={submit}
        disabled={upload.isPending}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2DD4BF] px-5 text-sm font-semibold text-[#0F172A] hover:bg-[#14B8A6] disabled:opacity-60"
      >
        {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Send screenshot
      </button>
    </div>
  );
}
