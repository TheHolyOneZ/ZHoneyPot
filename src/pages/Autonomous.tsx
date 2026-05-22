import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  Zap,
} from "lucide-react";
import { AutonomousAPI } from "@/ipc/autonomous";
import { TokensAPI } from "@/ipc/tokens";
import { TOKENS_KEY } from "@/hooks/useTokens";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import type { AutoResponse } from "@/lib/types";

export function Autonomous() {
  const [activeTab, setActiveTab] = useState<"scan" | "heal" | "response" | "anomaly">("scan");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Bot className="h-6 w-6 text-[hsl(var(--primary))]" />
        <h1 className="text-2xl font-bold">Autonomous</h1>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
          Self-managing
        </span>
      </div>

      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        ZHoneyPot watches itself, heals broken tokens, detects anomalies, and responds automatically.
      </p>


      <div className="flex gap-1 border-b">
        {(["scan", "heal", "response", "anomaly"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors",
              activeTab === tab
                ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            )}
          >
            {tab === "scan" ? "Smart Scanner" :
             tab === "heal" ? "Self-Healing" :
             tab === "response" ? "Auto-Response" : "Anomaly Detection"}
          </button>
        ))}
      </div>

      {activeTab === "scan" && <ScannerTab />}
      {activeTab === "heal" && <HealTab />}
      {activeTab === "response" && <ResponseTab />}
      {activeTab === "anomaly" && <AnomalyTab />}
    </div>
  );
}


function ScannerTab() {
  const qc = useQueryClient();
  const { data: scan, isLoading, refetch } = useQuery({
    queryKey: ["autonomous-scan"],
    queryFn: () => AutonomousAPI.scan(),
    staleTime: Infinity,
  });

  const deployMutation = useMutation({
    mutationFn: (spec: NonNullable<typeof scan>["suggestions"][number]["spec"]) =>
      TokensAPI.create(spec),
    onSuccess: () => qc.invalidateQueries({ queryKey: TOKENS_KEY }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Scans your filesystem for tools and directories, then suggests high-value honeypot tokens you're missing.
          </p>
          {scan && (
            <p className="mt-1 text-sm">
              Coverage:{" "}
              <span className={cn("font-semibold", scan.coverage_score > 0.7 ? "text-green-600" : "text-yellow-600")}>
                {Math.round(scan.coverage_score * 100)}%
              </span>
              {" "}· {scan.scanned_paths} paths scanned
            </p>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-[hsl(var(--accent))] disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Rescan
        </button>
      </div>

      {isLoading && <div className="text-sm text-[hsl(var(--muted-foreground))]">Scanning filesystem…</div>}

      {scan?.suggestions.length === 0 && (
        <div className="rounded-lg border p-8 text-center text-[hsl(var(--muted-foreground))]">
          <Shield className="mx-auto mb-2 h-8 w-8 text-green-500" />
          Great coverage! No gaps found for detected tools.
        </div>
      )}

      {scan && scan.suggestions.length > 0 && (
        <div className="space-y-3">
          {scan.suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-4 rounded-lg border p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{s.spec.display_name ?? s.kind}</span>
                  <ConfidenceBadge value={s.confidence} />
                </div>
                <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{s.reason}</p>
                <p className="mt-1 font-mono text-xs text-[hsl(var(--muted-foreground))]">{s.suggested_path}</p>
              </div>
              <button
                onClick={() => deployMutation.mutate(s.spec)}
                disabled={deployMutation.isPending}
                className="shrink-0 flex items-center gap-1 rounded-md bg-[hsl(var(--primary))] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                <Plus className="h-3 w-3" /> Deploy
              </button>
            </div>
          ))}
        </div>
      )}

      {deployMutation.isSuccess && (
        <p className="text-sm text-green-600">Token deployed! Run rescan to refresh.</p>
      )}
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const label = value >= 0.9 ? "High" : value >= 0.75 ? "Medium" : "Low";
  const cls = value >= 0.9 ? "bg-green-100 text-green-700" : value >= 0.75 ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600";
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", cls)}>
      {label} confidence
    </span>
  );
}

// ── Self-Healing ───────────────────────────────────────────────────────────

function HealTab() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["autonomous-settings"],
    queryFn: AutonomousAPI.getSettings,
  });

  const saveMutation = useMutation({
    mutationFn: AutonomousAPI.setSettings,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["autonomous-settings"] }),
  });

  if (!settings) return <div className="text-[hsl(var(--muted-foreground))] text-sm">Loading…</div>;

  return (
    <div className="max-w-md space-y-6">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        When a token file is deleted or moved, ZHoneyPot will automatically recreate it after the
        configured delay. This ensures your tripwires are always armed.
      </p>

      <div className="rounded-lg border p-4 space-y-4">
        <Toggle
          label="Enable self-healing"
          description="Recreate deleted or missing token files automatically"
          checked={settings.self_heal_enabled}
          onChange={(v) => saveMutation.mutate({ ...settings, self_heal_enabled: v })}
        />

        {settings.self_heal_enabled && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Heal delay (seconds)
            </label>
            <input
              type="number"
              min={10}
              max={3600}
              defaultValue={settings.heal_delay_secs}
              onBlur={(e) =>
                saveMutation.mutate({
                  ...settings,
                  heal_delay_secs: parseInt(e.target.value) || 60,
                })
              }
              className="rounded-md border px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            />
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              Wait this long before recreating — gives you time to investigate the deletion.
            </p>
          </div>
        )}
      </div>

      {saveMutation.isSuccess && <p className="text-xs text-green-600">Saved.</p>}
    </div>
  );
}

// ── Auto-Response ──────────────────────────────────────────────────────────

function ResponseTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<AutoResponse>>({
    name: "",
    min_severity: "warn",
    lock_file: false,
    kill_process: false,
    enabled: true,
    token_filter: null,
    run_script: null,
    created_at: "",
    id: "",
  });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["auto-responses"],
    queryFn: AutonomousAPI.listRules,
  });

  const createMutation = useMutation({
    mutationFn: (r: AutoResponse) => AutonomousAPI.createRule(r),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auto-responses"] });
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: AutonomousAPI.deleteRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auto-responses"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-lg">
          Define actions to execute automatically when a token is triggered.
          Lock the file, terminate the accessing process, or run a custom script.
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="shrink-0 flex items-center gap-2 rounded-md bg-[hsl(var(--primary))] px-3 py-1.5 text-sm text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> New Rule
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border p-4 space-y-3 bg-[hsl(var(--muted))]">
          <h3 className="font-medium text-sm">New Auto-Response Rule</h3>
          <input
            placeholder="Rule name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          />
          <div>
            <label className="block text-xs font-medium mb-1">Minimum Severity</label>
            <Select
              value={form.min_severity}
              onChange={(e) => setForm((f) => ({ ...f, min_severity: e.target.value as AutoResponse["min_severity"] }))}
              className="w-48"
            >
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="critical">Critical</option>
            </Select>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.lock_file} onChange={(e) => setForm((f) => ({ ...f, lock_file: e.target.checked }))} />
              Lock file (chmod 000)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.kill_process} onChange={(e) => setForm((f) => ({ ...f, kill_process: e.target.checked }))} />
              Kill accessing process
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Run Script (optional)</label>
            <input
              placeholder="/path/to/script.sh"
              value={form.run_script ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, run_script: e.target.value || null }))}
              className="w-full rounded-md border px-3 py-2 text-sm font-mono focus:outline-none"
            />
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              Env vars: ZHONEYPOT_ALERT_ID, ZHONEYPOT_SEVERITY, ZHONEYPOT_TOKEN_PATH
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-[hsl(var(--accent))]"
            >
              Cancel
            </button>
            <button
              onClick={() => createMutation.mutate(form as AutoResponse)}
              disabled={!form.name || createMutation.isPending}
              className="rounded-md bg-[hsl(var(--primary))] px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
            >
              Create Rule
            </button>
          </div>
        </div>
      )}

      {isLoading && <div className="text-sm text-[hsl(var(--muted-foreground))]">Loading…</div>}

      {rules.length === 0 && !showForm && (
        <div className="rounded-lg border p-8 text-center text-[hsl(var(--muted-foreground))] text-sm">
          No auto-response rules configured. Rules execute instantly when a token is triggered.
        </div>
      )}

      {rules.map((rule) => (
        <div key={rule.id} className="flex items-center gap-3 rounded-lg border p-4">
          <Zap className="h-4 w-4 text-yellow-500 shrink-0" />
          <div className="flex-1">
            <div className="font-medium text-sm">{rule.name}</div>
            <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-[hsl(var(--muted-foreground))]">
              <span>min: {rule.min_severity}</span>
              {rule.lock_file && <span className="text-orange-600">lock file</span>}
              {rule.kill_process && <span className="text-red-600">kill process</span>}
              {rule.run_script && <span className="font-mono">{rule.run_script}</span>}
            </div>
          </div>
          <button
            onClick={() => deleteMutation.mutate(rule.id)}
            className="rounded p-1 hover:bg-red-100 text-[hsl(var(--muted-foreground))] hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Anomaly Detection ──────────────────────────────────────────────────────

function AnomalyTab() {
  const { data: tokens = [] } = useQuery({
    queryKey: TOKENS_KEY,
    queryFn: TokensAPI.list,
  });
  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  const { data: baseline, isLoading: baselineLoading } = useQuery({
    queryKey: ["baseline", selectedToken],
    queryFn: () => AutonomousAPI.getBaseline(selectedToken!),
    enabled: !!selectedToken,
  });

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const selectedDef = tokens.find((t) => t.id === selectedToken);

  return (
    <div className="space-y-5">
      {/* What this does */}
      <div className="rounded-lg border-l-4 border-blue-400 bg-blue-50 dark:bg-blue-950 px-4 py-3 space-y-2">
        <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">How anomaly detection works</p>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          ZHoneyPot records <em>when</em> each token is accessed (hour of day, day of week). After enough
          history it builds a baseline — your normal access pattern. If a token is accessed at an unusual
          time (e.g. 3am when it's normally only touched during business hours), the alert severity is
          automatically escalated to <strong>Critical</strong>.
        </p>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Nothing to configure</strong> — it activates automatically once a token has at least
          5 recorded accesses. Select a token below to inspect its current baseline.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Inspect baseline for token</label>
        <Select
          value={selectedToken ?? ""}
          onChange={(e) => setSelectedToken(e.target.value || null)}
          className="w-full max-w-sm"
        >
          <option value="">— select a token —</option>
          {tokens.map((t) => (
            <option key={t.id} value={t.id}>
              {t.display_name ?? t.kind} · {t.path}
            </option>
          ))}
        </Select>
        {tokens.length === 0 && (
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">No tokens deployed yet.</p>
        )}
      </div>

      {selectedToken && baselineLoading && (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading baseline…</p>
      )}

      {selectedToken && !baselineLoading && !baseline && (
        <div className="rounded-lg border border-dashed p-6 text-center space-y-2">
          <p className="font-medium text-sm">No baseline yet for "{selectedDef?.display_name ?? selectedDef?.kind}"</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            This token needs at least <strong>5 recorded accesses</strong> before anomaly detection
            activates. Trigger the token a few times (use the Test button on Active Tokens) and
            the baseline will appear here automatically.
          </p>
        </div>
      )}

      {baseline && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex-1 text-sm">
              <span className="font-medium">{baseline.total_accesses}</span>
              <span className="text-[hsl(var(--muted-foreground))]"> total accesses recorded</span>
            </div>
            {baseline.total_accesses >= 5
              ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Anomaly detection active</span>
              : <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Building baseline ({baseline.total_accesses}/5)</span>
            }
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="mb-1 text-sm font-medium">Hour-of-Day Access Pattern</h3>
            <p className="mb-3 text-xs text-[hsl(var(--muted-foreground))]">
              Bars show how often this token was accessed at each hour. A tall bar = many accesses at that hour.
              Accesses in flat/empty regions trigger anomaly escalation.
            </p>
            <div className="flex items-end gap-0.5 h-16">
              {baseline.hour_histogram.map((v, h) => {
                const max = Math.max(...baseline.hour_histogram, 1);
                const height = Math.round((v / max) * 100);
                return (
                  <div key={h} className="flex-1" title={`${h}:00 — ${v} access${v !== 1 ? "es" : ""}`}>
                    <div
                      className="w-full rounded-t bg-[hsl(var(--primary))] opacity-80 min-h-[2px]"
                      style={{ height: `${Math.max(height, v > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="mb-1 text-sm font-medium">Day-of-Week Access Pattern</h3>
            <p className="mb-3 text-xs text-[hsl(var(--muted-foreground))]">
              Accesses on days with very few historical entries will be escalated.
            </p>
            <div className="flex items-end gap-1 h-12">
              {baseline.day_histogram.map((v, d) => {
                const max = Math.max(...baseline.day_histogram, 1);
                const height = Math.round((v / max) * 100);
                return (
                  <div key={d} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-[hsl(var(--primary))] opacity-80 min-h-[2px]"
                      style={{ height: `${Math.max(height, v > 0 ? 8 : 0)}%` }}
                    />
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">{DAYS[d]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {description && <div className="text-xs text-[hsl(var(--muted-foreground))]">{description}</div>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`shrink-0 relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--muted))]"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-1"}`} />
      </button>
    </div>
  );
}
