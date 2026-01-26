"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { authService } from "@/lib/auth-client";

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
  const pathname = usePathname();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
  });

  useEffect(() => {
    if (status === "authenticated" && session?.user && pathname === "/admin") {
      const userRole = (session.user as { role?: string })?.role;
      if (userRole === "super_admin") {
        router.replace("/admin/analytics");
      } else if (userRole === "admin") {
        router.replace("/admin/bookings");
      }
    }
  }, [status, session, pathname, router]);

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const result = await authService.login(values);

      if (!result.success) {
        form.setError("root", {
          type: "manual",
          message: result.error || "Login failed",
        });
        return;
      }

      // If login was successful, redirect
      if (result.success) {
        // Wait a moment for session cookie to be fully set
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // If we have session with role, redirect based on role
        if (result.user?.role && result.user.role !== 'user') {
          const userRole = result.user.role;
          if (userRole === "super_admin") {
            router.replace('/admin/analytics');
          } else {
            router.replace('/admin/bookings');
          }
        } else {
          // Default redirect - proxy will handle role-based redirect
          router.replace('/admin/bookings');
        }
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
                      <Input
                        type="password"
                        placeholder="Password"
                        className="bg-zinc-900 border-zinc-800"
                        {...field}
                      />
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
    </div>
  );
}
