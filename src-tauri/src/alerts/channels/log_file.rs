use crate::domain::alert::Alert;
use std::path::Path;

pub fn append(alert: &Alert, jsonl_path: &Path) {
    let Ok(line) = serde_json::to_string(alert) else { return };
    let mut line = line;
    line.push('\n');
    if let Err(e) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(jsonl_path)
        .and_then(|mut f| { use std::io::Write; f.write_all(line.as_bytes()) })
    {
        tracing::warn!("JSONL alert log append failed: {e}");
    }
}
