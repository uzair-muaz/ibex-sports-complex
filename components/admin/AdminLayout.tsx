"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Layout,
  Menu,
  Button,
  Typography,
  theme,
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
  DashboardOutlined,
} from "@ant-design/icons";

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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const userRole = (session?.user as { role?: string })?.role;
  const isSuperAdmin = userRole === "super_admin";

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
        className="flex items-center gap-3 border-b px-4 py-5"
        style={{ borderColor: token.colorBorder }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ background: token.colorPrimary, color: "#0F172A" }}
        >
          <DashboardOutlined style={{ fontSize: 20 }} />
        </div>
        {!collapsed && (
          <div>
            <div className="font-semibold text-white">Admin Panel</div>
            <Text type="secondary" className="text-xs">
              {isSuperAdmin ? "Super Admin" : "Admin"}
            </Text>
          </div>
        )}
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={({ key }) => handleNavigate(key)}
        className="flex-1 border-none bg-transparent px-2 py-3"
      />

      <div className="border-t p-4" style={{ borderColor: token.colorBorder }}>
        {!collapsed && (
          <div
            className="mb-3 rounded-lg px-3 py-2"
            style={{ background: token.colorBgElevated }}
          >
            <Text type="secondary" className="text-xs">
              Logged in as
            </Text>
            <div className="truncate text-sm font-medium text-white">
              {(session?.user as { name?: string; email?: string })?.name ||
                (session?.user as { email?: string })?.email}
            </div>
          </div>
        )}
        <Button
          type="text"
          icon={<LogoutOutlined />}
          onClick={() => signOut()}
          block
          className="justify-start text-zinc-400"
        >
          {!collapsed && "Logout"}
        </Button>
      </div>
    </div>
  );

  return (
    <Layout className="min-h-screen bg-black">
      <Sider
        width={256}
        collapsed={collapsed}
        collapsedWidth={72}
        breakpoint="lg"
        onBreakpoint={(broken) => {
          if (broken) setCollapsed(true);
        }}
        className="!fixed !left-0 !top-0 !bottom-0 !z-50 hidden lg:!block"
        style={{
          background: token.colorBgContainer,
          borderRight: `1px solid ${token.colorBorder}`,
        }}
      >
        {sidebar}
      </Sider>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <Sider
            width={280}
            className="!fixed !left-0 !top-0 !bottom-0 !z-50 lg:!hidden"
            style={{
              background: token.colorBgContainer,
              borderRight: `1px solid ${token.colorBorder}`,
            }}
          >
            {sidebar}
          </Sider>
        </>
      )}

      <Layout className="min-h-screen bg-black">
        <div
          className={`flex min-h-screen flex-col transition-all duration-300 ml-0 ${collapsed ? "lg:ml-[72px]" : "lg:ml-64"}`}
        >
          <Header
            className="!sticky !top-0 z-30 flex items-center justify-between px-4 sm:px-6"
            style={{
              background: token.colorBgContainer,
              borderBottom: `1px solid ${token.colorBorder}`,
              height: "auto",
              lineHeight: "normal",
              paddingTop: 16,
              paddingBottom: 16,
            }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
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
                <Title level={4} className="!mb-0 truncate !text-white">
                  {title}
                </Title>
                {description && (
                  <Text type="secondary" className="hidden text-sm sm:block">
                    {description}
                  </Text>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {onRefresh && (
                <Button
                  icon={<ReloadOutlined spin={isLoading} />}
                  onClick={onRefresh}
                  loading={isLoading}
                >
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              )}
              {actionButton}
            </div>
          </Header>

          <Content className="flex-1 bg-black p-4 sm:p-6">{children}</Content>
        </div>
      </Layout>
    </Layout>
  );
}
