import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, HelpCircle, Info, Network, Shield, Terminal } from "lucide-react";
import { Link, useParams } from "@tanstack/react-router";
import { AlertsAPI } from "@/ipc/alerts";
import { TokensAPI } from "@/ipc/tokens";
import { cn } from "@/lib/cn";
import type { Severity } from "@/lib/types";

const SEVERITY_COLOR: Record<Severity, string> = {
  info: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  warn: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

const KNOWN_INDEXERS: Record<string, string> = {
  "tracker-miner": "GNOME Tracker (file indexer)",
  "tracker-extract": "GNOME Tracker (metadata extractor)",
  "nautilus": "Nautilus file manager",
  "baloo": "KDE Baloo file indexer",
  "dolphin": "Dolphin file manager",
  "thunar": "Thunar file manager",
  "nemo": "Nemo file manager",
  "code": "VS Code",
  "rsync": "rsync backup",
  "cp": "cp command",
  "find": "find command",
};

const KNOWN_PORTS: Record<number, string> = {
  22: "SSH", 80: "HTTP", 443: "HTTPS", 3306: "MySQL", 5432: "PostgreSQL",
  5228: "Google FCM", 6379: "Redis", 8080: "HTTP-alt", 27017: "MongoDB",
};

function classifyProcess(cmdline: string | null | undefined): { label: string; suspicious: boolean } {
  if (!cmdline) return { label: "Unknown process", suspicious: false };
  for (const [key, name] of Object.entries(KNOWN_INDEXERS)) {
    if (cmdline.includes(key)) return { label: name, suspicious: false };
  }
  const exe = cmdline.split(" ")[0].split("/").pop() ?? cmdline;
  return { label: exe, suspicious: true };
}

function annotatePort(addr: string): string {
  const port = parseInt(addr.split(":").pop() ?? "0");
  const name = KNOWN_PORTS[port];
  return name ? `${addr} (${name})` : addr;
}

export function AlertDetail() {
  const { id } = useParams({ strict: false }) as { id: string };

  const { data: alert, isLoading } = useQuery({
    queryKey: ["alert", id],
    queryFn: () => AlertsAPI.get(id),
    enabled: !!id,
  });

  const { data: token } = useQuery({
    queryKey: ["token", alert?.token_id],
    queryFn: () => TokensAPI.get(alert!.token_id),
    enabled: !!alert?.token_id,
  });

  if (isLoading) return <div className="p-6 text-[hsl(var(--muted-foreground))]">Loading…</div>;
  if (!alert) return <div className="p-6 text-red-500">Alert not found.</div>;

  const proc = alert.process_info;
  const { label: processLabel, suspicious } = classifyProcess(proc?.cmdline);
  const hasProcess = !!proc;

  const isLoopback = (addr: string) =>
    addr.startsWith("127.") || addr.startsWith("0.0.0.0") ||
    addr.startsWith("[0:0:0:0:0:0:0:") || addr.startsWith("[::") || addr === "0.0.0.0:0";

  const isPrivate = (addr: string) =>
    addr.startsWith("192.168.") || addr.startsWith("10.") || addr.startsWith("172.");


  const externalConns = alert.network_info.filter(
    (c) => c.state === "ESTABLISHED" && !isLoopback(c.remote_addr) && !isPrivate(c.remote_addr)
  );


  const displayConns = alert.network_info.filter(c =>
    c.state === "ESTABLISHED" && !(isLoopback(c.local_addr) && isLoopback(c.remote_addr))
  );

  return (
    <div className="space-y-5 max-w-3xl">

      <div className="flex items-center gap-3">
        <Link to="/alerts" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Alert Detail</h1>
        {alert.is_test && (
          <span className="rounded-full bg-purple-100 dark:bg-purple-900 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-200">
            TEST
          </span>
        )}
        <span className={cn("ml-auto rounded px-2 py-0.5 text-xs font-semibold", SEVERITY_COLOR[alert.severity])}>
          {alert.severity.toUpperCase()}
        </span>
      </div>


      <div className={cn(
        "rounded-lg border p-4 space-y-1",
        suspicious && hasProcess
          ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
          : hasProcess
            ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
            : "border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]"
      )}>
        <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">What triggered this</p>
        <div className="flex items-center gap-2 text-sm font-medium">
          {suspicious && hasProcess
            ? <Shield className="h-4 w-4 text-red-500 shrink-0" />
            : hasProcess
              ? <Info className="h-4 w-4 text-blue-500 shrink-0" />
              : <HelpCircle className="h-4 w-4 text-[hsl(var(--muted-foreground))] shrink-0" />
          }
          <span>
            {hasProcess
              ? <><strong>{processLabel}</strong> performed a <strong>{alert.event_kind.toUpperCase()}</strong> on{token ? <> <strong>{token.display_name ?? token.kind.replace(/_/g, " ")}</strong></> : " the honeyfile"}</>
              : <>Process ended before it could be captured — <strong>{alert.event_kind.toUpperCase()}</strong> on{token ? <> <strong>{token.display_name ?? token.kind.replace(/_/g, " ")}</strong></> : " the honeyfile"}</>
            }
          </span>
        </div>
        {token && (
          <p className="text-xs font-mono text-[hsl(var(--muted-foreground))] pl-6">{token.path}</p>
        )}
        {!token && alert.token_id && (
          <p className="text-xs font-mono text-[hsl(var(--muted-foreground))] pl-6">token {alert.token_id}</p>
        )}
        {hasProcess && !suspicious && (
          <p className="text-xs text-blue-600 dark:text-blue-400 pl-6">This is a known system process — likely a false positive from file indexing.</p>
        )}
        {hasProcess && suspicious && (
          <p className="text-xs text-red-600 dark:text-red-400 pl-6">This process is not a known indexer. Investigate the forensics below.</p>
        )}
        {!hasProcess && (
          <p className="text-xs text-[hsl(var(--muted-foreground))] pl-6">The process exited before /proc could be scanned. This happens with short-lived scripts.</p>
        )}
      </div>


      <div className="rounded-lg border p-4 space-y-2 text-sm">
        <Row label="Triggered" value={new Date(alert.triggered_at).toLocaleString()} />
        <Row label="Event" value={alert.event_kind.toUpperCase()} />
        <Row label="Token" value={token ? (token.display_name || token.kind.replace(/_/g, " ")) : alert.token_id} />
        {token && <Row label="Path" value={token.path} mono />}
        {alert.acknowledged && <Row label="Acknowledged" value={alert.ack_at ? new Date(alert.ack_at).toLocaleString() : "Yes"} />}
        {alert.note && <Row label="Note" value={alert.note} />}
        <Row label="Alert ID" value={alert.id} mono />
      </div>


      <section className="rounded-lg border overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-[hsl(var(--muted))] border-b">
          <Terminal className="h-4 w-4" />
          <span className="font-semibold text-sm">Process Forensics</span>
          {!hasProcess && <span className="ml-auto text-xs text-[hsl(var(--muted-foreground))]">not captured</span>}
        </div>
        {hasProcess ? (
          <div className="p-4 space-y-1.5 text-sm">
            {proc!.pid != null && <Row label="PID" value={proc!.pid.toString()} />}
            {proc!.ppid != null && <Row label="Parent PID" value={proc!.ppid.toString()} />}
            {proc!.username && <Row label="User" value={`${proc!.username}${proc!.uid != null ? ` (uid ${proc!.uid})` : ""}`} />}
            {proc!.cmdline && <Row label="Command" value={proc!.cmdline} mono />}
            {proc!.exe && <Row label="Executable" value={proc!.exe} mono />}
            {proc!.exe_sha256 && <Row label="SHA-256" value={proc!.exe_sha256} mono />}
            {proc!.cwd && <Row label="CWD" value={proc!.cwd} mono />}
            {proc!.parent_chain.length > 0 && (
              <div className="flex gap-2 pt-1">
                <span className="w-28 shrink-0 text-[hsl(var(--muted-foreground))]">Parent chain</span>
                <span className="font-mono text-xs break-all">{proc!.parent_chain.join(" → ")}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 py-6 text-sm text-[hsl(var(--muted-foreground))] text-center">
            The offending process exited before forensics could be captured.<br />
            <span className="text-xs">Try enabling Auto-Response → Kill Process to slow it down next time.</span>
          </div>
        )}
      </section>


      {alert.network_info.length > 0 && (
        <section className="rounded-lg border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-[hsl(var(--muted))] border-b">
            <Network className="h-4 w-4" />
            <span className="font-semibold text-sm">Network Snapshot</span>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">(ESTABLISHED only · loopback filtered)</span>
            {externalConns.length > 0 && (
              <span className="ml-auto text-xs font-medium text-amber-600 dark:text-amber-400">
                {externalConns.length} external
              </span>
            )}
          </div>
          {displayConns.length === 0 ? (
            <p className="px-4 py-4 text-sm text-[hsl(var(--muted-foreground))]">No external connections at trigger time.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-[hsl(var(--muted)/0.5)] text-[hsl(var(--muted-foreground))]">
                    <th className="text-left px-4 py-2">Proto</th>
                    <th className="text-left px-4 py-2">Local</th>
                    <th className="text-left px-4 py-2">Remote</th>
                    <th className="text-left px-4 py-2">State</th>
                  </tr>
                </thead>
                <tbody>
                  {displayConns.map((c, i) => {
                    const ext = !isLoopback(c.remote_addr) && !isPrivate(c.remote_addr);
                    return (
                      <tr key={i} className={cn("border-b last:border-0", ext && "bg-amber-50 dark:bg-amber-950/20")}>
                        <td className="px-4 py-1.5 font-mono">{c.protocol}</td>
                        <td className="px-4 py-1.5 font-mono text-[hsl(var(--muted-foreground))]">{annotatePort(c.local_addr)}</td>
                        <td className={cn("px-4 py-1.5 font-mono", ext && "font-semibold text-amber-700 dark:text-amber-400")}>{annotatePort(c.remote_addr)}</td>
                        <td className="px-4 py-1.5 text-[hsl(var(--muted-foreground))]">{c.state}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="px-4 py-2 text-xs text-[hsl(var(--muted-foreground))] border-t">
            This is a system-wide snapshot — all connections your machine had open at trigger time, not just the offending process.
          </p>
        </section>
      )}

      {alert.raw_event != null && (
        <section className="rounded-lg border p-4">
          <h2 className="mb-2 font-semibold text-sm">Raw Event Data</h2>
          <pre className="overflow-x-auto rounded bg-[hsl(var(--muted))] p-3 text-xs font-mono">
            {JSON.stringify(alert.raw_event, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="w-28 shrink-0 text-[hsl(var(--muted-foreground))]">{label}</span>
      <span className={mono ? "font-mono text-xs break-all" : ""}>{value}</span>
    </div>
  );
}
