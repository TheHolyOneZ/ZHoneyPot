

use crate::domain::alert::Alert;
use crate::domain::autonomous::AutoResponse;
use crate::domain::token::Severity;
use crate::storage::Db;
use time::OffsetDateTime;
use uuid::Uuid;

fn parse_rows(rows: Vec<(String, String, Option<String>, String, i64, i64, Option<String>, i64, String)>) -> Vec<AutoResponse> {
    rows.into_iter().map(|(id, name, token_filter, min_severity, lock_file, kill_process, run_script, enabled, created_at)| {
        AutoResponse {
            id,
            name,
            token_filter,
            min_severity: parse_severity(&min_severity),
            lock_file: lock_file != 0,
            kill_process: kill_process != 0,
            run_script,
            enabled: enabled != 0,
            created_at,
        }
    }).collect()
}

const SELECT_RULES: &str =
    "SELECT id, name, token_filter, min_severity, lock_file, kill_process, run_script, enabled, created_at FROM auto_responses";


pub async fn list_all_rules(db: &Db) -> Vec<AutoResponse> {
    let rows = sqlx::query_as(SELECT_RULES)
        .fetch_all(db).await.unwrap_or_default();
    parse_rows(rows)
}


pub async fn load_rules(db: &Db) -> Vec<AutoResponse> {
    let rows = sqlx::query_as(&format!("{SELECT_RULES} WHERE enabled = 1"))
        .fetch_all(db).await.unwrap_or_default();
    parse_rows(rows)
}

pub async fn create_rule(db: &Db, rule: AutoResponse) -> crate::error::Result<AutoResponse> {
    let id = Uuid::now_v7().to_string();
    let now = OffsetDateTime::now_utc().to_string();
    let min_sev = format!("{:?}", rule.min_severity).to_lowercase();

    sqlx::query(
        "INSERT INTO auto_responses (id, name, token_filter, min_severity, lock_file, kill_process, run_script, enabled, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&rule.name)
    .bind(&rule.token_filter)
    .bind(&min_sev)
    .bind(rule.lock_file as i64)
    .bind(rule.kill_process as i64)
    .bind(&rule.run_script)
    .bind(rule.enabled as i64)
    .bind(&now)
    .execute(db)
    .await?;

    Ok(AutoResponse { id, created_at: now, ..rule })
}

pub async fn delete_rule(db: &Db, id: &str) -> crate::error::Result<()> {
    sqlx::query("DELETE FROM auto_responses WHERE id = ?")
        .bind(id)
        .execute(db)
        .await?;
    Ok(())
}


pub async fn execute(db: &Db, alert: &Alert, token_path: &str, pid: Option<u32>) {
    let rules = load_rules(db).await;

    for rule in rules {
        if !rule_matches(&rule, alert) {
            continue;
        }

        tracing::info!("Auto-response rule '{}' firing for alert {}", rule.name, alert.id);

        if rule.lock_file {
            lock_file(token_path);
        }

        if rule.kill_process {
            if let Some(pid) = pid {
                kill_process(pid);
            }
        }

        if let Some(ref script) = rule.run_script {
            run_script(script, alert, token_path);
        }
    }
}

fn rule_matches(rule: &AutoResponse, alert: &Alert) -> bool {
    if alert.is_test {
        return false;
    }


    if let Some(ref filter) = rule.token_filter {
        let ids: Vec<&str> = filter.split(',').map(|s| s.trim()).collect();
        if !ids.contains(&alert.token_id.as_str()) {
            return false;
        }
    }


    severity_gte(&alert.severity, &rule.min_severity)
}

fn severity_gte(a: &Severity, b: &Severity) -> bool {
    severity_rank(a) >= severity_rank(b)
}

fn severity_rank(s: &Severity) -> u8 {
    match s {
        Severity::Info => 0,
        Severity::Warn => 1,
        Severity::Critical => 2,
    }
}

fn lock_file(path: &str) {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(meta) = std::fs::metadata(path) {
            let mut perms = meta.permissions();
            perms.set_mode(0o000);
            if let Err(e) = std::fs::set_permissions(path, perms) {
                tracing::warn!("lock_file failed for {path}: {e}");
            } else {
                tracing::info!("Locked file {path}");
            }
        }
    }
}

fn kill_process(pid: u32) {
    #[cfg(unix)]
    unsafe {

        let ret = libc::kill(pid as libc::pid_t, libc::SIGTERM);
        if ret == 0 {
            tracing::info!("Sent SIGTERM to PID {pid}");
        } else {
            tracing::warn!("kill({pid}, SIGTERM) failed: errno = {}", *libc::__errno_location());
        }
    }
}

fn run_script(script: &str, alert: &Alert, token_path: &str) {
    let alert_id = alert.id.clone();
    let severity = format!("{:?}", alert.severity).to_lowercase();
    let script = script.to_string();
    let path = token_path.to_string();

    std::thread::spawn(move || {
        let out = std::process::Command::new("sh")
            .arg("-c")
            .arg(&script)
            .env("ZHONEYPOT_ALERT_ID", &alert_id)
            .env("ZHONEYPOT_SEVERITY", &severity)
            .env("ZHONEYPOT_TOKEN_PATH", &path)
            .output();

        match out {
            Ok(o) if o.status.success() => tracing::info!("Auto-response script completed OK"),
            Ok(o) => tracing::warn!(
                "Auto-response script exited {}: {}",
                o.status,
                String::from_utf8_lossy(&o.stderr)
            ),
            Err(e) => tracing::warn!("Auto-response script failed to launch: {e}"),
        }
    });
}

fn parse_severity(s: &str) -> Severity {
    match s {
        "critical" => Severity::Critical,
        "warn" => Severity::Warn,
        _ => Severity::Info,
    }
}
