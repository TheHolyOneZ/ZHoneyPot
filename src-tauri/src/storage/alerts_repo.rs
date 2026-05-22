use crate::domain::alert::{Alert, EventKind, ForensicSnapshot};
use crate::domain::token::Severity;
use crate::error::{AppError, Result};
use sqlx::SqlitePool;
use time::OffsetDateTime;
use uuid::Uuid;

pub struct NewAlert {
    pub token_id: String,
    pub event_kind: EventKind,
    pub severity: Severity,
    pub is_test: bool,
    pub forensics: Option<ForensicSnapshot>,
    pub raw_event: Option<serde_json::Value>,
}

fn parse_alert(row: &sqlx::sqlite::SqliteRow) -> Result<Alert> {
    use sqlx::Row;

    let process_json: Option<String> = row.try_get("process_info")?;
    let network_json: String = row.try_get("network_info")?;
    let raw_json: Option<String> = row.try_get("raw_event")?;
    let is_test: i64 = row.try_get("is_test")?;
    let acknowledged: i64 = row.try_get("acknowledged")?;

    Ok(Alert {
        id: row.try_get("id")?,
        token_id: row.try_get("token_id")?,
        triggered_at: row.try_get("triggered_at")?,
        event_kind: serde_json::from_str(&format!("\"{}\"", row.try_get::<String, _>("event_kind")?))
            .map_err(AppError::Serde)?,
        severity: serde_json::from_str(&format!("\"{}\"", row.try_get::<String, _>("severity")?))
            .map_err(AppError::Serde)?,
        is_test: is_test != 0,
        process_info: process_json
            .as_deref()
            .map(serde_json::from_str)
            .transpose()
            .map_err(AppError::Serde)?,
        network_info: serde_json::from_str(&network_json).map_err(AppError::Serde)?,
        raw_event: raw_json
            .as_deref()
            .map(serde_json::from_str)
            .transpose()
            .map_err(AppError::Serde)?,
        acknowledged: acknowledged != 0,
        ack_at: row.try_get("ack_at")?,
        note: row.try_get("note")?,
    })
}

pub async fn insert(pool: &SqlitePool, new: NewAlert) -> Result<Alert> {
    let id = Uuid::now_v7();
    let now = OffsetDateTime::now_utc();
    let kind_str = serde_json::to_string(&new.event_kind)?.trim_matches('"').to_string();
    let sev_str = serde_json::to_string(&new.severity)?.trim_matches('"').to_string();
    let process_json = new
        .forensics
        .as_ref()
        .and_then(|f| f.process.as_ref())
        .map(|p| serde_json::to_string(p))
        .transpose()?;
    let network_json = new
        .forensics
        .as_ref()
        .map(|f| serde_json::to_string(&f.connections))
        .transpose()?
        .unwrap_or_else(|| "[]".into());
    let raw_json = new
        .raw_event
        .map(|v| serde_json::to_string(&v))
        .transpose()?;

    sqlx::query(
        "INSERT INTO alerts (id, token_id, triggered_at, event_kind, severity, is_test, process_info, network_info, raw_event)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(id.to_string())
    .bind(&new.token_id)
    .bind(now)
    .bind(&kind_str)
    .bind(&sev_str)
    .bind(new.is_test as i64)
    .bind(&process_json)
    .bind(&network_json)
    .bind(&raw_json)
    .execute(pool)
    .await?;

    get(pool, &id.to_string()).await
}

pub async fn get(pool: &SqlitePool, id: &str) -> Result<Alert> {
    let row = sqlx::query("SELECT * FROM alerts WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::AlertNotFound(id.to_string()))?;
    parse_alert(&row)
}

pub async fn list(pool: &SqlitePool, limit: u32) -> Result<Vec<Alert>> {
    let rows = sqlx::query("SELECT * FROM alerts ORDER BY triggered_at DESC LIMIT ?")
        .bind(limit)
        .fetch_all(pool)
        .await?;
    rows.iter().map(parse_alert).collect()
}

pub async fn acknowledge(pool: &SqlitePool, id: &str, note: Option<&str>) -> Result<()> {
    let now = OffsetDateTime::now_utc();
    sqlx::query("UPDATE alerts SET acknowledged = 1, ack_at = ?, note = COALESCE(?, note) WHERE id = ?")
        .bind(now)
        .bind(note)
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}
