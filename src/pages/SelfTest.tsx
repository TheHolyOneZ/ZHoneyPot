import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import {
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Loader2,
  X,
  XCircle,
} from "lucide-react";
import { SelfTestAPI } from "@/ipc/selftest";
import { cn } from "@/lib/cn";
import type { TestResult } from "@/lib/types";


const ESTIMATED_TEST_COUNT = 26;

const GROUP_ORDER = [
  "Core DB",
  "Token Generators",
  "Disk I/O",
  "File Watcher",
  "Token DB",
  "Alert Pipeline",
  "Hash Chain",
  "Anomaly Detection",
  "Auto-Response",
  "Self-Heal",
  "Cleanup",
];

export function SelfTest() {
  const [streaming, setStreaming] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const unlistenRef = useRef<(() => void) | null>(null);

  const mutation = useMutation({
    mutationFn: SelfTestAPI.run,
    onSuccess: () => {
      setRunning(false);
      setDone(true);
    },
    onError: () => {
      setRunning(false);
      setDone(true);
    },
  });

  const start = async () => {

    unlistenRef.current?.();
    setStreaming([]);
    setExpanded(new Set());
    setDone(false);
    setRunning(true);


    const unlisten = await listen<TestResult>("selftest:progress", (event) => {
      setStreaming((prev) => [...prev, event.payload]);

      if (!event.payload.passed) {
        setExpanded((prev) => new Set([...prev, event.payload.name]));
      }
    });
    unlistenRef.current = unlisten;

    mutation.mutate();
  };


  useEffect(() => () => { unlistenRef.current?.(); }, []);


  const passed = streaming.filter((r) => r.passed).length;
  const total = streaming.length;
  const allPass = done && total > 0 && passed === total;
  const totalMs = streaming.reduce((a, r) => a + r.duration_ms, 0);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <FlaskConical className="h-6 w-6 text-[hsl(var(--primary))]" />
        <h1 className="text-2xl font-bold">Self-Test</h1>
        <span className="rounded-full bg-purple-100 dark:bg-purple-900 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-200">
          QA Suite
        </span>
      </div>


      {!running && !done && (
        <div className="rounded-lg border p-4 space-y-3 text-sm">
          <p className="font-medium">What gets tested</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[hsl(var(--muted-foreground))]">
            {[
              ["Core DB", "Connectivity + settings round-trip"],
              ["All 9 token types", "Content generation + format checks"],
              ["Disk I/O", "Write file + verify content hash"],
              ["File Watcher", "Acts as offender — reads a canary file, checks inotify fires"],
              ["Alert Pipeline", "Full trigger → DB insert → retrieval"],
              ["Hash Chain", "Append + verify tamper-evident chain"],
              ["Anomaly Detection", "Baseline creation after observe()"],
              ["Auto-Response", "CRUD — create, list, delete rules"],
              ["Self-Heal", "Enqueue missing token for healing"],
              ["Cleanup", "All test data removed from DB + disk"],
            ].map(([name, desc]) => (
              <div key={name} className="contents">
                <span className="font-medium text-[hsl(var(--foreground))]">{name}</span>
                <span>{desc}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Tests run against the live database. All data is written to <code>/tmp</code> and cleaned up automatically. Your existing tokens and alerts are not modified.
          </p>
        </div>
      )}


      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={start}
          disabled={running}
          className="flex items-center gap-2 rounded-md bg-[hsl(var(--primary))] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {running
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Running ({total} / ~{ESTIMATED_TEST_COUNT})…</>
            : <><FlaskConical className="h-4 w-4" /> {done ? "Run Again" : "Run All Tests"}</>
          }
        </button>

        {done && (
          <div className={cn("flex items-center gap-2 text-sm font-semibold", allPass ? "text-green-600" : "text-red-500")}>
            {allPass
              ? <><CheckCircle className="h-5 w-5" /> All {total} tests passed in {totalMs}ms</>
              : <><XCircle className="h-5 w-5" /> {passed}/{total} passed · {total - passed} failed · {totalMs}ms</>
            }
          </div>
        )}
      </div>


      {(running || done) && (
        <div className="rounded-full bg-[hsl(var(--muted))] h-1.5 overflow-hidden">
          <div
            className={cn("h-full transition-all duration-300", allPass ? "bg-green-500" : done ? "bg-amber-500" : "bg-[hsl(var(--primary))]")}
            style={{ width: `${Math.min((total / ESTIMATED_TEST_COUNT) * 100, 100)}%` }}
          />
        </div>
      )}


      {(running || done) && (
        <div className="space-y-4">
          {GROUP_ORDER.map((group) => {
            const groupResults = streaming.filter((r) => r.group === group);
            const isActiveGroup = running && groupResults.length > 0 &&
              groupResults.length < getExpectedCount(group);

            if (groupResults.length === 0 && !running) return null;

            return (
              <div key={group}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                  {group}
                </p>
                <div className="space-y-1">
                  {groupResults.map((r) => (
                    <TestRow
                      key={r.name}
                      result={r}
                      expanded={expanded.has(r.name)}
                      onToggle={() => setExpanded((prev) => {
                        const next = new Set(prev);
                        next.has(r.name) ? next.delete(r.name) : next.add(r.name);
                        return next;
                      })}
                    />
                  ))}

                  {(isActiveGroup || (running && groupResults.length === 0)) &&
                    Array.from({ length: isActiveGroup ? 1 : getExpectedCount(group) }, (_, i) => (
                      <SkeletonRow key={i} />
                    ))
                  }
                </div>
              </div>
            );
          })}


          {running && total < 5 && (
            <div className="space-y-2 opacity-40">
              {[2, 3, 4].map((n) => <SkeletonRow key={n} wide />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TestRow({ result, expanded, onToggle }: {
  result: TestResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasDetail = result.detail || result.error;
  return (
    <div className={cn("rounded-lg border overflow-hidden", result.passed ? "border-green-200 dark:border-green-800" : "border-red-300 dark:border-red-800")}>
      <button
        onClick={hasDetail ? onToggle : undefined}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 text-left text-sm",
          result.passed ? "bg-green-50 dark:bg-green-950/40" : "bg-red-50 dark:bg-red-950/40",
          hasDetail && "cursor-pointer hover:brightness-95",
        )}
      >
        {result.passed
          ? <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
          : <XCircle className="h-4 w-4 shrink-0 text-red-500" />
        }
        <span className="flex-1 font-medium">{result.name}</span>
        <span className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums">{result.duration_ms}ms</span>
        {hasDetail && (expanded
          ? <ChevronDown className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
          : <ChevronRight className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
        )}
      </button>
      {expanded && hasDetail && (
        <div className={cn(
          "border-t px-3 py-2 text-xs font-mono whitespace-pre-wrap break-all",
          result.passed
            ? "border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
            : "border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
        )}>
          {result.detail && <span><Check className="inline h-3 w-3" /> {result.detail}</span>}
          {result.error && <span><X className="inline h-3 w-3" /> {result.error}</span>}
        </div>
      )}
    </div>
  );
}

function SkeletonRow({ wide }: { wide?: boolean }) {
  return (
    <div className="rounded-lg border border-[hsl(var(--border))] px-3 py-2 flex items-center gap-3 animate-pulse">
      <div className="h-4 w-4 rounded-full bg-[hsl(var(--muted))] shrink-0" />
      <div className={cn("h-3 rounded bg-[hsl(var(--muted))]", wide ? "w-48" : "w-36")} />
      <div className="flex-1" />
      <div className="h-3 w-8 rounded bg-[hsl(var(--muted))]" />
    </div>
  );
}

function getExpectedCount(group: string): number {
  const counts: Record<string, number> = {
    "Core DB": 2,
    "Token Generators": 9,
    "Disk I/O": 2,
    "File Watcher": 1,
    "Token DB": 1,
    "Alert Pipeline": 2,
    "Hash Chain": 2,
    "Anomaly Detection": 2,
    "Auto-Response": 3,
    "Self-Heal": 1,
    "Cleanup": 1,
  };
  return counts[group] ?? 2;
}
