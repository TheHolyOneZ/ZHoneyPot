import type {
  AccessBaseline,
  AutoResponse,
  AutonomousSettings,
  ScanResult,
} from "@/lib/types";
import { invoke } from "./client";

export const AutonomousAPI = {
  scan: (extraPaths?: string[]) =>
    invoke<ScanResult>("autonomous_scan", { extraPaths }),
  getSettings: () =>
    invoke<AutonomousSettings>("autonomous_get_settings"),
  setSettings: (settings: AutonomousSettings) =>
    invoke<void>("autonomous_set_settings", { settings }),
  listRules: () => invoke<AutoResponse[]>("auto_responses_list"),
  createRule: (rule: AutoResponse) =>
    invoke<AutoResponse>("auto_responses_create", { rule }),
  deleteRule: (id: string) =>
    invoke<void>("auto_responses_delete", { id }),
  getBaseline: (tokenId: string) =>
    invoke<AccessBaseline | null>("anomaly_get_baseline", { tokenId }),
};
