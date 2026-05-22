-- Alert deduplication count
ALTER TABLE alerts ADD COLUMN dedup_count INTEGER NOT NULL DEFAULT 0;

-- Auto-response rules
CREATE TABLE IF NOT EXISTS auto_responses (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    token_filter TEXT,              -- NULL = all tokens
    min_severity TEXT NOT NULL DEFAULT 'warn',
    lock_file    INTEGER NOT NULL DEFAULT 0,
    kill_process INTEGER NOT NULL DEFAULT 0,
    run_script   TEXT,
    enabled      INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT NOT NULL
);

-- Per-token access baseline for anomaly detection
CREATE TABLE IF NOT EXISTS access_baseline (
    token_id        TEXT PRIMARY KEY REFERENCES tokens(id) ON DELETE CASCADE,
    hour_histogram  TEXT NOT NULL DEFAULT '[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]',
    day_histogram   TEXT NOT NULL DEFAULT '[0,0,0,0,0,0,0]',
    total_accesses  INTEGER NOT NULL DEFAULT 0,
    last_updated    TEXT NOT NULL
);

-- Queue of tokens awaiting self-healing recreation
CREATE TABLE IF NOT EXISTS heal_queue (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    token_id   TEXT NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    queued_at  TEXT NOT NULL,
    heal_after TEXT NOT NULL,
    UNIQUE(token_id)
);
