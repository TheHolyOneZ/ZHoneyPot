import { listen } from "@tauri-apps/api/event";
import { create } from "zustand";
import { ALERT_NEW } from "@/ipc/events";
import type { Alert } from "@/lib/types";

interface AlertsState {
  alerts: Alert[];
  unreadCount: number;
  setAlerts: (alerts: Alert[]) => void;
  prependAlert: (alert: Alert) => void;
  markRead: () => void;
}

export const useAlertsStore = create<AlertsState>((set) => ({
  alerts: [],
  unreadCount: 0,
  setAlerts: (alerts) => set({ alerts }),
  prependAlert: (alert) =>
    set((s) => ({
      alerts: [alert, ...s.alerts],
      unreadCount: s.unreadCount + (alert.is_test ? 0 : 1),
    })),
  markRead: () => set({ unreadCount: 0 }),
}));


let unlistenFn: (() => void) | null = null;

export async function subscribeToAlerts() {
  if (unlistenFn) return;
  const unlisten = await listen<Alert>(ALERT_NEW, (event) => {
    useAlertsStore.getState().prependAlert(event.payload);
  });
  unlistenFn = unlisten;
}
