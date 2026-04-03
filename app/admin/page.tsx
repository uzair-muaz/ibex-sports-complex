"use client";

import React, { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Lock, Loader2, Home, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur", // Validate on blur for better UX
  });

  useEffect(() => {
    // Redirect based on user role if already logged in
    if (session?.user) {
      const userRole = session.user.role;
      if (userRole === "super_admin") {
        router.push("/admin/analytics");
      } else {
        router.push("/admin/bookings");
      }
    }
  }, [session, router]);

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        // NextAuth will surface invalid credentials as "CredentialsSignin".
        const friendlyMessage =
          result.error === "CredentialsSignin" ? "Invalid email or password" : result.error;

        // Set form-level error
        form.setError("root", {
          type: "manual",
          message: friendlyMessage,
        });
      } else if (result?.ok) {
        // Session will be updated by useSession hook
        // The useEffect above will handle the redirect based on role
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Login failed";
      form.setError("root", {
        type: "manual",
        message: errorMessage,
      });
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-black px-4">
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {form.formState.errors.root && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                  {form.formState.errors.root.message}
                </div>
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-200">Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="admin@ibex.com"
                        className="bg-zinc-900 border-zinc-800"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-200">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          className="bg-zinc-900 border-zinc-800 pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors p-1 rounded"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6]"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <div className="w-full max-w-sm mt-4">
        <Link href="/" className="block">
          <Button
            variant="ghost"
            className="w-full text-zinc-200 hover:text-white hover:bg-zinc-800 justify-center"
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
