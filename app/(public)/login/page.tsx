"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { registerCustomerRequest } from "@/lib/tanstack/requests/auth.requests";

type Mode = "signin" | "signup";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53 2.76 0 5.26 1.03 7.14 2.72l3.07-3.07z"
      />
    </svg>
  );
}

function LoginContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/account";
  const initialMode: Mode =
    searchParams.get("mode") === "signup" ? "signup" : "signin";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [error, setError] = useState("");

  const safeCallback = useMemo(
    () => (callbackUrl.startsWith("/") ? callbackUrl : "/account"),
    [callbackUrl],
  );

  const guestHref = useMemo(() => {
    if (safeCallback.startsWith("/booking")) return safeCallback;
    return "/booking";
  }, [safeCallback]);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const role = session.user.role;
      if (role === "admin" || role === "super_admin") {
        router.replace("/admin/bookings");
      } else {
        router.replace(safeCallback);
      }
    }
  }, [status, session, router, safeCallback]);

  const handleGoogle = async () => {
    setLoadingGoogle(true);
    setError("");
    try {
      await signIn("google", { callbackUrl: safeCallback });
    } catch {
      setError("Unable to start Google sign-in. Try again.");
      setLoadingGoogle(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingEmail(true);
    setError("");

    try {
      if (mode === "signup") {
        await registerCustomerRequest({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: phone.trim() || undefined,
        });
      }

      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl: safeCallback,
      });

      if (result?.error) {
        setError(
          mode === "signup"
            ? "Account created, but sign-in failed. Try signing in."
            : "Invalid email or password.",
        );
        setLoadingEmail(false);
        return;
      }

      router.replace(safeCallback);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      setLoadingEmail(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#2DD4BF]" />
      </div>
    );
  }

  const busy = loadingGoogle || loadingEmail;

  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-950/90 shadow-[0_40px_120px_rgba(0,0,0,0.65)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(45,212,191,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(255,255,255,0.04),_transparent_45%)]"
      />
      <div className="relative space-y-8 p-8 sm:p-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative h-16 w-16 overflow-hidden rounded-2xl ring-1 ring-white/15 shadow-lg shadow-teal-500/10">
            <Image
              src="/logo.png"
              alt="Ibex"
              width={64}
              height={64}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2DD4BF]">
              Ibex Sports Complex
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-[1.65rem]">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-sm leading-relaxed text-zinc-400">
              {mode === "signin"
                ? "Sign in to track bookings, earn rewards, and manage membership."
                : "Save your bookings and unlock loyalty rewards in one step."}
            </p>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white font-semibold text-zinc-900 transition hover:bg-zinc-100 disabled:opacity-60"
        >
          {loadingGoogle ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon className="h-5 w-5" />
          )}
          Continue with Google
        </button>

        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
          <div className="h-px flex-1 bg-white/10" />
          <span>or email</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          {mode === "signup" ? (
            <>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Full name
                </span>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="Your name"
                  className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-3.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#2DD4BF]/70 focus:ring-2 focus:ring-[#2DD4BF]/15"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Phone (optional)
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  placeholder="03XXXXXXXXX"
                  className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-3.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#2DD4BF]/70 focus:ring-2 focus:ring-[#2DD4BF]/15"
                />
              </label>
            </>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Email
            </span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-3.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#2DD4BF]/70 focus:ring-2 focus:ring-[#2DD4BF]/15"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Password
            </span>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              minLength={6}
              placeholder={
                mode === "signup" ? "At least 6 characters" : "Your password"
              }
              className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-3.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#2DD4BF]/70 focus:ring-2 focus:ring-[#2DD4BF]/15"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2DD4BF] text-sm font-semibold text-[#0F172A] transition hover:bg-[#14B8A6] disabled:opacity-60"
          >
            {loadingEmail ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {mode === "signin" ? "Sign in with email" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-400">
          {mode === "signin" ? (
            <>
              New here?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                }}
                className="font-medium text-[#2DD4BF] hover:underline"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError("");
                }}
                className="font-medium text-[#2DD4BF] hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </p>

        <div className="space-y-3 border-t border-white/10 pt-6 text-center text-xs text-zinc-500">
          <p>
            Prefer not to sign up?{" "}
            <Link
              href={guestHref}
              className="font-medium text-zinc-300 hover:text-[#2DD4BF] hover:underline"
            >
              Continue as guest
            </Link>
          </p>
          <p>
            Staff?{" "}
            <Link href="/admin" className="text-[#2DD4BF] hover:underline">
              Admin login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-24 sm:py-28 md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(45,212,191,0.12),_transparent_40%),radial-gradient(circle_at_80%_0%,_rgba(255,255,255,0.05),_transparent_35%)]"
      />
      <Suspense
        fallback={
          <Loader2 className="h-8 w-8 animate-spin text-[#2DD4BF]" />
        }
      >
        <LoginContent />
      </Suspense>
    </div>
  );
}
