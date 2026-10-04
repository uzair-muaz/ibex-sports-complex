"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Layout,
  Menu,
  Button,
  Typography,
  theme,
  Tooltip,
  Space,
} from "antd";
import {
  BarChartOutlined,
  CalendarOutlined,
  TagOutlined,
  MessageOutlined,
  AppstoreOutlined,
  TeamOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReloadOutlined,
  LogoutOutlined,
  CustomerServiceOutlined,
  GiftOutlined,
  BulbOutlined,
  BulbFilled,
} from "@ant-design/icons";
import { useAdminTheme } from "@/components/admin/AdminAntdProvider";
import { isSuperAdminRole } from "@/lib/authz";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
  actionButton?: React.ReactNode;
}

export function AdminLayout({
  children,
  title,
  description,
  onRefresh,
  isLoading = false,
  actionButton,
}: AdminLayoutProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { token } = theme.useToken();
  const { mode, toggleMode } = useAdminTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const userRole = session?.user?.role;
  const isSuperAdmin = isSuperAdminRole(userRole);

  const menuItems = useMemo(() => {
    const items = [];
    if (isSuperAdmin) {
      items.push({
        key: "/admin/analytics",
        icon: <BarChartOutlined />,
        label: "Analytics",
      });
    }
    items.push(
      {
        key: "/admin/bookings",
        icon: <CalendarOutlined />,
        label: "Bookings",
      },
      {
        key: "/admin/discounts",
        icon: <TagOutlined />,
        label: "Discounts",
      },
      {
        key: "/admin/feedback",
        icon: <MessageOutlined />,
        label: "Feedback",
      },
      {
        key: "/admin/support",
        icon: <CustomerServiceOutlined />,
        label: "Support",
      },
      {
        key: "/admin/memberships",
        icon: <GiftOutlined />,
        label: "Memberships",
      },
    );
    if (isSuperAdmin) {
      items.push(
        {
          key: "/admin/courts",
          icon: <AppstoreOutlined />,
          label: "Courts",
        },
        {
          key: "/admin/users",
          icon: <TeamOutlined />,
          label: "Users",
        },
      );
    }
    return items;
  }, [isSuperAdmin]);

  const selectedKey =
    menuItems.find(
      (item) =>
        pathname === item.key || pathname.startsWith(`${item.key}/`),
    )?.key ?? pathname;

  const handleNavigate = (path: string) => {
    router.push(path);
    setMobileOpen(false);
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div
        className="flex items-center gap-3 px-4 py-5"
        style={{ borderBottom: `1px solid ${token.colorBorderSecondary}` }}
      >
        <Image
          src="/logo.png"
          alt="IBEX"
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-full object-cover"
        />
        {!collapsed && (
          <div className="min-w-0">
            <div
              className="truncate text-sm font-semibold tracking-tight"
              style={{ color: token.colorText }}
            >
              IBEX Admin
            </div>
            <Text type="secondary" className="text-[11px]">
              {isSuperAdmin ? "Super admin" : "Staff"}
            </Text>
          </div>
        )}
      </div>

      <Menu
        theme={mode === "dark" ? "dark" : "light"}
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={({ key }) => handleNavigate(key)}
        className="flex-1 border-none !px-2 !py-3"
        style={{ background: "transparent" }}
      />

      <div
        className="space-y-2 p-3"
        style={{ borderTop: `1px solid ${token.colorBorderSecondary}` }}
      >
        {!collapsed && (
          <div
            className="rounded-xl px-3 py-2.5"
            style={{ background: token.colorFillQuaternary }}
          >
            <Text type="secondary" className="text-[11px]">
              Signed in
            </Text>
            <div
              className="truncate text-sm font-medium"
              style={{ color: token.colorText }}
            >
              {session?.user?.name || session?.user?.email}
            </div>
          </div>
        )}
        <Button
          type="text"
          icon={<LogoutOutlined />}
          onClick={() => signOut({ callbackUrl: "/admin" })}
          block
          className="!justify-start"
          style={{ color: token.colorTextSecondary }}
        >
          {!collapsed && "Sign out"}
        </Button>
      </div>
    </div>
  );

  return (
    <Layout className="min-h-screen" style={{ background: token.colorBgBase }}>
      <Sider
        width={248}
        collapsed={collapsed}
        collapsedWidth={72}
        breakpoint="lg"
        onBreakpoint={(broken) => {
          if (broken) setCollapsed(true);
        }}
        className="!fixed !bottom-0 !left-0 !top-0 !z-50 hidden lg:!block"
        style={{
          background: token.colorBgContainer,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        {sidebar}
      </Sider>

      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="Close sidebar"
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: "rgba(0,0,0,0.45)" }}
            onClick={() => setMobileOpen(false)}
          />
          <Sider
            width={280}
            className="!fixed !bottom-0 !left-0 !top-0 !z-50 lg:!hidden"
            style={{
              background: token.colorBgContainer,
              borderRight: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            {sidebar}
          </Sider>
        </>
      )}

      <Layout style={{ background: token.colorBgBase }}>
        <div
          className={`flex min-h-screen flex-col transition-all duration-300 ${collapsed ? "lg:ml-[72px]" : "lg:ml-[248px]"}`}
        >
          <Header
            className="!sticky !top-0 z-30 flex !h-auto items-center justify-between !px-4 !py-3.5 sm:!px-6"
            style={{
              background: `${token.colorBgContainer}cc`,
              backdropFilter: "blur(12px)",
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
              lineHeight: "normal",
            }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <Button
                type="text"
                icon={
                  mobileOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />
                }
                className="lg:hidden"
                onClick={() => setMobileOpen((v) => !v)}
              />
              <Button
                type="text"
                icon={
                  collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />
                }
                className="hidden lg:inline-flex"
                onClick={() => setCollapsed((v) => !v)}
              />
              <div className="min-w-0">
                <Title
                  level={4}
                  className="!mb-0 truncate !text-lg !font-semibold sm:!text-xl"
                  style={{ color: token.colorText }}
                >
                  {title}
                </Title>
                {description ? (
                  <Text type="secondary" className="hidden text-sm sm:block">
                    {description}
                  </Text>
                ) : null}
              </div>
            </div>
            <Space size={8} wrap className="justify-end">
              <Tooltip
                title={
                  mode === "dark" ? "Switch to light mode" : "Switch to dark mode"
                }
              >
                <Button
                  type="text"
                  aria-label="Toggle color theme"
                  icon={mode === "dark" ? <BulbOutlined /> : <BulbFilled />}
                  onClick={toggleMode}
                />
              </Tooltip>
              {onRefresh ? (
                <Button
                  icon={<ReloadOutlined spin={isLoading} />}
                  onClick={onRefresh}
                  loading={isLoading}
                >
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              ) : null}
              {actionButton}
            </Space>
          </Header>

          <Content
            className="relative flex-1 p-4 sm:p-6"
            style={{ background: token.colorBgBase }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-40"
              style={{
                background: `radial-gradient(ellipse 60% 80% at 100% 0%, ${token.colorPrimary}12, transparent)`,
              }}
            />
            <div className="relative mx-auto w-full max-w-[1400px]">
              {children}
            </div>
          </Content>
        </div>
      </Layout>
    </Layout>
  );
}
