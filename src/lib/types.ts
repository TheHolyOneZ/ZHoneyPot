

export type TokenKind =
  | "aws_credentials"
  | "ssh_keypair"
  | "dotenv"
  | "git_repo"
  | "passwords_txt"
  | "kube_config"
  | "docker_config"
  | "npmrc"
  | "pypirc"
  | "generic_file";

export type TokenStatus = "active" | "disabled" | "missing";

export type Severity = "info" | "warn" | "critical";

export interface Token {
  id: string;
  kind: TokenKind;
  path: string;
  display_name: string | null;
  metadata: Record<string, unknown>;
  content_hash: string;
  status: TokenStatus;
  severity: Severity;
  callback_url: string | null;
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
  last_triggered_at: string | null;
}

export interface TokenSpec {
  kind: TokenKind;
  path: string;
  display_name: string | null;
  metadata: Record<string, unknown>;
  severity: Severity;
  callback_url: string | null;
}

export type EventKind = "read" | "write" | "rename" | "delete" | "attr" | "test";

export interface ProcessInfo {
  pid: number | null;
  ppid: number | null;
  cmdline: string | null;
  exe: string | null;
  exe_sha256: string | null;
  cwd: string | null;
  uid: number | null;
  username: string | null;
  parent_chain: string[];
}

export interface NetworkConnection {
  local_addr: string;
  remote_addr: string;
  state: string;
  protocol: string;
}

export interface Alert {
  id: string;
  token_id: string;
  triggered_at: string;
  event_kind: EventKind;
  severity: Severity;
  is_test: boolean;
  process_info: ProcessInfo | null;
  network_info: NetworkConnection[];
  raw_event: unknown | null;
  acknowledged: boolean;
  ack_at: string | null;
  note: string | null;
}

export interface NotificationSettings {
  desktop_enabled: boolean;
  tray_enabled: boolean;
  webhook_url: string | null;
  sound_enabled: boolean;
}

export interface CallbackSettings {
  server_url: string | null;
  server_secret: string | null;
}

export interface DaemonSettings {
  autostart: boolean;
  close_to_tray: boolean;
  start_minimized: boolean;
  log_level: string;
}

export interface StorageSettings {
  max_alerts: number;
}

export type Theme = "system" | "light" | "dark";

export interface AppSettings {
  notifications: NotificationSettings;
  callback: CallbackSettings;
  daemon: DaemonSettings;
  storage: StorageSettings;
  theme: Theme;
  network_audit_enabled: boolean;
}

export interface DeploymentTemplate {
  id: string;
  name: string;
  description: string;
  token_count: number;
}

export interface DaemonStatus {
  running: boolean;
  watcher_count: number;
  uptime_secs: number;
}

export interface ChainVerifyResult {
  ok: boolean;
  tampered_at_seq: number | null;
}


export interface AutoResponse {
  id: string;
  name: string;
  token_filter: string | null;
  min_severity: Severity;
  lock_file: boolean;
  kill_process: boolean;
  run_script: string | null;
  enabled: boolean;
  created_at: string;
}

export interface AccessBaseline {
  token_id: string;
  hour_histogram: number[];
  day_histogram: number[];
  total_accesses: number;
  last_updated: string;
}

export interface ScanSuggestion {
  kind: TokenKind;
  suggested_path: string;
  reason: string;
  confidence: number;
  spec: TokenSpec;
}

export interface ScanResult {
  suggestions: ScanSuggestion[];
  coverage_score: number;
  scanned_paths: number;
}

export interface AnomalyFlags {
  is_anomalous: boolean;
  reason: string | null;
}

export interface AutonomousSettings {
  self_heal_enabled: boolean;
  heal_delay_secs: number;
  auto_response_enabled: boolean;
  anomaly_detection_enabled: boolean;
  scanner_paths: string[];
}


export interface TestResult {
  name: string;
  group: string;
  passed: boolean;
  duration_ms: number;
  detail: string | null;
  error: string | null;
}
