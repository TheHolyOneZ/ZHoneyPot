use crate::domain::token::{Token, TokenSpec, TokenStatus};
use crate::error::{AppError, Result};
use sqlx::SqlitePool;
use time::OffsetDateTime;
use uuid::Uuid;

fn parse_token(row: &sqlx::sqlite::SqliteRow) -> Result<Token> {
    use sqlx::Row;
    Ok(Token {
        id: row.try_get("id")?,
        kind: serde_json::from_str(&format!("\"{}\"", row.try_get::<String, _>("kind")?))
            .map_err(AppError::Serde)?,
        path: row.try_get("path")?,
        display_name: row.try_get("display_name")?,
        metadata: serde_json::from_str(row.try_get::<String, _>("metadata")?.as_str())
            .map_err(AppError::Serde)?,
        content_hash: row.try_get("content_hash")?,
        status: serde_json::from_str(&format!("\"{}\"", row.try_get::<String, _>("status")?))
            .map_err(AppError::Serde)?,
        severity: serde_json::from_str(&format!("\"{}\"", row.try_get::<String, _>("severity")?))
            .map_err(AppError::Serde)?,
        callback_url: row.try_get("callback_url")?,
        created_at: row.try_get("created_at")?,
        updated_at: row.try_get("updated_at")?,
        last_seen_at: row.try_get("last_seen_at")?,
        last_triggered_at: row.try_get("last_triggered_at")?,
    })
}

pub async fn list(pool: &SqlitePool) -> Result<Vec<Token>> {
    let rows = sqlx::query("SELECT * FROM tokens ORDER BY created_at DESC")
        .fetch_all(pool)
        .await?;
    rows.iter().map(parse_token).collect()
}

pub async fn get(pool: &SqlitePool, id: &str) -> Result<Token> {
    let row = sqlx::query("SELECT * FROM tokens WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::TokenNotFound(id.to_string()))?;
    parse_token(&row)
}

pub async fn get_by_path(pool: &SqlitePool, path: &str) -> Result<Option<Token>> {
    let row = sqlx::query("SELECT * FROM tokens WHERE path = ?")
        .bind(path)
        .fetch_optional(pool)
        .await?;
    row.as_ref().map(parse_token).transpose()
}

pub async fn insert(pool: &SqlitePool, spec: &TokenSpec, content_hash: &str) -> Result<Token> {
    let id = Uuid::now_v7();
    let now = OffsetDateTime::now_utc();
    let kind = serde_json::to_string(&spec.kind)?.trim_matches('"').to_string();
    let severity = serde_json::to_string(&spec.severity)?.trim_matches('"').to_string();
    let metadata = serde_json::to_string(&spec.metadata)?;

    sqlx::query(
        "INSERT INTO tokens (id, kind, path, display_name, metadata, content_hash, status, severity, callback_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)"
    )
    .bind(id.to_string())
    .bind(&kind)
    .bind(&spec.path)
    .bind(&spec.display_name)
    .bind(&metadata)
    .bind(content_hash)
    .bind(&severity)
    .bind(&spec.callback_url)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

    get(pool, &id.to_string()).await
}

pub async fn set_status(pool: &SqlitePool, id: &str, status: &TokenStatus) -> Result<()> {
    let status_str = serde_json::to_string(status)?.trim_matches('"').to_string();
    sqlx::query("UPDATE tokens SET status = ?, updated_at = ? WHERE id = ?")
        .bind(&status_str)
        .bind(OffsetDateTime::now_utc())
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn touch_triggered(pool: &SqlitePool, id: &str) -> Result<()> {
    let now = OffsetDateTime::now_utc();
    sqlx::query("UPDATE tokens SET last_triggered_at = ?, updated_at = ? WHERE id = ?")
        .bind(now)
        .bind(now)
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn delete(pool: &SqlitePool, id: &str) -> Result<()> {
    sqlx::query("DELETE FROM tokens WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}
