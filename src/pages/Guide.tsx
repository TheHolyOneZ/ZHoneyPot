import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface Section {
  id: string;
  title: string;
  content: React.ReactNode;
}

const SECTIONS: Section[] = [
  {
    id: "what",
    title: "What is ZHoneyPot?",
    content: (
      <div className="space-y-3 text-sm">
        <p>
          ZHoneyPot is a <strong>local honeypot toolkit</strong> for security-conscious individuals.
          It creates convincing fake files — AWS credentials, SSH keys, .env files, git repos — and
          alerts you the moment anything reads, writes, or deletes them.
        </p>
        <p>
          Think of them as <em>tripwires</em>. No legitimate software touches these files, so any
          access means something is wrong: an intruder, malware, or a runaway script.
        </p>
        <p>
          Unlike SaaS honeypot services, <strong>ZHoneyPot never phones home</strong>. All data
          stays on your machine. No telemetry, no cloud account required.
        </p>
      </div>
    ),
  },
  {
    id: "token-types",
    title: "Token Types — What Each One Is",
    content: (
      <div className="space-y-4 text-sm">
        <TokenExplainer
          name="AWS Credentials"
          file="~/.aws/credentials"
          what="Fake Amazon Web Services access keys in the real format (AKIA… + 40-char secret). Attackers who steal these expect to pivot into cloud infrastructure."
          signal="Any read = credential harvester, exfiltration tool, or unauthorized human access."
        />
        <TokenExplainer
          name="SSH Keypair"
          file="~/.ssh/id_rsa_backup"
          what="A real PEM-formatted private key (ed25519 or RSA). The file looks exactly like a backup of your main SSH key."
          signal="Any read = SSH key stealer, backup script gone wrong, or attacker enumerating ~/.ssh."
        />
        <TokenExplainer
          name=".env File"
          file="~/projects/myapp/.env"
          what="A dotenv file with realistic variable names (DATABASE_URL, STRIPE_SECRET_KEY, JWT_SECRET). The most commonly leaked file in developer breaches."
          signal="Any read = source code scraper, developer tool misconfiguration, or insider threat."
        />
        <TokenExplainer
          name="Git Repository"
          file="~/projects/internal-tools/"
          what="A fake git repo with real commits, where a 'leaked' credential is planted 3–5 commits deep in history. Mimics an accidentally-committed secret."
          signal="Any git log or history traversal = someone digging for old secrets."
        />
        <TokenExplainer
          name="Passwords.txt"
          file="~/Documents/passwords.txt"
          what='A plaintext file with fake credentials in the format attackers expect ("site: password"). A classic honeypot because it looks like an amateur storing passwords unsafely.'
          signal="Any read = credential harvester or opportunistic attacker."
        />
        <TokenExplainer
          name="Kubeconfig"
          file="~/.kube/config"
          what="Fake Kubernetes cluster credentials. Valuable to attackers who want to pivot into container infrastructure."
          signal="Any read = cloud-native attacker, kubectl-aware script, or misconfigured CI/CD."
        />
        <TokenExplainer
          name="Docker Config"
          file="~/.docker/config.json"
          what="Fake Docker Hub or private registry credentials in the real format."
          signal="Any read = container-aware attacker or compromised build pipeline."
        />
        <TokenExplainer
          name=".npmrc / .pypirc"
          file="~/.npmrc or ~/.pypirc"
          what="Fake registry auth tokens for npm or PyPI. High value because they allow publishing malicious packages."
          signal="Any read = supply chain attack reconnaissance."
        />
        <TokenExplainer
          name="Generic File"
          file="anywhere"
          what="A custom file with content you define. Use this for domain-specific decoys (database dumps, API response files, config files)."
          signal="Any access = whatever threat model you had in mind when placing it."
        />
      </div>
    ),
  },
  {
    id: "watchers",
    title: "Watchers — What '0 watchers' Means",
    content: (
      <div className="space-y-3 text-sm">
        <p>
          A <strong>watcher</strong> is a live inotify subscription on a single file or directory.
          Every token you deploy gets one watcher. When anything reads, writes, renames, or deletes
          that file, the kernel instantly notifies ZHoneyPot — no polling, no delay.
        </p>
        <p>
          <strong>"0 watchers"</strong> at startup is normal if you haven't deployed any tokens yet,
          or if all token files are missing from disk (they were deleted externally).
          As soon as you deploy a token, the count increases by one.
        </p>
        <p>
          The watcher count in the top bar shows how many files are <em>actively</em> being monitored
          right now. If a token file doesn't exist yet (e.g. you created a token but the file was
          removed), it won't have a watcher until the self-healer recreates it.
        </p>
        <div className="rounded-md border bg-[hsl(var(--muted))] p-3 text-xs font-mono space-y-1">
          <p>Daemon running · 3 watchers  →  3 honeyfiles being monitored</p>
          <p>Daemon running · 0 watchers  →  no tokens deployed yet</p>
        </div>
      </div>
    ),
  },
  {
    id: "false-positives",
    title: "False Positives — Distinguishing Real Threats from Your OS",
    content: (
      <div className="space-y-3 text-sm">
        <p>
          <strong>A false positive</strong> is an alert triggered by a benign program on your own machine,
          not an attacker. The most common sources are:
        </p>
        <div className="space-y-2">
          {[
            ["GNOME Tracker / tracker-miner-fs", "Indexes file content for GNOME Search. It reads every new file shortly after creation."],
            ["Baloo", "KDE's equivalent file indexer. Same behavior."],
            ["Nautilus / Dolphin / Thunar / Nemo", "File managers that generate thumbnail previews read files when you open their parent folder."],
            ["VS Code / code", "Opens .env files and credential files if they're in a workspace you have open."],
            ["Backup tools (rsync, Timeshift, Déjà Dup)", "Read all files in your home directory on schedule."],
          ].map(([name, desc]) => (
            <div key={name as string} className="rounded-md border p-2 space-y-0.5">
              <p className="font-semibold text-xs">{name}</p>
              <p className="text-[hsl(var(--muted-foreground))] text-xs">{desc}</p>
            </div>
          ))}
        </div>
        <p className="font-semibold pt-1">How to tell a false positive from a real threat:</p>
        <ol className="list-decimal ml-4 space-y-1 text-[hsl(var(--muted-foreground))]">
          <li>Click the alert → look at <strong>Process</strong> in Forensics. If it's <code>tracker-miner-fs-3</code>, <code>baloo_file</code>, or <code>nautilus</code> — it's your OS.</li>
          <li>Check <strong>Parent Chain</strong>. A legitimate indexer has a chain like <code>systemd → tracker-miner-fs-3</code>. A suspicious process might show <code>bash → python3 → wget</code>.</li>
          <li>Check <strong>Network Snapshot</strong>. If the accessing process had active connections to an external IP, that's a strong indicator of exfiltration.</li>
          <li>Check the <strong>time</strong>. A 3am access when you never work nights is anomalous — Anomaly Detection will flag this automatically.</li>
          <li>ZHoneyPot auto-detects known indexers and shows a blue <strong>"Likely false positive"</strong> banner on the alert. Red = no known indexer process found.</li>
        </ol>
        <p className="text-[hsl(var(--muted-foreground))]">
          Click <strong>Acknowledge</strong> on confirmed false positives to keep your inbox clean.
          Acknowledged alerts are dimmed but never deleted — they stay in the tamper-evident chain.
        </p>
      </div>
    ),
  },
  {
    id: "dashboard",
    title: "Dashboard — What Each Section Shows",
    content: (
      <div className="space-y-3 text-sm">
        <GuideItem title="Daemon Status">
          Shows whether the background watcher is running. If it shows Stopped or Degraded, your
          tokens are not being monitored. The watcher auto-restarts after crashes.
        </GuideItem>
        <GuideItem title="Watcher Count">
          How many files are actively monitored by the kernel right now. Should equal the number
          of active tokens whose files exist on disk.
        </GuideItem>
        <GuideItem title="Token Counts">
          How many tokens are active, disabled, or missing from disk.
          Missing means a token file was deleted externally — the self-healer can recreate it.
        </GuideItem>
        <GuideItem title="Recent Alerts">
          The last few trigger events. Click any row to see the full forensic detail including
          which process accessed the file.
        </GuideItem>
        <GuideItem title="Hash Chain Badge">
          ZHoneyPot chains every alert cryptographically (BLAKE3). The badge turns red if any
          alert was tampered with in the database — a tamper indicator for post-incident forensics.
        </GuideItem>
        <GuideItem title="inotify Warning">
          Linux limits how many files the kernel watches. If this banner appears, run the suggested
          sysctl command to raise the limit.
        </GuideItem>
      </div>
    ),
  },
  {
    id: "autonomous",
    title: "Autonomous — What Each Feature Does",
    content: (
      <div className="space-y-4 text-sm">
        <GuideItem title="Smart Scanner">
          Inspects your home directory for installed tools (aws CLI, kubectl, docker, git repos)
          and suggests matching decoys you haven't deployed yet. A coverage score shows how well
          your honeypot net covers your attack surface. One-click Deploy creates the token immediately.
        </GuideItem>
        <GuideItem title="Self-Healing">
          When a token file is deleted or goes missing, ZHoneyPot automatically recreates it after
          a configurable delay (default 60 seconds). This ensures your tripwires stay in place even
          if an attacker or cleanup script removes them.
        </GuideItem>
        <GuideItem title="Auto-Response">
          Rules that fire automatically when a token is triggered. Three action types:
          <ul className="mt-2 ml-4 list-disc space-y-1">
            <li><strong>Lock File</strong> — sets the file to mode 000 (no permissions), blocking further reads.</li>
            <li><strong>Kill Process</strong> — sends SIGTERM to the process that triggered the alert.</li>
            <li><strong>Run Script</strong> — executes a shell command you specify. Environment variables
              ZHONEYPOT_ALERT_ID, ZHONEYPOT_SEVERITY, ZHONEYPOT_TOKEN_PATH are set.</li>
          </ul>
          Rules can be filtered by severity threshold and by specific token.
        </GuideItem>
        <GuideItem title="Anomaly Detection">
          Learns the normal access pattern for each token (hour of day, day of week). After enough
          history, it flags accesses that fall in historically rare time windows (&lt;5% frequency).
          A 3am access to AWS credentials when you never work nights is a stronger signal than
          a 2pm access during business hours.
        </GuideItem>
      </div>
    ),
  },
  {
    id: "alerts",
    title: "Alerts — Reading the Forensic Detail",
    content: (
      <div className="space-y-3 text-sm">
        <GuideItem title="Process Info">
          Captured at trigger time from /proc. Shows the PID, full command line, executable path
          with SHA-256 hash, working directory, and the chain of parent processes up to PID 1.
          Use the parent chain to determine whether the access came from a shell, a systemd service,
          a browser, or something unexpected.
        </GuideItem>
        <GuideItem title="Network Snapshot">
          Open TCP/UDP connections at the moment of the trigger, pulled from /proc/net/tcp.
          If the accessing process had active connections to an external IP, they appear here.
        </GuideItem>
        <GuideItem title="Event Kind">
          <strong>read</strong> — file was opened for reading (most common for credential theft)<br />
          <strong>write</strong> — file content was modified (possible tampering or exfiltration)<br />
          <strong>delete</strong> — file was removed<br />
          <strong>rename</strong> — file was moved (common with editors doing atomic saves)<br />
          <strong>attr</strong> — file permissions or metadata changed<br />
          <strong>test</strong> — synthetic alert triggered by the Test button
        </GuideItem>
        <GuideItem title="Hash Chain Verification">
          Click "Verify Chain" in Alert Inbox to cryptographically verify every alert hasn't been
          tampered with. If an alert's database row was edited, the chain breaks at that index.
        </GuideItem>
      </div>
    ),
  },
  {
    id: "requirements",
    title: "System Requirements",
    content: (
      <div className="space-y-3 text-sm">
        <div className="rounded-md border p-3 space-y-2">
          <p className="font-semibold">Operating System</p>
          <p>Linux (primary). inotify is used for file watching — this is a Linux kernel feature.</p>
          <p className="text-[hsl(var(--muted-foreground))]">
            Windows and macOS support is planned for a future release using platform-native equivalents
            (FSEvents on macOS, ReadDirectoryChangesW on Windows).
          </p>
        </div>
        <div className="rounded-md border p-3 space-y-2">
          <p className="font-semibold">inotify Watch Limit</p>
          <p>
            Linux limits the number of files the kernel can watch simultaneously.
            The default (8192) is often too low for large home directories.
            If ZHoneyPot shows an inotify warning, run:
          </p>
          <code className="block bg-[hsl(var(--muted))] rounded px-3 py-2 font-mono text-xs">
            echo 65536 | sudo tee /proc/sys/fs/inotify/max_user_watches
          </code>
          <p className="text-[hsl(var(--muted-foreground))]">
            To make it permanent, add <code>fs.inotify.max_user_watches=65536</code> to /etc/sysctl.conf.
          </p>
        </div>
        <div className="rounded-md border p-3 space-y-2">
          <p className="font-semibold">Forensic Capture</p>
          <p>
            Process info is read from /proc and requires no special privileges. PID correlation
            uses inode scanning of /proc/*/fd/ — this works as a normal user but may miss
            short-lived processes. Root-level fanotify or eBPF tracing would give more reliable
            attribution and is planned for a future release.
          </p>
        </div>
        <div className="rounded-md border p-3 space-y-2">
          <p className="font-semibold">Auto-Response: Kill Process</p>
          <p>
            The Kill Process auto-response sends SIGTERM to the offending PID. This requires
            that ZHoneyPot runs as the same user as the process being killed, or as root.
            You cannot kill processes owned by other users without elevated permissions.
          </p>
        </div>
        <div className="rounded-md border p-3 space-y-2">
          <p className="font-semibold">Desktop Notifications</p>
          <p>
            Notifications require a notification daemon (e.g. dunst, mako, or GNOME's built-in).
            On GNOME 45+, action buttons in notifications require the AppIndicator extension for
            the tray icon to function correctly.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "callback",
    title: "Callback Server — What It Is & How to Test It",
    content: (
      <div className="space-y-3 text-sm">
        <p>
          The <strong>callback server</strong> is an optional companion HTTP server for <em>network-based</em> detection.
          File watchers catch local access. The callback server catches access from <em>anywhere on the internet</em> —
          if an attacker exfiltrates your fake AWS key and tries to use it, your callback server receives a ping.
        </p>
        <p>
          It is <strong>not required</strong> for local honeypotting. File-based tokens work entirely without it.
          Only set it up if you want remote detection.
        </p>
        <p className="font-semibold">Quick test with Python (no external service needed):</p>
        <p className="text-[hsl(var(--muted-foreground))]">
          Open a terminal and run this to start a local HTTP server that prints every request:
        </p>
        <code className="block bg-[hsl(var(--muted))] rounded px-3 py-2 font-mono text-xs whitespace-pre">
          python3 -m http.server 8765
        </code>
        <p className="text-[hsl(var(--muted-foreground))]">
          Then in Settings → Callback, set Server URL to <code>http://localhost:8765</code> and click Send Test.
          You should see a GET request appear in the Python terminal. That confirms the connection works.
        </p>
        <p className="font-semibold">For production use:</p>
        <p className="text-[hsl(var(--muted-foreground))]">
          Run the callback server on a VPS or home server you control. Set its public URL in Settings.
          The server must be reachable from the internet if you want remote-access detection.
          Set an HMAC secret in both the server and Settings so only your server accepts pings.
        </p>
        <p className="font-semibold">What the callback server has to do with token files:</p>
        <p className="text-[hsl(var(--muted-foreground))]">
          When you create a token, you can optionally fill in a <strong>Callback URL</strong> per token.
          If someone reads that file and the content contains a URL pointing to your callback server
          (e.g. embedded in a fake API config), and they make a request to that URL, your server is notified.
          This is how DNS canary tokens work — you embed a domain you own, and DNS lookup = alert.
          For file-based tokens, the local file watcher is the primary detection method.
        </p>
      </div>
    ),
  },
  {
    id: "faq",
    title: "FAQ",
    content: (
      <div className="space-y-4 text-sm">
        <FAQ q='What does "Acknowledge" mean on an alert?'>
          Acknowledge (previously shown as "Ack") means you've seen the alert and decided it's
          not an active threat — either a false positive, a test trigger, or an incident you've
          already handled. Acknowledged alerts are dimmed in the inbox but never deleted.
          They remain in the tamper-evident hash chain. Think of it like marking an email as read.
        </FAQ>
        <FAQ q="Will this generate false positives from my own tools?">
          Yes, especially right after deploying tokens. Your OS file indexer (GNOME Tracker, Baloo)
          will read new files almost immediately. ZHoneyPot detects known indexers and shows a blue
          "Likely false positive" banner. Acknowledge those and watch for alerts from unknown processes.
        </FAQ>
        <FAQ q="Can I place tokens outside my home directory?">
          Yes. The path picker in the Token Creator accepts any path you have write access to.
          High-value locations include /tmp, /var/backups, and project directories.
        </FAQ>
        <FAQ q="Does ZHoneyPot slow down file access?">
          No. inotify is event-driven and kernel-level. There is no hook inserted into file
          system calls. The only overhead is the async Rust handler that fires after the access
          has already completed.
        </FAQ>
        <FAQ q="What happens if the app crashes?">
          The watcher supervisor will attempt to restart. If the whole process dies, the autostart
          entry will relaunch it on next login. Alerts are written to an append-only JSONL file
          as a backup alongside the SQLite database.
        </FAQ>
        <FAQ q="Can I export my alert data?">
          Alerts are mirrored to ~/.local/share/zhoneypot/alerts.jsonl in real time. You can also
          export individual forensic reports to JSON or Markdown from the Alert Detail page.
        </FAQ>
        <FAQ q="What does 'dedup count' mean on an alert?">
          If the same token was accessed multiple times within 30 seconds, ZHoneyPot collapses
          them into one alert and increments the dedup count. This prevents alert floods from
          tools that scan files in rapid succession.
        </FAQ>
        <FAQ q="Is the network callback server required?">
          No. The callback server is an optional companion for network-triggered tokens (e.g. DNS
          canaries). File-based tokens work entirely locally with no network component.
        </FAQ>
      </div>
    ),
  },
];

export function Guide() {
  const [open, setOpen] = useState<string | null>("what");

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="ZHoneyPot" className="h-8 w-8 rounded-lg shrink-0" />
        <h1 className="text-2xl font-bold">Guide</h1>
      </div>

      {/* BETA notice */}
      <div className="rounded-xl border-2 border-orange-400/70 bg-orange-50 dark:bg-orange-950/25 p-4 flex gap-3">
        <div className="shrink-0 mt-0.5">
          <span className="inline-block rounded-md bg-orange-500 px-2.5 py-1 text-xs font-black uppercase tracking-widest text-white">
            BETA
          </span>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
            ZHoneyPot v0.1.0 — Public Beta
          </p>
          <p className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed">
            You are running a beta release. Core detection, alerting, and forensics are fully functional.
            The database schema may change before v1.0 — back up{" "}
            <code className="font-mono">~/.local/share/zhoneypot/</code> before upgrading.
            Found a bug? Open an issue on{" "}
            <strong>github.com/TheHolyOneZ/ZHoneyPot</strong>.
          </p>
        </div>
      </div>

      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Everything you need to know about ZHoneyPot — click a section to expand it.
      </p>

      <div className="space-y-2">
        {SECTIONS.map((s) => (
          <div key={s.id} className="rounded-lg border overflow-hidden">
            <button
              onClick={() => setOpen(open === s.id ? null : s.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left font-medium hover:bg-[hsl(var(--accent))] transition-colors"
            >
              <span>{s.title}</span>
              {open === s.id
                ? <ChevronDown className="h-4 w-4 shrink-0" />
                : <ChevronRight className="h-4 w-4 shrink-0" />
              }
            </button>
            {open === s.id && (
              <div className="px-4 pb-4 pt-1 border-t bg-[hsl(var(--card))]">
                {s.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TokenExplainer({ name, file, what, signal }: { name: string; file: string; what: string; signal: string }) {
  return (
    <div className="rounded-md border p-3 space-y-1">
      <p className="font-semibold">{name}</p>
      <p className="font-mono text-xs text-[hsl(var(--muted-foreground))]">{file}</p>
      <p className="text-[hsl(var(--foreground))]">{what}</p>
      <p className="text-[hsl(var(--muted-foreground))]"><strong>Alert signal:</strong> {signal}</p>
    </div>
  );
}

function GuideItem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="font-semibold">{title}</p>
      <div className="text-[hsl(var(--muted-foreground))]">{children}</div>
    </div>
  );
}

function FAQ({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="font-semibold">{q}</p>
      <p className="text-[hsl(var(--muted-foreground))]">{children}</p>
    </div>
  );
}
