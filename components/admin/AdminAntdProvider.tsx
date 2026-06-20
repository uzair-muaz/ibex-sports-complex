"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider, theme } from "antd";

const adminTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: "#2DD4BF",
    colorInfo: "#2DD4BF",
    colorSuccess: "#2DD4BF",
    colorBgBase: "#000000",
    colorBgContainer: "#09090b",
    colorBgElevated: "#18181b",
    colorBorder: "#27272a",
    colorText: "#fafafa",
    colorTextSecondary: "#a1a1aa",
    borderRadius: 12,
    fontFamily: "inherit",
  },
  components: {
    Layout: {
      siderBg: "#09090b",
      headerBg: "#09090b",
      bodyBg: "#000000",
    },
    Menu: {
      darkItemBg: "transparent",
      darkItemSelectedBg: "rgba(45, 212, 191, 0.15)",
      darkItemSelectedColor: "#2DD4BF",
      darkItemHoverBg: "rgba(255,255,255,0.05)",
    },
    Table: {
      headerBg: "#18181b",
      rowHoverBg: "rgba(255,255,255,0.03)",
    },
    Modal: {
      contentBg: "#18181b",
      headerBg: "#18181b",
    },
  },
};

export function AdminAntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistry>
      <ConfigProvider theme={adminTheme}>
        <App>{children}</App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
