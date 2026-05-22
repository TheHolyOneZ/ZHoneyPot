use crate::domain::alert::Alert;
use crate::storage::Db;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;

use super::channels::{desktop, log_file, webhook};

pub struct AlertEvent {
    pub alert: Alert,
    pub is_test: bool,
}

pub fn spawn(
    mut rx: mpsc::Receiver<Alert>,
    db: Db,
    app: AppHandle,
    jsonl_path: PathBuf,
    http: reqwest::Client,
) {
    tokio::spawn(async move {
        while let Some(alert) = rx.recv().await {
            let settings = crate::storage::settings_repo::load(&db)
                .await
                .unwrap_or_default();


            let _ = app.emit(crate::ipc::events::ALERT_NEW, &alert);


            if settings.notifications.desktop_enabled {
                let a = alert.clone();
                tokio::task::spawn_blocking(move || desktop::send(&a));
            }


            let a = alert.clone();
            let p = jsonl_path.clone();
            tokio::task::spawn_blocking(move || log_file::append(&a, &p));


            if let Some(url) = settings.notifications.webhook_url.clone() {
                let a = alert.clone();
                let client = http.clone();
                tokio::spawn(async move { webhook::send(&a, &url, &client).await });
            }
        }
    });
}
