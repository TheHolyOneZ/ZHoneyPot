import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Plus, Shield, XCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { AlertsAPI } from "@/ipc/alerts";

import { useAlerts } from "@/hooks/useAlerts";
import { useTokens } from "@/hooks/useTokens";
import { useDaemonStatus } from "@/hooks/useDaemonStatus";
import { cn } from "@/lib/cn";
import type { Severity } from "@/lib/types";

const SEVERITY_COLOR: Record<Severity, string> = {
  info: "bg-blue-100 text-blue-800",
  warn: "bg-yellow-100 text-yellow-800",
  critical: "bg-red-100 text-red-800",
};

export function Dashboard() {
  const { data: status } = useDaemonStatus();
  const { data: tokens = [] } = useTokens();
  const { alerts } = useAlerts(10);
  const { data: chainResult } = useQuery({
    queryKey: ["chain-verify"],
    queryFn: AlertsAPI.verifyChain,
    refetchInterval: 60_000,
  });

  const activeTokens = tokens.filter((t) => t.status === "active");
  const missingTokens = tokens.filter((t) => t.status === "missing");
  const recentAlerts = alerts.slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link
          to="/create"
          className="flex items-center gap-2 rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> New Token
        </Link>
      </div>


      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatusCard
          label="Daemon"
          value={status?.running ? "Running" : "Stopped"}
          icon={status?.running ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
        />
        <StatusCard label="Active Tokens" value={activeTokens.length.toString()} icon={<Shield className="h-5 w-5 text-blue-500" />} />
        <StatusCard
          label="Missing Tokens"
          value={missingTokens.length.toString()}
          icon={<AlertTriangle className="h-5 w-5 text-yellow-500" />}
          warn={missingTokens.length > 0}
        />
        <StatusCard
          label="Alert Chain"
          value={chainResult ? (chainResult.ok ? "Intact" : "TAMPERED") : "—"}
          icon={chainResult?.ok ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
          warn={chainResult != null && !chainResult.ok}
        />
      </div>


      <div className="rounded-lg border p-4">
        <h2 className="mb-3 font-semibold">Token Breakdown</h2>
        {tokens.length === 0 ? (
          <div className="py-8 text-center text-[hsl(var(--muted-foreground))]">
            No tokens deployed yet.{" "}
            <Link to="/create" className="underline">Create your first token</Link>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {Object.entries(
              tokens.reduce<Record<string, number>>((acc, t) => {
                acc[t.kind] = (acc[t.kind] ?? 0) + 1;
                return acc;
              }, {})
            ).map(([kind, count]) => (
              <span key={kind} className="rounded-full bg-[hsl(var(--secondary))] px-3 py-1 text-sm">
                {kind.replace(/_/g, " ")} × {count}
              </span>
            ))}
          </div>
        )}
      </div>


      <div className="rounded-lg border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Recent Alerts</h2>
          <Link to="/alerts" className="text-sm text-[hsl(var(--primary))] hover:underline">
            View all
          </Link>
        </div>
        {recentAlerts.length === 0 ? (
          <div className="py-6 text-center text-[hsl(var(--muted-foreground))] text-sm">
            No alerts yet. Touch a deployed token to trigger one.
          </div>
        ) : (
          <div className="space-y-2">
            {recentAlerts.map((alert) => (
              <Link
                key={alert.id}
                to="/alerts/$id"
                params={{ id: alert.id }}
                className="flex items-center gap-3 rounded-md p-2 hover:bg-[hsl(var(--accent))]"
              >
                <span className={cn("rounded px-2 py-0.5 text-xs font-medium", SEVERITY_COLOR[alert.severity])}>
                  {alert.severity}
                </span>
                <span className="flex-1 truncate text-sm">
                  {alert.is_test ? "[TEST] " : ""}Token {alert.token_id.slice(0, 8)}…
                </span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {new Date(alert.triggered_at).toLocaleTimeString()}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusCard({
  label,
  value,
  icon,
  warn = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  warn?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-lg border p-4",
      warn && "border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/40"
    )}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-[hsl(var(--muted-foreground))]">{label}</span>
        {icon}
      </div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}
