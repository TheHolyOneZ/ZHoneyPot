import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useDaemonStatus } from "@/hooks/useDaemonStatus";

export function TopBar() {
  const { data: status, isLoading } = useDaemonStatus();

  return (
    <header className="flex h-12 items-center justify-end border-b bg-[hsl(var(--card))] px-4">
      <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
        {isLoading ? (
          <>
            <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />
            <span>Checking daemon…</span>
          </>
        ) : status?.running ? (
          <>
            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            <span>Daemon running · {status.watcher_count} watchers</span>
          </>
        ) : (
          <>
            <XCircle className="h-3.5 w-3.5 text-red-500" />
            <span>Daemon stopped</span>
          </>
        )}
      </div>
    </header>
  );
}
