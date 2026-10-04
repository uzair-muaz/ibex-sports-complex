"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { resetPasswordRequest } from "@/lib/tanstack/requests/auth.requests";
import {
  AuthField,
  AuthShell,
  authInputClassName,
  authPrimaryButtonClassName,
} from "@/components/auth/AuthShell";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("This reset link is invalid. Request a new one.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetPasswordRequest({ token, newPassword: password });
      setDone(true);
      setTimeout(() => router.replace("/login"), 1500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Reset link is invalid or expired.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Set new password"
      description="Choose a password you can use with email sign-in going forward."
    >
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          New password
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          At least 6 characters
        </p>
      </div>

      {!token ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-300">
            Missing reset token. Request a new link.
          </div>
          <Link href="/forgot-password" className={authPrimaryButtonClassName}>
            Request reset link
          </Link>
        </div>
      ) : done ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#2DD4BF]/30 bg-[#2DD4BF]/10 px-3.5 py-3 text-sm text-[#2DD4BF]">
            Password updated. Redirecting to sign in…
          </div>
          <Link href="/login" className={authPrimaryButtonClassName}>
            Sign in now
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}
          <AuthField label="New password">
            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              className={authInputClassName}
            />
          </AuthField>
          <AuthField label="Confirm password">
            <input
              required
              type="password"
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className={authInputClassName}
            />
          </AuthField>
          <button
            type="submit"
            disabled={loading}
            className={authPrimaryButtonClassName}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save password
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#050505]">
          <Loader2 className="h-8 w-8 animate-spin text-[#2DD4BF]" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
