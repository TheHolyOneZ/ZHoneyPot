use crate::alerts::chain;
use crate::domain::alert::Alert;
use crate::error::AppError;
use crate::storage::{alerts_repo, Db};
use serde::Serialize;
use tauri::State;

#[tauri::command]
pub async fn alerts_list(db: State<'_, Db>, limit: Option<u32>) -> Result<Vec<Alert>, AppError> {
    alerts_repo::list(&db, limit.unwrap_or(100)).await
}

#[tauri::command]
pub async fn alerts_get(db: State<'_, Db>, id: String) -> Result<Alert, AppError> {
    alerts_repo::get(&db, &id).await
}

#[tauri::command]
pub async fn alerts_acknowledge(
    db: State<'_, Db>,
    id: String,
    note: Option<String>,
) -> Result<(), AppError> {
    alerts_repo::acknowledge(&db, &id, note.as_deref()).await
}

#[derive(Serialize)]
pub struct ChainVerifyResult {
    pub ok: bool,
    pub tampered_at_seq: Option<i64>,
}

#[tauri::command]
pub async fn alerts_verify_chain(db: State<'_, Db>) -> Result<ChainVerifyResult, AppError> {
    let result = chain::verify(&db).await?;
    Ok(ChainVerifyResult {
        ok: result.ok,
        tampered_at_seq: result.tampered_at_seq,
    })
}

#[tauri::command]
pub async fn alerts_rebuild_chain(db: State<'_, Db>) -> Result<usize, AppError> {
    chain::rebuild(&db).await
}
