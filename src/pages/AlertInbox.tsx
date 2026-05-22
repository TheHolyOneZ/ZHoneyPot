import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, FlaskConical, Info, RefreshCw, XCircle } from "lucide-react";
import { AlertsAPI } from "@/ipc/alerts";
import { useAlerts } from "@/hooks/useAlerts";
import { useAlertsStore } from "@/stores/alertsStore";
import { cn } from "@/lib/cn";
import type { Severity } from "@/lib/types";

const KNOWN_INDEXERS = ["tracker-miner", "tracker-extract", "nautilus", "baloo", "dolphin", "thunar", "nemo"];
function isFalsePositive(cmdline?: string | null) {
  if (!cmdline) return false;
  return KNOWN_INDEXERS.some((p) => cmdline.includes(p));
}

const SEVERITY_COLOR: Record<Severity, string> = {
  info: "bg-blue-100 text-blue-800",
  warn: "bg-yellow-100 text-yellow-800",
  critical: "bg-red-100 text-red-800",
};

export function AlertInbox() {
  const { alerts } = useAlerts(200);
  const markRead = useAlertsStore((s) => s.markRead);
  const qc = useQueryClient();

  const { data: chainResult, refetch: recheckChain } = useQuery({
    queryKey: ["chain-verify"],
    queryFn: AlertsAPI.verifyChain,
  });

  const ackMutation = useMutation({
    mutationFn: (id: string) => AlertsAPI.acknowledge(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const rebuildMutation = useMutation({
    mutationFn: AlertsAPI.rebuildChain,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chain-verify"] }),
  });

  useState(() => { markRead(); });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Alert Inbox</h1>
        <div className="flex items-center gap-2">
          {chainResult && !chainResult.ok && (
            <button
              onClick={() => {
                if (confirm("Rebuild the hash chain from current alert data?\n\nThis resets tamper evidence — do this only if the chain broke due to a software update, not a real incident.")) {
                  rebuildMutation.mutate();
                }
              }}
              disabled={rebuildMutation.isPending}
              className="flex items-center gap-1.5 rounded-md border border-amber-400 px-3 py-1.5 text-sm text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${rebuildMutation.isPending ? "animate-spin" : ""}`} />
              Rebuild chain
            </button>
          )}
          <button
            onClick={() => recheckChain()}
            className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-[hsl(var(--accent))]"
          >
            {chainResult?.ok ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            {chainResult ? (chainResult.ok ? "Chain intact" : `Broken at #${chainResult.tampered_at_seq}`) : "Verify chain"}
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          Some alerts may be <strong>false positives</strong> from system file indexers (GNOME Tracker, Baloo, Nautilus).
          Check the process name in the alert — if it says <code>tracker-miner</code> or <code>baloo</code> it's your OS, not an attacker.
          Click <strong>Acknowledge</strong> to dismiss known false positives.
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="rounded-lg border p-12 text-center text-[hsl(var(--muted-foreground))]">
          No alerts yet — your honeyfiles are watching.
        </div>
      ) : (
        <div className="rounded-lg border divide-y overflow-hidden">
          {alerts.map((alert) => {
            const fp = isFalsePositive(alert.process_info?.cmdline);
            return (
              <div key={alert.id} className={cn("flex items-center gap-3 px-4 py-3 hover:bg-[hsl(var(--accent))]", alert.acknowledged && "opacity-60")}>
                <span className={cn("rounded px-2 py-0.5 text-xs font-medium shrink-0", SEVERITY_COLOR[alert.severity])}>
                  {alert.severity}
                </span>
                <Link to="/alerts/$id" params={{ id: alert.id }} className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium">
                    {alert.is_test && <><FlaskConical className="inline h-3 w-3 mr-0.5" /> TEST · </>}
                    {fp && <><Info className="inline h-3 w-3 mr-0.5 text-blue-400" /> likely indexer · </>}
                    {alert.event_kind.toUpperCase()} · token {alert.token_id.slice(0, 8)}…
                  </div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">
                    {new Date(alert.triggered_at).toLocaleString()}
                    {alert.process_info?.cmdline ? ` · ${alert.process_info.cmdline.slice(0, 40)}` : ""}
                  </div>
                </Link>
                {!alert.acknowledged && (
                  <button
                    title="Mark as acknowledged — dismiss this alert"
                    onClick={() => ackMutation.mutate(alert.id)}
                    className="shrink-0 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] border rounded px-2 py-0.5"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
