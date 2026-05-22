import type { DaemonStatus, DeploymentTemplate } from "@/lib/types";
import { invoke } from "./client";

export const DaemonAPI = {
  status: () => invoke<DaemonStatus>("daemon_status"),
};

export const TemplatesAPI = {
  list: () => invoke<DeploymentTemplate[]>("templates_list"),
};
