CREATE TABLE IF NOT EXISTS tokens (
    id                TEXT PRIMARY KEY,
    kind              TEXT NOT NULL,
    path              TEXT NOT NULL UNIQUE,
    display_name      TEXT,
    metadata          TEXT NOT NULL DEFAULT '{}',
    content_hash      TEXT NOT NULL,
    status            TEXT NOT NULL DEFAULT 'active',
    severity          TEXT NOT NULL DEFAULT 'warn',
    callback_url      TEXT,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL,
    last_seen_at      TEXT,
    last_triggered_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_tokens_status ON tokens(status);
CREATE INDEX IF NOT EXISTS idx_tokens_kind   ON tokens(kind);

CREATE TABLE IF NOT EXISTS alerts (
    id           TEXT PRIMARY KEY,
    token_id     TEXT NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    triggered_at TEXT NOT NULL,
    event_kind   TEXT NOT NULL,
    severity     TEXT NOT NULL,
    is_test      INTEGER NOT NULL DEFAULT 0,
    process_info TEXT,
    network_info TEXT NOT NULL DEFAULT '[]',
    raw_event    TEXT,
    acknowledged INTEGER NOT NULL DEFAULT 0,
    ack_at       TEXT,
    note         TEXT
);

CREATE INDEX IF NOT EXISTS idx_alerts_triggered_at ON alerts(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_token_id     ON alerts(token_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity     ON alerts(severity);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS network_audit (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    at          TEXT    NOT NULL,
    destination TEXT    NOT NULL,
    purpose     TEXT    NOT NULL,
    success     INTEGER NOT NULL,
    bytes_sent  INTEGER NOT NULL DEFAULT 0
);
