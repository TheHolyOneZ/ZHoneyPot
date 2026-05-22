use crate::autonomous::{anomaly, responder, scanner};
use crate::domain::autonomous::{
    AccessBaseline, AutoResponse, AutonomousSettings, ScanResult,
};
use crate::error::AppError;
use crate::storage::Db;
use tauri::State;

#[tauri::command]
pub async fn autonomous_scan(db: State<'_, Db>, extra_paths: Option<Vec<String>>) -> Result<ScanResult, AppError> {
    let paths = extra_paths.unwrap_or_default();
    Ok(scanner::scan(&db, &paths).await)
}

#[tauri::command]
pub async fn autonomous_get_settings(db: State<'_, Db>) -> Result<AutonomousSettings, AppError> {
    let row: Option<(String,)> =
        sqlx::query_as("SELECT value FROM settings WHERE key = 'autonomous'")
            .fetch_optional(&*db)
            .await?;
    Ok(row
        .and_then(|(v,)| serde_json::from_str(&v).ok())
        .unwrap_or_default())
}

#[tauri::command]
pub async fn autonomous_set_settings(
    db: State<'_, Db>,
    settings: AutonomousSettings,
) -> Result<(), AppError> {
    let json = serde_json::to_string(&settings)?;
    sqlx::query(
        "INSERT INTO settings (key, value) VALUES ('autonomous', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .bind(&json)
    .execute(&*db)
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn auto_responses_list(db: State<'_, Db>) -> Result<Vec<AutoResponse>, AppError> {
    Ok(responder::list_all_rules(&db).await)
}

#[tauri::command]
pub async fn auto_responses_create(
    db: State<'_, Db>,
    rule: AutoResponse,
) -> Result<AutoResponse, AppError> {
    responder::create_rule(&db, rule).await
}

#[tauri::command]
pub async fn auto_responses_delete(db: State<'_, Db>, id: String) -> Result<(), AppError> {
    responder::delete_rule(&db, &id).await
}

#[tauri::command]
pub async fn anomaly_get_baseline(
    db: State<'_, Db>,
    token_id: String,
) -> Result<Option<AccessBaseline>, AppError> {
    Ok(anomaly::get_baseline(&db, &token_id).await)
}
