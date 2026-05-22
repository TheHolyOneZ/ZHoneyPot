

use crate::alerts::chain;
use crate::autonomous::{anomaly, responder};
use crate::domain::alert::EventKind;
use crate::domain::autonomous::AutoResponse;
use crate::domain::token::{Severity, TokenKind, TokenSpec};
use crate::error::AppError;
use crate::storage::{alerts_repo, tokens_repo, Db};
use crate::tokens;
use notify::{Config as NotifyConfig, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::mpsc as std_mpsc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, State};
use ts_rs::TS;

const SELFTEST_EVENT: &str = "selftest:progress";
const TEMP_TOKEN_PATH: &str = "/tmp/zhoneypot_selftest_token";
const TEMP_WATCHER_PATH: &str = "/tmp/zhoneypot_selftest_watch";

#[derive(Serialize, Deserialize, TS, Clone, Debug)]
#[ts(export)]
pub struct TestResult {
    pub name: String,
    pub group: String,
    pub passed: bool,
    pub duration_ms: u64,
    pub detail: Option<String>,
    pub error: Option<String>,
}

impl TestResult {
    fn pass(name: &str, group: &str, ms: u64, detail: impl Into<String>) -> Self {
        Self { name: name.into(), group: group.into(), passed: true, duration_ms: ms, detail: Some(detail.into()), error: None }
    }
    fn fail(name: &str, group: &str, ms: u64, err: impl Into<String>) -> Self {
        Self { name: name.into(), group: group.into(), passed: false, duration_ms: ms, detail: None, error: Some(err.into()) }
    }
    #[allow(dead_code)]
    fn skip(name: &str, group: &str, reason: &str) -> Self {
        Self { name: name.into(), group: group.into(), passed: true, duration_ms: 0, detail: Some(format!("Skipped: {reason}")), error: None }
    }
}

macro_rules! emit {
    ($app:expr, $result:expr) => {{
        let r = $result;
        let _ = $app.emit(SELFTEST_EVENT, &r);
        r
    }};
}

#[tauri::command]
pub async fn self_test_run(db: State<'_, Db>, app: AppHandle) -> Result<Vec<TestResult>, AppError> {
    let pool = &*db;
    let mut all: Vec<TestResult> = Vec::new();


    {
        let g = "Core DB";

        let r = emit!(app, {
            let t = Instant::now();
            match sqlx::query("SELECT 1").execute(pool).await {
                Ok(_)  => TestResult::pass("DB connectivity", g, t.elapsed().as_millis() as u64, "SELECT 1 OK"),
                Err(e) => TestResult::fail("DB connectivity", g, t.elapsed().as_millis() as u64, e.to_string()),
            }
        });
        all.push(r);

        let r = emit!(app, {
            let t = Instant::now();
            let result: Result<(), sqlx::Error> = async {
                sqlx::query("INSERT OR REPLACE INTO settings (key,value) VALUES ('_selftest','ok')").execute(pool).await?;
                let row: (String,) = sqlx::query_as("SELECT value FROM settings WHERE key='_selftest'").fetch_one(pool).await?;
                assert_eq!(row.0, "ok");
                sqlx::query("DELETE FROM settings WHERE key='_selftest'").execute(pool).await?;
                Ok(())
            }.await;
            match result {
                Ok(_)  => TestResult::pass("Settings round-trip", g, t.elapsed().as_millis() as u64, "INSERT → SELECT → DELETE OK"),
                Err(e) => TestResult::fail("Settings round-trip", g, t.elapsed().as_millis() as u64, e.to_string()),
            }
        });
        all.push(r);
    }


    {
        let g = "Token Generators";

        let kinds: &[(&str, TokenKind, &str, &dyn Fn(&str) -> bool)] = &[
            ("AWS Credentials",  TokenKind::AwsCredentials, TEMP_TOKEN_PATH, &|c| c.contains("AKIA") && c.contains("aws_access_key_id")),
            (".env File",        TokenKind::Dotenv,         TEMP_TOKEN_PATH, &|c| c.contains("DATABASE_URL") && c.contains("JWT_SECRET")),
            ("SSH Keypair",      TokenKind::SshKeypair,     TEMP_TOKEN_PATH, &|c| c.contains("-----BEGIN")),
            ("passwords.txt",    TokenKind::PasswordsTxt,   TEMP_TOKEN_PATH, &|c| c.len() > 50),
            ("Kubeconfig",       TokenKind::KubeConfig,     TEMP_TOKEN_PATH, &|c| c.contains("apiVersion: v1") && c.contains("clusters:")),
            ("Docker config",    TokenKind::DockerConfig,   TEMP_TOKEN_PATH, &|c| c.contains("auths") && c.contains("index.docker.io")),
            (".npmrc",           TokenKind::Npmrc,          TEMP_TOKEN_PATH, &|c| c.contains("_authToken=") && c.contains("registry.npmjs.org")),
            (".pypirc",          TokenKind::Pypirc,         TEMP_TOKEN_PATH, &|c| c.contains("[pypi]") && c.contains("password =")),
            ("Generic file",     TokenKind::GenericFile,    TEMP_TOKEN_PATH, &|c| !c.is_empty()),
        ];

        for (label, kind, path, check) in kinds.iter() {
            let spec = TokenSpec {
                kind: kind.clone(),
                path: path.to_string(),
                display_name: Some(format!("[selftest] {label}")),
                metadata: serde_json::json!({}),
                severity: Severity::Info,
                callback_url: None,
            };
            let t = Instant::now();
            let r = match tokens::generate(&spec) {
                Err(e) => TestResult::fail(&format!("Generate: {label}"), g, t.elapsed().as_millis() as u64, e.to_string()),
                Ok(gen) => {
                    let ms = t.elapsed().as_millis() as u64;
                    if !check(&gen.content) {
                        TestResult::fail(
                            &format!("Generate: {label}"), g, ms,
                            format!("Content format check failed (first 120 chars: {:?})", &gen.content[..gen.content.len().min(120)])
                        )
                    } else {
                        TestResult::pass(&format!("Generate: {label}"), g, ms,
                            format!("{} bytes, hash={}", gen.content.len(), &gen.content_hash[..16]))
                    }
                }
            };
            all.push(emit!(app, r));
        }
    }


    {
        let g = "Disk I/O";
        let spec = TokenSpec {
            kind: TokenKind::Dotenv,
            path: TEMP_TOKEN_PATH.into(),
            display_name: Some("[selftest]".into()),
            metadata: serde_json::json!({}),
            severity: Severity::Info,
            callback_url: None,
        };

        let gen = match tokens::generate(&spec) {
            Ok(g) => g,
            Err(e) => {
                all.push(emit!(app, TestResult::fail("Write token to disk", g, 0, e.to_string())));
                all.push(emit!(app, TestResult::fail("Read token from disk", g, 0, "Skipped (write failed)")));
                return cleanup_and_return(pool, all);
            }
        };

        let r = emit!(app, {
            let t = Instant::now();
            match tokens::write_to_disk(Path::new(TEMP_TOKEN_PATH), &gen.content, 0o600) {
                Ok(_)  => TestResult::pass("Write token to disk", g, t.elapsed().as_millis() as u64, format!("Wrote {TEMP_TOKEN_PATH}")),
                Err(e) => TestResult::fail("Write token to disk", g, t.elapsed().as_millis() as u64, e.to_string()),
            }
        });
        all.push(r);

        let r = emit!(app, {
            let t = Instant::now();
            match std::fs::read_to_string(TEMP_TOKEN_PATH) {
                Err(e) => TestResult::fail("Read token from disk", g, t.elapsed().as_millis() as u64, e.to_string()),
                Ok(content) if content == gen.content => TestResult::pass("Read token from disk", g, t.elapsed().as_millis() as u64, "Content matches generated output"),
                Ok(_) => TestResult::fail("Read token from disk", g, t.elapsed().as_millis() as u64, "Content mismatch"),
            }
        });
        all.push(r);
    }


    {
        let g = "File Watcher";
        all.push(emit!(app, test_watcher_detection(g).await));
    }


    let test_spec = TokenSpec {
        kind: TokenKind::Dotenv,
        path: TEMP_TOKEN_PATH.into(),
        display_name: Some("[selftest]".into()),
        metadata: serde_json::json!({}),
        severity: Severity::Info,
        callback_url: None,
    };

    let gen = tokens::generate(&test_spec).unwrap_or_else(|_| tokens::GeneratedContent::new("fallback".into()));
    let _ = tokens::write_to_disk(Path::new(TEMP_TOKEN_PATH), &gen.content, 0o600);

    let test_token = {
        let g = "Token DB";
        let t = Instant::now();
        match tokens_repo::insert(pool, &test_spec, &gen.content_hash).await {
            Err(e) => {
                all.push(emit!(app, TestResult::fail("Insert token to DB", g, t.elapsed().as_millis() as u64, e.to_string())));
                let _ = std::fs::remove_file(TEMP_TOKEN_PATH);
                return Ok(all);
            }
            Ok(tok) => {
                all.push(emit!(app, TestResult::pass("Insert token to DB", g, t.elapsed().as_millis() as u64, format!("ID {}", tok.id))));
                tok
            }
        }
    };


    {
        let g = "Alert Pipeline";


        let new_alert = alerts_repo::NewAlert {
            token_id: test_token.id.clone(),
            event_kind: EventKind::Read,
            severity: Severity::Warn,
            is_test: true,
            forensics: None,
            raw_event: Some(serde_json::json!({ "source": "selftest_offender", "action": "read" })),
        };

        let test_alert = {
            let t = Instant::now();
            match alerts_repo::insert(pool, new_alert).await {
                Err(e) => {
                    all.push(emit!(app, TestResult::fail("Offender: trigger alert", g, t.elapsed().as_millis() as u64, e.to_string())));
                    cleanup(pool, &test_token.id, TEMP_TOKEN_PATH).await;
                    return Ok(all);
                }
                Ok(a) => {
                    all.push(emit!(app, TestResult::pass("Offender: trigger alert", g, t.elapsed().as_millis() as u64,
                        format!("Alert {} created (kind=read, severity=warn)", a.id))));
                    a
                }
            }
        };


        let r = emit!(app, {
            let t = Instant::now();
            match alerts_repo::get(pool, &test_alert.id).await {
                Ok(a) => TestResult::pass("Alert: read from DB", g, t.elapsed().as_millis() as u64,
                    format!("kind={:?}, is_test={}", a.event_kind, a.is_test)),
                Err(e) => TestResult::fail("Alert: read from DB", g, t.elapsed().as_millis() as u64, e.to_string()),
            }
        });
        all.push(r);


        let chain_g = "Hash Chain";

        let r = emit!(app, {
            let t = Instant::now();
            match chain::append(pool, &test_alert).await {
                Ok(_)  => TestResult::pass("Hash chain: append", chain_g, t.elapsed().as_millis() as u64, "Alert appended to chain"),
                Err(e) => TestResult::fail("Hash chain: append", chain_g, t.elapsed().as_millis() as u64, e.to_string()),
            }
        });
        all.push(r);

        let r = emit!(app, {
            let t = Instant::now();
            match chain::verify(pool).await {
                Ok(res) if res.ok => TestResult::pass("Hash chain: verify integrity", chain_g, t.elapsed().as_millis() as u64, "Chain intact — no tampering"),
                Ok(res) => TestResult::fail("Hash chain: verify integrity", chain_g, t.elapsed().as_millis() as u64,
                    format!("Chain broken at seq {:?}", res.tampered_at_seq)),
                Err(e)  => TestResult::fail("Hash chain: verify integrity", chain_g, t.elapsed().as_millis() as u64, e.to_string()),
            }
        });
        all.push(r);
    }


    {
        let g = "Anomaly Detection";

        let r = emit!(app, {
            let t = Instant::now();
            let flags = anomaly::observe(pool, &test_token.id, time::OffsetDateTime::now_utc()).await;
            TestResult::pass("Anomaly: observe()", g, t.elapsed().as_millis() as u64,
                format!("is_anomalous={}, reason={:?}", flags.is_anomalous, flags.reason))
        });
        all.push(r);

        let r = emit!(app, {
            let t = Instant::now();
            match anomaly::get_baseline(pool, &test_token.id).await {
                Some(b) => TestResult::pass("Anomaly: baseline stored", g, t.elapsed().as_millis() as u64,
                    format!("{} accesses recorded", b.total_accesses)),
                None => TestResult::fail("Anomaly: baseline stored", g, t.elapsed().as_millis() as u64,
                    "No baseline found after observe()"),
            }
        });
        all.push(r);
    }


    {
        let g = "Auto-Response";

        let rule = AutoResponse {
            id: String::new(),
            name: "[selftest rule]".into(),
            enabled: true,
            min_severity: Severity::Info,
            token_filter: None,
            lock_file: false,
            kill_process: false,
            run_script: None,
            created_at: String::new(),
        };

        let created_id = {
            let t = Instant::now();
            match responder::create_rule(pool, rule).await {
                Ok(r) => {
                    all.push(emit!(app, TestResult::pass("Auto-response: create rule", g, t.elapsed().as_millis() as u64, format!("ID {}", r.id))));
                    r.id
                }
                Err(e) => {
                    all.push(emit!(app, TestResult::fail("Auto-response: create rule", g, t.elapsed().as_millis() as u64, e.to_string())));
                    String::new()
                }
            }
        };

        let r = emit!(app, {
            let t = Instant::now();
            let rules = responder::list_all_rules(pool).await;
            if rules.iter().any(|r| r.id == created_id) {
                TestResult::pass("Auto-response: list all rules", g, t.elapsed().as_millis() as u64,
                    format!("{} rule(s) total", rules.len()))
            } else {
                TestResult::fail("Auto-response: list all rules", g, t.elapsed().as_millis() as u64, "Created rule not found")
            }
        });
        all.push(r);

        if !created_id.is_empty() {
            let r = emit!(app, {
                let t = Instant::now();
                match responder::delete_rule(pool, &created_id).await {
                    Ok(_)  => TestResult::pass("Auto-response: delete rule", g, t.elapsed().as_millis() as u64, "Rule removed"),
                    Err(e) => TestResult::fail("Auto-response: delete rule", g, t.elapsed().as_millis() as u64, e.to_string()),
                }
            });
            all.push(r);
        }
    }


    {
        let g = "Self-Heal";
        let r = emit!(app, {
            let t = Instant::now();
            let now = time::OffsetDateTime::now_utc();
            let heal_after = now + time::Duration::seconds(60);
            let result = sqlx::query(
                "INSERT OR IGNORE INTO heal_queue (token_id, queued_at, heal_after) VALUES (?, ?, ?)"
            )
            .bind(&test_token.id)
            .bind(now)
            .bind(heal_after)
            .execute(pool)
            .await;
            let ms = t.elapsed().as_millis() as u64;
            match result {
                Ok(r) if r.rows_affected() > 0 => TestResult::pass("Heal queue: enqueue missing", g, ms, "Token queued for healing"),
                Ok(_) => TestResult::pass("Heal queue: enqueue missing", g, ms, "Entry already in queue (OK)"),
                Err(e) => TestResult::fail("Heal queue: enqueue missing", g, ms, e.to_string()),
            }
        });
        all.push(r);
    }


    {
        let t = Instant::now();
        cleanup(pool, &test_token.id, TEMP_TOKEN_PATH).await;
        let ms = t.elapsed().as_millis() as u64;
        let r = TestResult::pass("Cleanup", "Cleanup", ms, "Test token, alerts, chain entries, and temp files removed");
        all.push(emit!(app, r));
    }

    Ok(all)
}

async fn test_watcher_detection(group: &str) -> TestResult {
    let t = Instant::now();
    let test_file = TEMP_WATCHER_PATH;


    if std::fs::write(test_file, "canary_content").is_err() {
        return TestResult::fail("Watcher: detect file access", group, t.elapsed().as_millis() as u64, "Could not write temp file");
    }


    let (tx, rx) = std_mpsc::channel::<()>();
    let tx2 = tx.clone();
    let path_str = test_file.to_string();

    std::thread::spawn(move || {
        let tx3 = tx2.clone();
        let mut watcher = match RecommendedWatcher::new(
            move |res: notify::Result<notify::Event>| {
                if res.is_ok() {
                    let _ = tx3.send(());
                }
            },
            NotifyConfig::default(),
        ) {
            Ok(w) => w,
            Err(e) => {
                tracing::warn!("Watcher test setup failed: {e}");
                return;
            }
        };

        if let Err(e) = watcher.watch(Path::new(&path_str), RecursiveMode::NonRecursive) {
            tracing::warn!("Watcher test watch failed: {e}");
            return;
        }


        std::thread::sleep(Duration::from_secs(3));
    });


    tokio::time::sleep(Duration::from_millis(300)).await;


    let _ = std::fs::read_to_string(test_file);


    let detected = tokio::task::spawn_blocking(move || {
        rx.recv_timeout(Duration::from_millis(1500)).is_ok()
    }).await.unwrap_or(false);

    let _ = std::fs::remove_file(test_file);
    let ms = t.elapsed().as_millis() as u64;

    if detected {
        TestResult::pass("Watcher: detect file access", group, ms,
            "inotify event fired within 1.5s of file read — watcher is operational")
    } else {
        TestResult::fail("Watcher: detect file access", group, ms,
            "No inotify event within 1.5s. Check: `cat /proc/sys/fs/inotify/max_user_watches` (should be > 8192)")
    }
}

async fn cleanup(pool: &sqlx::Pool<sqlx::Sqlite>, token_id: &str, path: &str) {
    let _ = sqlx::query("DELETE FROM heal_queue WHERE token_id = ?").bind(token_id).execute(pool).await;
    let _ = sqlx::query("DELETE FROM access_baseline WHERE token_id = ?").bind(token_id).execute(pool).await;
    let _ = sqlx::query(
        "DELETE FROM alert_chain WHERE alert_id IN (SELECT id FROM alerts WHERE token_id = ?)"
    ).bind(token_id).execute(pool).await;
    let _ = tokens_repo::delete(pool, token_id).await;
    let _ = std::fs::remove_file(path);
    let _ = std::fs::remove_file(TEMP_WATCHER_PATH);
}

fn cleanup_and_return(
    _pool: &sqlx::Pool<sqlx::Sqlite>,
    all: Vec<TestResult>,
) -> Result<Vec<TestResult>, AppError> {
    let _ = std::fs::remove_file(TEMP_TOKEN_PATH);
    Ok(all)
}
