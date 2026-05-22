use crate::storage::{alerts_repo, tokens_repo, Db};
use notify::RecursiveMode;
use notify_debouncer_full::{new_debouncer, DebounceEventResult, DebouncedEvent};
use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};
use tokio::sync::mpsc;

use super::classifier;


type DedupKey = (String, String);
type DedupMap = Arc<Mutex<HashMap<DedupKey, (Instant, u32)>>>;

const DEDUP_WINDOW: Duration = Duration::from_secs(30);

pub struct WatcherEngine {
    db: Db,
    alert_tx: mpsc::Sender<crate::domain::alert::Alert>,
    new_path_rx: std::sync::mpsc::Receiver<PathBuf>,
    muter: super::WatchMuter,
}

impl WatcherEngine {
    pub fn new(
        db: Db,
        alert_tx: mpsc::Sender<crate::domain::alert::Alert>,
        new_path_rx: std::sync::mpsc::Receiver<PathBuf>,
        muter: super::WatchMuter,
    ) -> Self {
        Self { db, alert_tx, new_path_rx, muter }
    }

    pub async fn run(self) {
        let db = self.db.clone();
        let tx = self.alert_tx.clone();
        let dedup: DedupMap = Arc::new(Mutex::new(HashMap::new()));
        let new_path_rx = self.new_path_rx;
        let muter = self.muter;

        let (event_tx, mut event_rx) = mpsc::channel::<DebouncedEvent>(256);

        let db_for_init = db.clone();
        let event_tx_clone = event_tx.clone();


        std::thread::spawn(move || {
            let rt = tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build()
                .expect("mini rt");

            let event_tx_cb = event_tx_clone.clone();

            let mut debouncer = new_debouncer(
                Duration::from_millis(300),
                None,
                move |result: DebounceEventResult| {
                    if let Ok(events) = result {
                        for event in events {
                            let _ = event_tx_cb.blocking_send(event);
                        }
                    }
                },
            )
            .expect("Failed to create file watcher");

            let tokens = rt.block_on(async {
                tokens_repo::list(&db_for_init).await.unwrap_or_default()
            });

            for token in &tokens {
                let path = PathBuf::from(&token.path);
                if path.exists() {
                    if let Err(e) = debouncer.watch(&path, RecursiveMode::NonRecursive) {
                        tracing::warn!("Failed to watch {}: {e}", token.path);
                    } else {
                        crate::commands::daemon::WATCHER_COUNT.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                    }
                }

                if path.is_dir() {
                    if let Err(e) = debouncer.watch(&path, RecursiveMode::Recursive) {
                        tracing::warn!("Failed to watch dir {}: {e}", token.path);
                    }
                }
            }

            tracing::info!("Watcher registered {} paths", tokens.len());


            loop {
                std::thread::sleep(Duration::from_millis(500));
                while let Ok(path) = new_path_rx.try_recv() {
                    let mode = if path.is_dir() {
                        RecursiveMode::Recursive
                    } else {
                        RecursiveMode::NonRecursive
                    };
                    match debouncer.watch(&path, mode) {
                        Ok(_) => {
                            crate::commands::daemon::WATCHER_COUNT.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                            tracing::info!("Hot-registered watcher for {}", path.display());
                        }
                        Err(e) => tracing::warn!("Hot-register failed for {}: {e}", path.display()),
                    }
                }
            }
        });


        let dedup_pruner = dedup.clone();
        tokio::spawn(async move {
            loop {
                tokio::time::sleep(Duration::from_secs(60)).await;
                let mut map = dedup_pruner.lock().unwrap();
                map.retain(|_, (ts, _)| ts.elapsed() < DEDUP_WINDOW * 4);
            }
        });


        while let Some(event) = event_rx.recv().await {
            let Some(event_kind) = classifier::classify(&event.kind) else { continue };

            for path in &event.paths {
                let path_str = path.to_string_lossy().to_string();


                if muter.is_muted(&path_str) {
                    tracing::debug!("Suppressed self-triggered event for {path_str}");
                    continue;
                }

                let token = match tokens_repo::get_by_path(&db, &path_str).await {
                    Ok(Some(t)) => t,
                    _ => continue,
                };


                let kind_str = format!("{:?}", event_kind);
                let key = (token.id.clone(), kind_str.clone());
                let suppressed = {
                    let mut map = dedup.lock().unwrap();
                    if let Some((ts, count)) = map.get_mut(&key) {
                        if ts.elapsed() < DEDUP_WINDOW {
                            *count += 1;
                            true
                        } else {
                            *ts = Instant::now();
                            *count = 0;
                            false
                        }
                    } else {
                        map.insert(key.clone(), (Instant::now(), 0));
                        false
                    }
                };

                if suppressed {
                    tracing::debug!("Suppressed duplicate alert for {} ({kind_str})", token.id);
                    continue;
                }


                let path_for_forensics = path_str.clone();
                let forensics = tokio::task::spawn_blocking(move || {
                    crate::forensics::capture_for_path(&path_for_forensics)
                })
                .await
                .ok();

                let pid_hint = forensics.as_ref()
                    .and_then(|f| f.process.as_ref())
                    .and_then(|p| p.pid);


                let now = time::OffsetDateTime::now_utc();
                let anomaly = crate::autonomous::anomaly::observe(&db, &token.id, now).await;

                let new_alert = alerts_repo::NewAlert {
                    token_id: token.id.clone(),
                    event_kind: event_kind.clone(),
                    severity: if anomaly.is_anomalous {

                        bump_severity(&token.severity)
                    } else {
                        token.severity.clone()
                    },
                    is_test: false,
                    forensics,
                    raw_event: anomaly.reason.as_ref().map(|r| serde_json::json!({ "anomaly": r })),
                };

                if let Ok(alert) = alerts_repo::insert(&db, new_alert).await {
                    let _ = crate::alerts::chain::append(&db, &alert).await;
                    let _ = tokens_repo::touch_triggered(&db, &token.id).await;


                    let token_path = token.path.clone();
                    let alert_for_resp = alert.clone();
                    let db_resp = db.clone();
                    tokio::spawn(async move {
                        crate::autonomous::responder::execute(
                            &db_resp,
                            &alert_for_resp,
                            &token_path,
                            pid_hint,
                        )
                        .await;
                    });

                    let _ = tx.send(alert).await;
                }
            }
        }
    }
}

fn bump_severity(s: &crate::domain::token::Severity) -> crate::domain::token::Severity {
    use crate::domain::token::Severity;
    match s {
        Severity::Info => Severity::Warn,
        Severity::Warn => Severity::Critical,
        Severity::Critical => Severity::Critical,
    }
}
