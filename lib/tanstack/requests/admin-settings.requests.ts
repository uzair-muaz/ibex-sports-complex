import { bffFetch } from "@/lib/bff/client";
import type { ResolvedAppSettings, SettingsPatch } from "@/lib/app-settings";

export async function fetchAdminAppSettings() {
  return bffFetch<{ settings: ResolvedAppSettings }>("/api/v1/admin/settings");
}

export async function saveAdminAppSettings(patch: SettingsPatch) {
  return bffFetch<{ settings: ResolvedAppSettings }>("/api/v1/admin/settings", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}
