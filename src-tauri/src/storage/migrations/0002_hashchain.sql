CREATE TABLE IF NOT EXISTS alert_chain (
    seq        INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id   TEXT    NOT NULL UNIQUE REFERENCES alerts(id) ON DELETE RESTRICT,
    prev_hash  TEXT    NOT NULL,
    entry_hash TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chain_alert_id ON alert_chain(alert_id);
