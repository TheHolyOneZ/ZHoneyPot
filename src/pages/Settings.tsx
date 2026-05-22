import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SettingsAPI } from "@/ipc/settings";
import { Select } from "@/components/ui/Select";
import type { AppSettings } from "@/lib/types";


function applyTheme(theme: AppSettings["theme"]) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
  } else {

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  }
}

export function Settings() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: SettingsAPI.get,
  });

  const mutation = useMutation({
    mutationFn: SettingsAPI.set,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });

  const resetMutation = useMutation({
    mutationFn: SettingsAPI.reset,
    onSuccess: () => {
      qc.invalidateQueries();
      setShowReset(false);
    },
  });

  const [showReset, setShowReset] = useState(false);


  useEffect(() => {
    if (settings) applyTheme(settings.theme);
  }, [settings?.theme]);


  useEffect(() => {
    if (settings?.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [settings?.theme]);

  if (isLoading || !settings) return <div className="text-[hsl(var(--muted-foreground))]">Loading…</div>;

  const save = (next: AppSettings) => {
    if (next.theme !== settings.theme) applyTheme(next.theme);
    mutation.mutate(next);
  };

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="rounded-lg border p-4 space-y-4">
        <h2 className="font-semibold">Notifications</h2>
        <Toggle
          label="Desktop notifications"
          checked={settings.notifications.desktop_enabled}
          onChange={(v) => save({ ...settings, notifications: { ...settings.notifications, desktop_enabled: v } })}
        />
        <Toggle
          label="Tray badge"
          checked={settings.notifications.tray_enabled}
          onChange={(v) => save({ ...settings, notifications: { ...settings.notifications, tray_enabled: v } })}
        />
        <div>
          <label className="block text-sm font-medium mb-1">Webhook URL</label>
          <input
            type="url"
            defaultValue={settings.notifications.webhook_url ?? ""}
            placeholder="https://your-server/hook"
            onBlur={(e) => save({ ...settings, notifications: { ...settings.notifications, webhook_url: e.target.value || null } })}
            className="w-full rounded-md border px-3 py-2 text-sm bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          />
        </div>
      </section>

      <section className="rounded-lg border p-4 space-y-4">
        <h2 className="font-semibold">Callback Server</h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          Optional self-hosted server that receives network-triggered alerts (e.g. DNS canaries).
        </p>
        <div>
          <label className="block text-sm font-medium mb-1">Server URL</label>
          <input
            type="url"
            defaultValue={settings.callback.server_url ?? ""}
            placeholder="https://your-vps/callback"
            onBlur={(e) => save({ ...settings, callback: { ...settings.callback, server_url: e.target.value || null } })}
            className="w-full rounded-md border px-3 py-2 text-sm bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          />
        </div>
      </section>

      <section className="rounded-lg border p-4 space-y-4">
        <h2 className="font-semibold">System Integration</h2>
        <Toggle
          label="Autostart on login"
          description="Launch ZHoneyPot automatically when you log in so watchers are always running"
          checked={settings.daemon.autostart}
          onChange={(v) => save({ ...settings, daemon: { ...settings.daemon, autostart: v } })}
        />
        <Toggle
          label="Close to tray"
          description="Clicking × hides the window instead of quitting — watchers keep running in the background"
          checked={settings.daemon.close_to_tray}
          onChange={(v) => save({ ...settings, daemon: { ...settings.daemon, close_to_tray: v } })}
        />
        <Toggle
          label="Start minimized"
          description="When autostart launches ZHoneyPot on login, hide the window immediately (tray-only)"
          checked={settings.daemon.start_minimized}
          onChange={(v) => save({ ...settings, daemon: { ...settings.daemon, start_minimized: v } })}
        />
      </section>

      <section className="rounded-lg border p-4 space-y-4">
        <h2 className="font-semibold">Appearance</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Theme</label>
          <Select
            value={settings.theme}
            onChange={(e) => save({ ...settings, theme: e.target.value as AppSettings["theme"] })}
            className="w-56"
          >
            <option value="system">System (follow OS)</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </Select>
        </div>
      </section>

      <section className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950 p-4 space-y-2">
        <h2 className="font-semibold text-yellow-800 dark:text-yellow-200">Privacy</h2>
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          ZHoneyPot makes <strong>zero outbound network requests</strong> by default.
          The only traffic is to your configured webhook or callback server URL above.
          There is no telemetry, no auto-update check, and no crash reporting.
        </p>
        <Toggle
          label="Network audit log"
          checked={settings.network_audit_enabled}
          onChange={(v) => save({ ...settings, network_audit_enabled: v })}
        />
      </section>

      <section className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-4 space-y-3">
        <h2 className="font-semibold text-red-800 dark:text-red-200">Danger Zone</h2>
        <p className="text-sm text-red-700 dark:text-red-300">
          Reset wipes all tokens, alerts, rules, and settings from the database and removes all
          deployed decoy files from disk. This cannot be undone.
        </p>
        <button
          onClick={() => setShowReset(true)}
          className="rounded-md border border-red-400 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
        >
          Reset Everything…
        </button>
      </section>

      {mutation.error && (
        <p className="text-sm text-red-500">{(mutation.error as Error).message}</p>
      )}
      {mutation.isSuccess && (
        <p className="text-sm text-green-600">Settings saved.</p>
      )}

      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-xl border bg-[hsl(var(--card))] p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-red-600">Reset Everything?</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              This will permanently delete all tokens, alerts, autonomous rules, and settings.
              Decoy files on disk will be removed. There is no undo.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowReset(false)}
                className="rounded-md border px-4 py-2 text-sm hover:bg-[hsl(var(--accent))]"
              >
                Cancel
              </button>
              <button
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {resetMutation.isPending ? "Resetting…" : "Yes, reset everything"}
              </button>
            </div>
            {resetMutation.error && (
              <p className="text-sm text-red-500">{(resetMutation.error as Error).message}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium">{label}</span>
        {description && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 shrink-0 inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--muted))]"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-1"}`} />
      </button>
    </label>
  );
}
