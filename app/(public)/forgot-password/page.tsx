"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { forgotPasswordRequest } from "@/lib/tanstack/requests/auth.requests";
import {
  AuthField,
  AuthShell,
  authInputClassName,
  authPrimaryButtonClassName,
} from "@/components/auth/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await forgotPasswordRequest(email.trim().toLowerCase());
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Forgot password"
      description="Enter your email and we'll send a link to set a new password. Works for Google accounts too."
    >
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          Reset link
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          We&apos;ll email you a secure one-hour link
        </p>
      </div>

      {error ? (
        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {done ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#2DD4BF]/30 bg-[#2DD4BF]/10 px-3.5 py-3 text-sm text-[#2DD4BF]">
            If an account exists for that email, we sent a password reset link.
            Check your inbox (and spam).
          </div>
          <Link href="/login" className={authPrimaryButtonClassName}>
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <AuthField label="Email">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              className={authInputClassName}
            />
          </AuthField>
          <button
            type="submit"
            disabled={loading}
            className={authPrimaryButtonClassName}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Send reset link
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-zinc-400">
        <Link href="/login" className="text-[#2DD4BF] hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
