"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider, theme as antdTheme } from "antd";
import type { ThemeConfig } from "antd";

export type AdminThemeMode = "light" | "dark";

const STORAGE_KEY = "ibex-admin-theme";

type AdminThemeContextValue = {
  mode: AdminThemeMode;
  setMode: (mode: AdminThemeMode) => void;
  toggleMode: () => void;
};

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

export function useAdminTheme() {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) {
    throw new Error("useAdminTheme must be used within AdminAntdProvider");
  }
  return ctx;
}

const sharedToken = {
  colorPrimary: "#0D9488",
  colorInfo: "#0D9488",
  colorSuccess: "#0D9488",
  borderRadius: 14,
  fontFamily: "inherit",
  controlHeight: 40,
  controlHeightLG: 44,
} as const;

function buildTheme(mode: AdminThemeMode): ThemeConfig {
  if (mode === "light") {
    return {
      algorithm: antdTheme.defaultAlgorithm,
      token: {
        ...sharedToken,
        colorBgBase: "#f4f4f5",
        colorBgContainer: "#ffffff",
        colorBgElevated: "#ffffff",
        colorBorder: "#e4e4e7",
        colorBorderSecondary: "#f0f0f2",
        colorText: "#18181b",
        colorTextSecondary: "#71717a",
      },
      components: {
        Layout: {
          siderBg: "#ffffff",
          headerBg: "#ffffff",
          bodyBg: "#f4f4f5",
        },
        Menu: {
          itemBg: "transparent",
          itemBorderRadius: 10,
          itemMarginInline: 4,
          itemSelectedBg: "rgba(13, 148, 136, 0.12)",
          itemSelectedColor: "#0D9488",
          itemHoverBg: "rgba(0,0,0,0.04)",
        },
        Table: {
          headerBg: "#fafafa",
          rowHoverBg: "rgba(0,0,0,0.02)",
          borderColor: "#f0f0f2",
        },
        Card: {
          colorBorderSecondary: "#f0f0f2",
        },
        Button: {
          borderRadius: 10,
          primaryShadow: "0 8px 24px rgba(13, 148, 136, 0.22)",
        },
        Input: {
          borderRadius: 10,
        },
      },
    };
  }

  return {
    algorithm: antdTheme.darkAlgorithm,
    token: {
      ...sharedToken,
      colorPrimary: "#2DD4BF",
      colorInfo: "#2DD4BF",
      colorSuccess: "#2DD4BF",
      colorBgBase: "#050505",
      colorBgContainer: "#0c0c0e",
      colorBgElevated: "#141416",
      colorBorder: "#232326",
      colorBorderSecondary: "#1a1a1d",
      colorText: "#fafafa",
      colorTextSecondary: "#a1a1aa",
    },
    components: {
      Layout: {
        siderBg: "#0c0c0e",
        headerBg: "#0c0c0e",
        bodyBg: "#050505",
      },
      Menu: {
        itemBorderRadius: 10,
        itemMarginInline: 4,
        darkItemBg: "transparent",
        darkItemSelectedBg: "rgba(45, 212, 191, 0.14)",
        darkItemSelectedColor: "#2DD4BF",
        darkItemHoverBg: "rgba(255,255,255,0.04)",
      },
      Table: {
        headerBg: "#141416",
        rowHoverBg: "rgba(255,255,255,0.03)",
        borderColor: "#1a1a1d",
      },
      Modal: {
        contentBg: "#141416",
        headerBg: "#141416",
      },
      Card: {
        colorBorderSecondary: "#1a1a1d",
      },
      Button: {
        borderRadius: 10,
        primaryShadow: "0 8px 24px rgba(45, 212, 191, 0.2)",
      },
      Input: {
        borderRadius: 10,
      },
    },
  };
}

export function AdminAntdProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AdminThemeMode>("dark");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as AdminThemeMode | null;
      if (stored === "light" || stored === "dark") {
        setModeState(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setMode = useCallback((next: AdminThemeMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "dark" ? "light" : "dark");
  }, [mode, setMode]);

  const value = useMemo(
    () => ({ mode, setMode, toggleMode }),
    [mode, setMode, toggleMode],
  );

  const themeConfig = useMemo(() => buildTheme(mode), [mode]);

  return (
    <AdminThemeContext.Provider value={value}>
      <AntdRegistry>
        <ConfigProvider
          theme={{
            ...themeConfig,
            cssVar: { key: "admin" },
          }}
        >
          <App>{children}</App>
        </ConfigProvider>
      </AntdRegistry>
    </AdminThemeContext.Provider>
  );
}
