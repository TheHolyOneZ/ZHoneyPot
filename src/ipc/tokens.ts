import type { Token, TokenSpec } from "@/lib/types";
import { invoke } from "./client";

export const TokensAPI = {
  list: () => invoke<Token[]>("tokens_list"),
  get: (id: string) => invoke<Token>("tokens_get", { id }),
  create: (spec: TokenSpec) => invoke<Token>("tokens_create", { spec }),
  delete: (id: string, removeFile?: boolean) =>
    invoke<void>("tokens_delete", { id, removeFile }),
  testTrigger: (id: string) => invoke<void>("tokens_test_trigger", { id }),
};
