import type { AppSettings } from "@/lib/types";
import { invoke } from "./client";

export const SettingsAPI = {
  get: () => invoke<AppSettings>("settings_get"),
  set: (settings: AppSettings) => invoke<void>("settings_set", { settings }),
  reset: () => invoke<void>("app_reset"),
};
