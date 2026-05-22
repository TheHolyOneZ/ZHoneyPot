import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Activity,
  AlertTriangle,
  ExternalLink,
  GitBranch,
  Globe,
  Link2,
  Lock,
  Shield,
  Zap,
} from "lucide-react";

const STATS = [
  { value: "10", label: "Token types" },
  { value: "< 1s", label: "Detection" },
  { value: "BLAKE3", label: "Hash chain" },
  { value: "Zero", label: "Telemetry" },
];

const FEATURES = [
  {
    icon: Shield,
    title: "Format-accurate decoys",
    desc: "10 token types that match real credential formats exactly — attackers can't tell them from the real thing.",
  },
  {
    icon: Zap,
    title: "Sub-second inotify detection",
    desc: "Linux kernel-level file watching fires alerts within milliseconds of any read, write, rename, or delete.",
  },
  {
    icon: Link2,
    title: "Tamper-evident chain",
    desc: "Every alert is chained with BLAKE3. Any post-hoc modification to the alert database is immediately flagged.",
  },
  {
    icon: Activity,
    title: "Forensic /proc capture",
    desc: "At trigger time: full process tree, cmdline, exe SHA-256, open FDs, and a live network snapshot from /proc.",
  },
];

const STACK = [
  {
    category: "Desktop Shell",
    items: [
      { name: "Tauri v2", desc: "Rust-powered native desktop framework — no Electron, minimal footprint" },
      { name: "WebKitGTK", desc: "Native OS webview for the UI layer" },
    ],
  },
  {
    category: "Backend (Rust)",
    items: [
      { name: "tokio", desc: "Async runtime driving all background tasks concurrently" },
      { name: "notify + debouncer", desc: "inotify-based file watching with 300 ms debounce" },
      { name: "sqlx + SQLite", desc: "Async compile-time-checked queries, WAL mode" },
      { name: "blake3", desc: "Cryptographic hash chain over all alerts" },
      { name: "procfs", desc: "Linux /proc parsing for forensic snapshots at trigger time" },
      { name: "ed25519-dalek + rsa", desc: "Real SSH keypair generation for realistic decoys" },
      { name: "git2", desc: "Fake git repository construction with real commit history" },
      { name: "reqwest (rustls)", desc: "Webhook HTTP delivery — no OpenSSL" },
      { name: "uuid v7", desc: "Sortable unique IDs for all records" },
      { name: "tracing + appender", desc: "Structured rolling-file application logging" },
    ],
  },
  {
    category: "Frontend (TypeScript)",
    items: [
      { name: "React 18", desc: "UI component library" },
      { name: "Vite 7", desc: "Build tooling with instant HMR" },
      { name: "TanStack Router", desc: "Type-safe client-side routing" },
      { name: "TanStack Query", desc: "Server-state caching, automatic refetch, invalidation" },
      { name: "Tailwind CSS v4", desc: "Utility-first styling with CSS variable dark mode" },
      { name: "shadcn/ui + Radix UI", desc: "Accessible component primitives" },
      { name: "Zustand", desc: "Lightweight client state" },
    ],
  },
];

export function About() {
  const link = (url: string) => openUrl(url).catch(() => {});

  return (
    <div className="max-w-2xl space-y-8 pb-16">


      <div className="flex items-center gap-3 rounded-xl border-2 border-orange-400/70 bg-orange-50 dark:bg-orange-950/25 px-4 py-3">
        <span className="shrink-0 rounded-md bg-orange-500 px-2 py-0.5 text-xs font-black uppercase tracking-widest text-white">
          BETA
        </span>
        <p className="text-sm text-orange-800 dark:text-orange-200">
          v0.1.0 public beta — core features are stable, but the database schema may change before 1.0.
          Back up <code className="font-mono text-xs">~/.local/share/zhoneypot/</code> before upgrading.
        </p>
      </div>


      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-[hsl(var(--card))] via-[hsl(var(--card))] to-[hsl(var(--primary)/0.08)] p-8">

        <div className="pointer-events-none absolute -right-8 -top-8 opacity-[0.04]">
          <img src="/logo.png" alt="" className="h-48 w-48" />
        </div>

        <div className="relative flex items-center gap-5">
          <img
            src="/logo.png"
            alt="ZHoneyPot"
            className="h-20 w-20 rounded-2xl shadow-lg ring-2 ring-[hsl(var(--primary)/0.2)] shrink-0"
          />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-extrabold tracking-tight">ZHoneyPot</h1>
              <span className="rounded-full border border-orange-400/60 bg-orange-100 dark:bg-orange-900/40 px-2.5 py-0.5 text-xs font-bold text-orange-600 dark:text-orange-300 tracking-wide">
                v0.1.0-beta
              </span>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] font-medium max-w-sm">
              Local-first honeypot toolkit for security-conscious individuals
            </p>
          </div>
        </div>

        <p className="relative mt-5 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
          ZHoneyPot places convincing decoy files across your filesystem and alerts you
          the instant anything touches them. Unlike SaaS alternatives it runs entirely on
          your machine with{" "}
          <strong className="text-[hsl(var(--foreground))]">zero telemetry</strong> and{" "}
          <strong className="text-[hsl(var(--foreground))]">zero cloud dependency</strong>.
          No account. No phone-home. Your threat intelligence stays yours.
        </p>


        <div className="relative mt-6 grid grid-cols-4 gap-3">
          {STATS.map(({ value, label }) => (
            <div
              key={label}
              className="rounded-xl border bg-[hsl(var(--background)/0.6)] px-3 py-2.5 text-center backdrop-blur-sm"
            >
              <p className="text-lg font-black text-[hsl(var(--primary))] leading-none">{value}</p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{label}</p>
            </div>
          ))}
        </div>
      </div>


      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
          Core Capabilities
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl border bg-[hsl(var(--card))] p-4 space-y-2 hover:border-[hsl(var(--primary)/0.4)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-[hsl(var(--primary)/0.1)] p-1.5">
                  <Icon className="h-4 w-4 text-[hsl(var(--primary))]" />
                </div>
                <p className="text-sm font-semibold">{title}</p>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>


      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
          Built by
        </h2>
        <div className="rounded-xl border overflow-hidden">

          <div className="bg-gradient-to-r from-[hsl(var(--primary)/0.12)] to-[hsl(var(--primary)/0.04)] px-5 py-4 flex items-center gap-4 border-b">
            <img
              src="/logo.png"
              alt="TheHolyOneZ"
              className="h-12 w-12 rounded-full ring-2 ring-[hsl(var(--primary)/0.3)] shrink-0"
            />
            <div className="flex-1">
              <p className="font-bold text-base tracking-tight">TheHolyOneZ</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                Security tooling · Systems programming · Open source
              </p>
            </div>
          </div>

          <div className="flex divide-x">
            <SocialButton
              icon={<GitBranch className="h-4 w-4" />}
              label="GitHub"
              sub="TheHolyOneZ"
              onClick={() => link("https://github.com/TheHolyOneZ")}
            />
            <SocialButton
              icon={<Globe className="h-4 w-4" />}
              label="Website"
              sub="zsync.eu"
              onClick={() => link("https://zsync.eu")}
            />
            <SocialButton
              icon={<AlertTriangle className="h-4 w-4" />}
              label="ZHoneyPot"
              sub="zsync.eu/zhoneypot"
              onClick={() => link("https://zsync.eu/zhoneypot")}
            />
          </div>
        </div>
      </div>


      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
          Project Links
        </h2>
        <div className="rounded-xl border divide-y overflow-hidden">
          <ProjectLink
            icon={<GitBranch className="h-4 w-4" />}
            title="Source Code"
            subtitle="github.com/TheHolyOneZ/ZHoneyPot"
            onClick={() => link("https://github.com/TheHolyOneZ/ZHoneyPot")}
          />
          <ProjectLink
            icon={<Globe className="h-4 w-4" />}
            title="Project Page"
            subtitle="zsync.eu/zhoneypot"
            onClick={() => link("https://zsync.eu/zhoneypot")}
          />
        </div>
      </div>


      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
          License
        </h2>
        <div className="rounded-xl border p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-green-500 shrink-0" />
            <span className="font-semibold">GNU General Public License v3.0</span>
            <span className="ml-auto shrink-0 rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 text-xs px-2 py-0.5 font-medium">
              Copyleft
            </span>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
            ZHoneyPot is free software. You can use, modify, and distribute it under GPL v3.
            Any derivative work must also be released under GPL v3 — this prevents closed-source
            forks. For a security tool you're trusting to protect your machine, open source is
            the only credible option: you can audit exactly what it does.
          </p>
          <button
            onClick={() => link("https://www.gnu.org/licenses/gpl-3.0.html")}
            className="flex items-center gap-1.5 text-xs text-[hsl(var(--primary))] hover:underline mt-1"
          >
            <ExternalLink className="h-3 w-3" /> Full license text
          </button>
        </div>
      </div>

      {/* Tech stack */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
          Tech Stack
        </h2>
        <div className="space-y-4">
          {STACK.map((section) => (
            <div key={section.category}>
              <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-2">
                {section.category}
              </p>
              <div className="rounded-xl border divide-y overflow-hidden">
                {section.items.map((item) => (
                  <div key={item.name} className="flex items-start gap-3 px-4 py-2.5 hover:bg-[hsl(var(--accent)/0.4)] transition-colors">
                    <span className="font-mono text-xs font-semibold text-[hsl(var(--primary))] w-36 shrink-0 pt-0.5">
                      {item.name}
                    </span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="rounded-xl border border-dashed p-5 text-center space-y-1">
        <p className="font-bold text-[hsl(var(--foreground))] tracking-tight">
          ZHoneyPot{" "}
          <span className="text-[hsl(var(--primary))]">v0.1.0</span>
          <span className="ml-2 text-xs font-normal rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 px-2 py-0.5 border border-orange-400/40">
            BETA
          </span>
        </p>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">Tauri v2 · Rust · React 18 · TypeScript</p>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">GPL-3.0 · Made by TheHolyOneZ · zsync.eu</p>
      </div>
    </div>
  );
}

function SocialButton({ icon, label, sub, onClick }: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-1 px-3 py-3 hover:bg-[hsl(var(--accent))] transition-colors text-center"
    >
      <span className="text-[hsl(var(--primary))]">{icon}</span>
      <span className="text-xs font-semibold">{label}</span>
      <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono leading-none">{sub}</span>
    </button>
  );
}

function ProjectLink({ icon, title, subtitle, onClick }: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[hsl(var(--accent))] transition-colors text-left"
    >
      <span className="text-[hsl(var(--muted-foreground))]">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono truncate">{subtitle}</p>
      </div>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--muted-foreground))]" />
    </button>
  );
}
