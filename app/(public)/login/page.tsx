"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

function LoginContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/account";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const role = session.user.role;
      if (role === "admin" || role === "super_admin") {
        router.replace("/admin/bookings");
      } else {
        router.replace(callbackUrl.startsWith("/") ? callbackUrl : "/account");
      }
    }
  }, [status, session, router, callbackUrl]);

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      await signIn("google", { callbackUrl });
    } catch {
      setError("Unable to start Google sign-in. Try again.");
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#2DD4BF]" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-8 rounded-3xl border border-white/10 bg-zinc-900/80 p-8 shadow-2xl">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="relative h-14 w-14 overflow-hidden rounded-2xl ring-1 ring-white/10">
          <Image
            src="/logo.png"
            alt="Ibex"
            width={56}
            height={56}
            className="h-full w-full object-cover"
          />
        </div>
        <h1 className="text-2xl font-bold text-white">Sign in to Ibex</h1>
        <p className="text-sm text-zinc-400">
          Track bookings, earn rewards, and manage your membership.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      <Button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="h-12 w-full rounded-xl bg-white text-zinc-900 hover:bg-zinc-100 font-semibold"
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
        Continue with Google
      </Button>

      <p className="text-center text-xs text-zinc-500">
        You can still{" "}
        <Link href="/booking" className="text-[#2DD4BF] hover:underline">
          book a court as a guest
        </Link>
        . Staff?{" "}
        <Link href="/admin" className="text-[#2DD4BF] hover:underline">
          Admin login
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
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
