import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, FlaskConical, FolderOpen } from "lucide-react";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { TokensAPI } from "@/ipc/tokens";
import { useTokens, TOKENS_KEY } from "@/hooks/useTokens";
import { cn } from "@/lib/cn";
import type { Severity, TokenStatus } from "@/lib/types";

const STATUS_BADGE: Record<TokenStatus, string> = {
  active: "bg-green-100 text-green-800",
  disabled: "bg-gray-100 text-gray-600",
  missing: "bg-red-100 text-red-700",
};

const SEVERITY_COLOR: Record<Severity, string> = {
  info: "text-blue-500",
  warn: "text-yellow-500",
  critical: "text-red-500",
};

export function ActiveTokens() {
  const { data: tokens = [], isLoading } = useTokens();
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => TokensAPI.delete(id, false),
    onSuccess: () => qc.invalidateQueries({ queryKey: TOKENS_KEY }),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => TokensAPI.testTrigger(id),
  });

  if (isLoading) return <div className="text-[hsl(var(--muted-foreground))]">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Active Tokens</h1>
        <span className="text-sm text-[hsl(var(--muted-foreground))]">{tokens.length} total</span>
      </div>

      {tokens.length === 0 ? (
        <div className="rounded-lg border p-12 text-center text-[hsl(var(--muted-foreground))]">
          No tokens deployed. Deploy some via <strong>New Token</strong> or a template.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-[hsl(var(--muted))]">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-[hsl(var(--muted-foreground))]">Name</th>
                <th className="px-4 py-2 text-left font-medium text-[hsl(var(--muted-foreground))]">Path</th>
                <th className="px-4 py-2 text-left font-medium text-[hsl(var(--muted-foreground))]">Kind</th>
                <th className="px-4 py-2 text-left font-medium text-[hsl(var(--muted-foreground))]">Status</th>
                <th className="px-4 py-2 text-left font-medium text-[hsl(var(--muted-foreground))]">Last Triggered</th>
                <th className="px-4 py-2 text-right font-medium text-[hsl(var(--muted-foreground))]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tokens.map((token) => (
                <tr key={token.id} className="hover:bg-[hsl(var(--accent))]">
                  <td className="px-4 py-2">
                    <span className={cn("mr-2 font-medium", SEVERITY_COLOR[token.severity])}>●</span>
                    {token.display_name ?? token.kind.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs max-w-[200px] truncate text-[hsl(var(--muted-foreground))]">
                    {token.path}
                  </td>
                  <td className="px-4 py-2 text-xs">{token.kind.replace(/_/g, " ")}</td>
                  <td className="px-4 py-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_BADGE[token.status])}>
                      {token.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-[hsl(var(--muted-foreground))]">
                    {token.last_triggered_at
                      ? new Date(token.last_triggered_at).toLocaleString()
                      : "Never"}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        title="Reveal in file manager"
                        onClick={() => revealItemInDir(token.path).catch(() => {})}
                        className="rounded p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] active:scale-90 transition-all"
                      >
                        <FolderOpen className="h-4 w-4" />
                      </button>
                      <button
                        title="Fire a test alert"
                        onClick={() => testMutation.mutate(token.id)}
                        className="rounded p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] active:scale-90 transition-all"
                      >
                        <FlaskConical className="h-4 w-4" />
                      </button>
                      <button
                        title="Delete token (keeps file on disk)"
                        onClick={() => {
                          if (confirm(`Remove token record for ${token.path}?\n\nThe file on disk will NOT be deleted.`)) {
                            deleteMutation.mutate(token.id);
                          }
                        }}
                        className="rounded p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-red-100 dark:hover:bg-red-950/40 hover:text-red-600 active:scale-90 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
