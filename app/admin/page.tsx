"use client";

import React, { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    // Redirect based on user role if already logged in
    if (session) {
      const userRole = (session.user as any)?.role;
      if (userRole === "super_admin") {
        router.push("/admin/analytics");
      } else {
        router.push("/admin/bookings");
      }
      setIsLoggingIn(false);
    }
  }, [session, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setLoginError(result.error);
        setIsLoggingIn(false);
      } else if (result?.ok) {
        // Session will be updated by useSession hook
        // The useEffect above will handle the redirect based on role
        // Keep loading state until redirect happens
      }
    } catch (error: any) {
      setLoginError(error.message || "Login failed");
      setIsLoggingIn(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-12 w-12 animate-spin text-[#2DD4BF]" />
      </div>
    );
  }

  if (session) {
    // Show loading while redirecting
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-12 w-12 animate-spin text-[#2DD4BF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <Card className="w-full max-w-sm border-zinc-800 bg-zinc-950">
        <CardHeader>
          <div className="text-center">
            <div className="w-12 h-12 bg-white rounded-full mx-auto flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-[#0F172A]" />
            </div>
            <CardTitle className="text-3xl text-white">
              Admin Access
            </CardTitle>
            <CardDescription className="mt-2 text-zinc-400">
              Sign in to manage court bookings
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-zinc-200 text-sm">
                {loginError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-200">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ibex.com"
                required
                className="bg-zinc-900 border-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-200">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="bg-zinc-900 border-zinc-800"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6]"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
