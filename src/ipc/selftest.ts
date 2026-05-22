import type { TestResult } from "@/lib/types";
import { invoke } from "./client";

export const SelfTestAPI = {
  run: () => invoke<TestResult[]>("self_test_run"),
};
