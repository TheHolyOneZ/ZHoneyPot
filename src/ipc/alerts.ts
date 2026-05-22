import type { Alert, ChainVerifyResult } from "@/lib/types";
import { invoke } from "./client";

export const AlertsAPI = {
  list: (limit?: number) => invoke<Alert[]>("alerts_list", { limit }),
  get: (id: string) => invoke<Alert>("alerts_get", { id }),
  acknowledge: (id: string, note?: string) =>
    invoke<void>("alerts_acknowledge", { id, note }),
  verifyChain: () => invoke<ChainVerifyResult>("alerts_verify_chain"),
  rebuildChain: () => invoke<number>("alerts_rebuild_chain"),
};
