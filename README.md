<div align="center">

<img src="public/logo.png" alt="ZHoneyPot" width="120" height="120" style="border-radius: 24px;" />

# ZHoneyPot

**Local-first honeypot toolkit for security-conscious individuals**

[![Version](https://img.shields.io/badge/version-0.1.0--beta-orange?style=flat-square)](https://zsync.eu/zhoneypot)
[![License](https://img.shields.io/badge/license-GPL--3.0-blue?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Linux-lightgrey?style=flat-square)](https://github.com/TheHolyOneZ/ZHoneyPot)
[![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri%20v2-24C8DB?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app)
[![Built with Rust](https://img.shields.io/badge/backend-Rust-CE412B?style=flat-square&logo=rust&logoColor=white)](https://rust-lang.org)
[![Status](https://img.shields.io/badge/status-public%20beta-yellow?style=flat-square)](https://zsync.eu/zhoneypot)

<br/>

[**Download**](https://zsync.eu/zhoneypot) · [**Report a Bug**](https://github.com/TheHolyOneZ/ZHoneyPot/issues) · [**zsync.eu**](https://zsync.eu) · [**Project Page**](https://zsync.eu/zhoneypot)

</div>

---

> [!IMPORTANT]
> ZHoneyPot is in **public beta (v0.1.0)**. Core features are stable and actively used, but the database schema may change between releases. Back up `~/.local/share/zhoneypot/` before upgrading.

## What is ZHoneyPot?

ZHoneyPot places convincing **decoy files** across your filesystem — AWS credentials, SSH keys, `.env` files, kubeconfigs, Docker auth tokens — and **alerts you the instant anything touches them**.

No legitimate software reads your AWS credentials unprompted. Any access means something is wrong: malware, an intruder, or a runaway script. ZHoneyPot catches them the moment they look.

**Unlike SaaS honeypot services:**

| | ZHoneyPot | SaaS (e.g. Canarytokens) |
|---|:---:|:---:|
| Runs entirely on your machine | ✓ | — |
| Zero telemetry | ✓ | — |
| No account required | ✓ | — |
| Works fully offline | ✓ | — |
| GUI-driven desktop app | ✓ | — |
| Free & open source | ✓ | Partial |
| Forensic process capture | ✓ | — |
| Tamper-evident alert log | ✓ | — |

---

## Features

### Decoy Tokens — 10 types

| Token type | What it mimics | Default placement |
|---|---|---|
| `aws_credentials` | AWS access key ID + secret key | `~/.aws/credentials` |
| `ssh_keypair` | SSH private key (ed25519 / RSA) | `~/.ssh/id_rsa_backup` |
| `dotenv` | `.env` with DB URL, JWT secret, Stripe key | `~/projects/.env` |
| `git_repo` | Fake git repo with credential leak in history | `~/projects/internal` |
| `kube_config` | Kubernetes cluster config | `~/.kube/config` |
| `docker_config` | Docker registry auth token | `~/.docker/config.json` |
| `npmrc` | npm auth token | `~/.npmrc` |
| `pypirc` | PyPI upload credentials | `~/.pypirc` |
| `passwords_txt` | Plaintext password list | `~/passwords.txt` |
| `generic_file` | Any custom bait file | Any path you choose |

All tokens are **format-accurate** — they match the exact structure of real credentials (correct prefixes, lengths, character sets) so attackers cannot identify them as fakes by inspection.

### Detection & Forensics

- **Sub-second detection** via Linux `inotify` — read, write, rename, delete, and attribute changes all fire alerts
- **Forensic capture at trigger time** — PID, parent process chain back to PID 1, UID/GID, cmdline, executable path + SHA-256 hash, working directory, open file descriptors, and a live `/proc/net/tcp` network snapshot
- **BLAKE3 tamper-evident hash chain** — every alert is cryptographically chained; any post-hoc modification to the database is detected and flagged in the UI
- **False-positive labelling** — known file indexers (GNOME Tracker, Baloo, Nautilus, Dolphin, Thunar) are automatically identified and labelled so you don't chase your own OS

### Alert Channels

- Desktop notifications (native)
- System tray badge with unread count
- **Webhook** — raw JSON for generic endpoints, Discord rich embeds (auto-detected), Slack messages (auto-detected)
- Append-only `.jsonl` alert mirror at `~/.local/share/zhoneypot/alerts.jsonl`

### Autonomous Mode

- **Smart scanner** — scans your home directory for existing credential paths and suggests matching honeypot placements with confidence scores
- **Auto-response rules** — automatically lock files, kill processes, or run custom scripts when a trigger matches configured conditions (token filter + severity threshold)
- **Self-heal** — recreates deleted or tampered tokens after a configurable delay so your tripwires never go dark
- **Anomaly detection** — per-token 24-hour and 7-day access-time baseline; flags accesses at unusual hours

### System Integration

- **System tray** — close the window, watchers keep running
- **Autostart on login** — XDG autostart / systemd user, no manual setup
- **Start minimized** — launches silently in tray-only mode
- **Single-instance enforcement** — second launch focuses the existing window
- **inotify watch-limit detection** — warns when `/proc/sys/fs/inotify/max_user_watches` is too low and shows the fix

### Developer Tools

- **Self-test suite** — 10 end-to-end test groups: DB connectivity, all 10 token generators, disk I/O, file watcher, alert pipeline, hash chain integrity, anomaly detection, auto-response CRUD, and self-heal queue
- **Three deployment templates** — deploy a sensible set of tokens in one click:
  - **Developer Workstation** — AWS creds + SSH keypair + `.env` + fake git repo
  - **Server Simulation** — root AWS creds + cron script + DB dump
  - **Minimal** — 3 highest-signal tokens for a quick start

---

## Installation

### Requirements

- Linux x86_64
- Standard kernel with `inotify` support (any kernel ≥ 2.6.36)

### From prebuilt binary

> [!NOTE]
> Prebuilt `.deb` and `.rpm` packages are hosted on the project website, **not** on GitHub Releases.
>
> → **<https://zsync.eu/zhoneypot>**

```bash
# Debian / Ubuntu / Mint
sudo dpkg -i zhoneypot_0.1.0_amd64.deb
sudo apt-get install -f   # resolve any deps

# Fedora / openSUSE / RHEL
sudo rpm -i zhoneypot-0.1.0-1.x86_64.rpm
# or:
sudo dnf install ./zhoneypot-0.1.0-1.x86_64.rpm
```

**SHA-256 checksums** (verify before installing):

```
584cf0f142ae33b84040beac68e51aad9e9d9cde6e670873f927e85aafcaaab5  zhoneypot_0.1.0_amd64.deb
8644ccd7f64ca9019c3bb33e550613400c7ac2b1ba0b054efe3b5359a0740466  zhoneypot-0.1.0-1.x86_64.rpm
```

### Build from source

**Prerequisites:** Rust (stable), Node.js ≥ 20, pnpm

```bash
git clone https://github.com/TheHolyOneZ/ZHoneyPot
cd ZHoneyPot
pnpm install
pnpm tauri build
```

Release bundles land in `src-tauri/target/release/bundle/`.

For development with hot-reload:

```bash
pnpm tauri dev
```

> [!NOTE]
> The `linux-forensics` Cargo feature (enabled automatically on Linux) enables `/proc`-based forensic capture. It has no effect on non-Linux builds.

---

## Quick Start

1. Launch ZHoneyPot → **New Token**
2. Choose **AWS Credentials** — accept the suggested path `~/.aws/credentials`
3. Click **Deploy**
4. Open a terminal:
   ```bash
   cat ~/.aws/credentials
   ```
5. An alert fires in under a second — check the **Alerts** tab

**Or use a template:** Dashboard → *Deploy template* → **Developer Workstation** deploys 5 high-signal tokens in one click and you're covered.

---

## Privacy

> [!IMPORTANT]
> ZHoneyPot makes **zero outbound network requests** with default settings.
>
> The only traffic it ever sends is to **your own** configured webhook URL or callback server. Both are logged in the built-in network audit log under Settings → Privacy. There is no telemetry, no auto-update probe, and no crash reporting.

This is verifiable: run `sudo tcpdump -i any` with default settings and observe zero outbound connections.

---

## Data & Storage

| Path | Contents |
|---|---|
| `~/.local/share/zhoneypot/zhoneypot.db` | SQLite (WAL mode) — tokens, alerts, chain, settings |
| `~/.local/share/zhoneypot/alerts.jsonl` | Append-only alert mirror |
| `~/.config/zhoneypot/` | Config directory |
| `~/.local/state/zhoneypot/logs/` | Structured rolling logs |

---

## Tech Stack

<details>
<summary>Backend — Rust</summary>

| Crate | Purpose |
|---|---|
| `tauri` v2 | Desktop shell — no Electron, native OS WebView |
| `tokio` | Async runtime |
| `notify` + `notify-debouncer-full` | inotify file watching with 300 ms debounce |
| `sqlx` + SQLite | Async compile-time-checked queries, WAL mode |
| `blake3` | BLAKE3 cryptographic hash chain |
| `procfs` | Linux `/proc` forensic snapshots |
| `ed25519-dalek` + `rsa` + `ssh-key` | Real SSH keypair generation |
| `git2` | Fake git repository construction |
| `reqwest` (rustls) | Webhook HTTP delivery — no OpenSSL |
| `uuid` v7 | Sortable unique IDs |
| `tracing` + `tracing-appender` | Structured rolling-file logging |

</details>

<details>
<summary>Frontend — TypeScript + React</summary>

| Library | Purpose |
|---|---|
| React 18 + TypeScript 5 | UI |
| Vite 7 | Build tooling with instant HMR |
| TanStack Router | Type-safe client-side routing |
| TanStack Query | Server-state caching and automatic invalidation |
| Tailwind CSS v4 | Utility-first styling with CSS variable dark mode |
| shadcn/ui + Radix UI | Accessible component primitives |
| Zustand | Lightweight client state |
| Lucide React | Icons |

</details>

---

## Roadmap

> [!NOTE]
> These are planned for post-beta milestones — not promised dates.

- [ ] Stable `.deb` / `.rpm` release pipeline (currently hand-built and hosted on zsync.eu)
- [ ] Windows support (file watcher + forensics layer)
- [ ] macOS support
- [ ] Network canary tokens (DNS / HTTP callback server companion)
- [ ] Plugin API (declarative TOML plugins in `~/.config/zhoneypot/plugins/`)
- [ ] Decoy density heatmap on Dashboard

---

## License

ZHoneyPot is free software under the **GNU General Public License v3.0**.

You can use, modify, and distribute it freely. Any derivative work **must also be released under GPL v3** — this prevents closed-source forks of a tool you're trusting to protect your machine.

For a security tool, open source is not optional. You should be able to read exactly what it does.

→ [`LICENSE`](LICENSE)

---

## Author

<div align="center">

<img src="public/logo.png" width="72" height="72" style="border-radius: 50%; margin-bottom: 8px;" alt="TheHolyOneZ"/>

**TheHolyOneZ**

*Security tooling · Systems programming · Open source*

<br/>

[![GitHub](https://img.shields.io/badge/GitHub-TheHolyOneZ-181717?style=for-the-badge&logo=github)](https://github.com/TheHolyOneZ)
&nbsp;
[![Website](https://img.shields.io/badge/Web-zsync.eu-0A66C2?style=for-the-badge&logo=googlechrome&logoColor=white)](https://zsync.eu)
&nbsp;
[![Project](https://img.shields.io/badge/Project-ZHoneyPot-orange?style=for-the-badge)](https://zsync.eu/zhoneypot)

</div>

---

<div align="center">

**ZHoneyPot v0.1.0-beta** · GPL-3.0 · Linux · Built with Tauri v2 + Rust + React

*Your threat intelligence stays yours.*

</div>
