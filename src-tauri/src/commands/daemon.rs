use serde::Serialize;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};

#[derive(Serialize)]
pub struct DaemonStatus {
    pub running: bool,
    pub watcher_count: usize,
    pub uptime_secs: u64,
}

static START_TIME: std::sync::OnceLock<std::time::Instant> = std::sync::OnceLock::new();
pub static WATCHER_COUNT: AtomicUsize = AtomicUsize::new(0);
pub static CLOSE_TO_TRAY: AtomicBool = AtomicBool::new(true);

pub fn record_start() {
    START_TIME.get_or_init(std::time::Instant::now);
}

#[tauri::command]
pub async fn daemon_status() -> DaemonStatus {
    let uptime = START_TIME
        .get()
        .map(|t| t.elapsed().as_secs())
        .unwrap_or(0);
    DaemonStatus {
        running: true,
        watcher_count: WATCHER_COUNT.load(Ordering::Relaxed),
        uptime_secs: uptime,
    }
}
