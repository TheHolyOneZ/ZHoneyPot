import { invoke as tauriInvoke } from "@tauri-apps/api/core";

export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}

export async function invoke<T>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  try {
    return await tauriInvoke<T>(cmd, args);
  } catch (e) {
    throw new AppError(typeof e === "string" ? e : JSON.stringify(e));
  }
}
