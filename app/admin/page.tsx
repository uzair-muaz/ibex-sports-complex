"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { App, Button, Card, Form, Input, Spin, Typography } from "antd";
import { HomeOutlined, LockOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

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
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4">
      <Card className="w-full max-w-sm border-zinc-800" styles={{ body: { paddingTop: 8 } }}>
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#2DD4BF]">
            <LockOutlined className="text-xl text-[#0F172A]" />
          </div>
          <Title level={3} className="!mb-1 !text-white">
            Admin Access
          </Title>
          <Text type="secondary">Sign in to manage court bookings</Text>
        </div>

        <Form<LoginFormValues>
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Please enter a valid email address" },
            ]}
          >
            <Input placeholder="admin@ibex.com" size="large" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: "Password is required" },
              { min: 6, message: "Password must be at least 6 characters" },
            ]}
          >
            <Input.Password placeholder="Password" size="large" />
          </Form.Item>

          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={submitting}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Link href="/" className="mt-4 block w-full max-w-sm">
        <Button block icon={<HomeOutlined />} size="large">
          Go to Home
        </Button>
      </Link>
    </div>
  );
}

export default function AdminPage() {
  return <AdminLoginForm />;
}
