pub mod supervisor;
pub mod tray;

use crate::config::AppPaths;
use crate::storage::{tokens_repo, Db};
use crate::domain::token::TokenStatus;
use std::path::Path;
use tauri::{AppHandle, Manager};
use tokio::sync::mpsc;
use time::OffsetDateTime;

pub async fn start(app: AppHandle, db: Db, paths: AppPaths) {
    let (alert_tx, alert_rx) = mpsc::channel(256);
    let http = reqwest::Client::new();


    crate::alerts::dispatcher::spawn(alert_rx, db.clone(), app.clone(), paths.alert_jsonl.clone(), http);


    let (watch_reg_tx, watch_reg_rx) = std::sync::mpsc::channel::<std::path::PathBuf>();
    app.manage(crate::watcher::WatcherRegistrar(watch_reg_tx));


    let muter = crate::watcher::WatchMuter::default();
    app.manage(muter.clone());


    let engine = crate::watcher::engine::WatcherEngine::new(db.clone(), alert_tx, watch_reg_rx, muter.clone());
    tokio::spawn(engine.run());


    let db_integrity = db.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(60)).await;
            integrity_tick(&db_integrity, &muter).await;
        }
    });


    let db_heal = db.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(30)).await;
            let settings = load_autonomous_settings(&db_heal).await;
            if settings.self_heal_enabled {
                crate::autonomous::healer::tick(&db_heal, settings.heal_delay_secs).await;
            }
        }
    });


    check_inotify_limit(&app);

    tracing::info!("ZHoneyPot daemon started");
}


async fn integrity_tick(db: &Db, muter: &crate::watcher::WatchMuter) {
    use crate::domain::alert::EventKind;
    use crate::storage::alerts_repo;

    let tokens = tokens_repo::list(db).await.unwrap_or_default();

    for token in tokens {
        let path = Path::new(&token.path);

        if !path.exists() {
            if matches!(token.status, TokenStatus::Active) {
                let _ = tokens_repo::set_status(db, &token.id, &TokenStatus::Missing).await;
                tracing::warn!("Token {} missing from disk", token.id);
            }
            continue;
        }


        if matches!(token.status, TokenStatus::Missing) {
            let _ = tokens_repo::set_status(db, &token.id, &TokenStatus::Active).await;
        }


        muter.mute(&token.path);
        if let Ok(content) = std::fs::read_to_string(path) {
            let current_hash = blake3::hash(content.as_bytes()).to_hex().to_string();
            if current_hash != token.content_hash {
                tracing::warn!("Token {} content tampered! hash mismatch", token.id);

                let new_alert = alerts_repo::NewAlert {
                    token_id: token.id.clone(),
                    event_kind: EventKind::Write,
                    severity: crate::domain::token::Severity::Critical,
                    is_test: false,
                    forensics: None,
                    raw_event: Some(serde_json::json!({
                        "type": "content_tamper",
                        "expected_hash": token.content_hash,
                        "actual_hash": current_hash,
                    })),
                };

                if let Ok(alert) = alerts_repo::insert(db, new_alert).await {
                    let _ = crate::alerts::chain::append(db, &alert).await;
                    let _ = tokens_repo::touch_triggered(db, &token.id).await;

                    let _ = sqlx::query("UPDATE tokens SET content_hash = ?, updated_at = ? WHERE id = ?")
                        .bind(&current_hash)
                        .bind(OffsetDateTime::now_utc())
                        .bind(&token.id)
                        .execute(db)
                        .await;
                }
            }
        }
    }
}

fn check_inotify_limit(_app: &AppHandle) {
    if let Ok(content) = std::fs::read_to_string("/proc/sys/fs/inotify/max_user_watches") {
        let limit: u64 = content.trim().parse().unwrap_or(0);
        if limit < 8192 {
            tracing::warn!(
                "inotify max_user_watches is low ({limit}). Run: echo 65536 | sudo tee /proc/sys/fs/inotify/max_user_watches"
            );

        }
    }
}

async fn load_autonomous_settings(db: &Db) -> crate::domain::autonomous::AutonomousSettings {
    let row: Option<(String,)> =
        sqlx::query_as("SELECT value FROM settings WHERE key = 'autonomous'")
            .fetch_optional(db)
            .await
            .ok()
            .flatten();

    row.and_then(|(v,)| serde_json::from_str(&v).ok())
        .unwrap_or_default()
}
