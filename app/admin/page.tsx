"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { App, Button, Form, Input, Spin, theme } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";

type LoginFormValues = {
  email: string;
  password: string;
};

function AdminLoginForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [form] = Form.useForm<LoginFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const { message } = App.useApp();
  const { token } = theme.useToken();

  useEffect(() => {
    if (session?.user) {
      const userRole = session.user.role;
      if (userRole === "super_admin") {
        router.push("/admin/analytics");
      } else {
        router.push("/admin/bookings");
      }
    }
  }, [session, router]);

  const onFinish = async (values: LoginFormValues) => {
    setSubmitting(true);
    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        const friendlyMessage =
          result.error === "CredentialsSignin"
            ? "Invalid email or password"
            : result.error;
        message.error(friendlyMessage);
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading" || session) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: token.colorBgBase }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-screen overflow-hidden"
      style={{ background: token.colorBgBase, color: token.colorText }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 50% 40% at 15% 20%, ${token.colorPrimary}22, transparent),
            radial-gradient(ellipse 40% 35% at 85% 80%, ${token.colorPrimary}14, transparent)
          `,
        }}
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col lg:flex-row">
        {/* Brand panel */}
        <aside className="flex flex-1 flex-col justify-between px-8 py-10 sm:px-12 lg:py-14">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm transition-opacity hover:opacity-80"
            style={{ color: token.colorTextSecondary }}
          >
            <ArrowLeftOutlined />
            Back to site
          </Link>

          <div className="my-16 max-w-md lg:my-0">
            <div className="mb-6 flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="IBEX"
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover"
                priority
              />
              <div>
                <p
                  className="text-lg font-semibold tracking-tight"
                  style={{ color: token.colorText }}
                >
                  IBEX Sports Complex
                </p>
                <p
                  className="text-xs uppercase tracking-[0.18em]"
                  style={{ color: token.colorPrimary }}
                >
                  Operations
                </p>
              </div>
            </div>
            <h1
              className="text-4xl font-semibold tracking-tight sm:text-5xl"
              style={{ color: token.colorText }}
            >
              Staff console
            </h1>
            <p
              className="mt-4 max-w-sm text-base leading-relaxed"
              style={{ color: token.colorTextSecondary }}
            >
              Manage bookings, courts, memberships, and support from one place.
            </p>
          </div>

          <p className="hidden text-xs lg:block" style={{ color: token.colorTextSecondary }}>
            Authorized staff only
          </p>
        </aside>

        {/* Form panel */}
        <main className="flex flex-1 items-center justify-center px-6 pb-16 lg:px-12 lg:pb-0">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h2
                className="text-2xl font-semibold tracking-tight"
                style={{ color: token.colorText }}
              >
                Sign in
              </h2>
              <p
                className="mt-2 text-sm"
                style={{ color: token.colorTextSecondary }}
              >
                Use your staff email and password
              </p>
            </div>

            <Form<LoginFormValues>
              form={form}
              layout="vertical"
              onFinish={onFinish}
              requiredMark={false}
              size="large"
            >
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: "Email is required" },
                  {
                    type: "email",
                    message: "Please enter a valid email address",
                  },
                ]}
              >
                <Input
                  placeholder="admin@ibex.com"
                  autoComplete="email"
                  variant="filled"
                />
              </Form.Item>

              <Form.Item
                label="Password"
                name="password"
                rules={[
                  { required: true, message: "Password is required" },
                  { min: 6, message: "Password must be at least 6 characters" },
                ]}
              >
                <Input.Password
                  placeholder="Password"
                  autoComplete="current-password"
                  variant="filled"
                />
              </Form.Item>

              <Form.Item className="mb-0 pt-1">
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={submitting}
                  className="!h-11 !font-semibold"
                >
                  Continue
                </Button>
              </Form.Item>
            </Form>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return <AdminLoginForm />;
}
