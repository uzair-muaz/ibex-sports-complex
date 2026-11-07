import { bffFetch } from "@/lib/bff/client";
import type { Faq, ResolvedAppSettings, SettingsPatch } from "@/lib/app-settings";

type SettingsAnswer = { settings: ResolvedAppSettings; builtInFaqs: Faq[] };

export async function fetchAdminAppSettings() {
  return bffFetch<SettingsAnswer>("/api/v1/admin/settings");
}

export async function saveAdminAppSettings(patch: SettingsPatch) {
  return bffFetch<SettingsAnswer>("/api/v1/admin/settings", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}
