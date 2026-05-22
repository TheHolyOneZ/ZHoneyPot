use crate::domain::settings::AppSettings;
use crate::error::Result;
use sqlx::SqlitePool;

const SETTINGS_KEY: &str = "app_settings";

pub async fn load(pool: &SqlitePool) -> Result<AppSettings> {
    let row: Option<(String,)> =
        sqlx::query_as("SELECT value FROM settings WHERE key = ?")
            .bind(SETTINGS_KEY)
            .fetch_optional(pool)
            .await?;

    match row {
        Some((json,)) => Ok(serde_json::from_str(&json)?),
        None => Ok(AppSettings::default()),
    }
}

pub async fn save(pool: &SqlitePool, settings: &AppSettings) -> Result<()> {
    let json = serde_json::to_string(settings)?;
    sqlx::query(
        "INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .bind(SETTINGS_KEY)
    .bind(&json)
    .execute(pool)
    .await?;
    Ok(())
}
