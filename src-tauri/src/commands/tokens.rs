use crate::domain::token::{Token, TokenSpec};
use crate::error::AppError;
use crate::storage::{tokens_repo, Db};
use crate::tokens;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager, State};

#[tauri::command]
pub async fn tokens_list(db: State<'_, Db>) -> Result<Vec<Token>, AppError> {
    tokens_repo::list(&db).await
}

#[tauri::command]
pub async fn tokens_get(db: State<'_, Db>, id: String) -> Result<Token, AppError> {
    tokens_repo::get(&db, &id).await
}

#[tauri::command]
pub async fn tokens_create(
    db: State<'_, Db>,
    app: AppHandle,
    mut spec: TokenSpec,
) -> Result<Token, AppError> {

    if spec.path.starts_with("~/") || spec.path == "~" {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".into());
        spec.path = format!("{}{}", home, &spec.path[1..]);
    }

    let generated = tokens::generate(&spec)?;
    let path = Path::new(&spec.path);

    tokens::write_to_disk(path, &generated.content, 0o600)?;

    let token = tokens_repo::insert(&db, &spec, &generated.content_hash).await?;


    if let Some(reg) = app.try_state::<crate::watcher::WatcherRegistrar>() {
        let _ = reg.0.send(PathBuf::from(&token.path));
    }

    tracing::info!("Token created: {} at {}", token.id, token.path);

    Ok(token)
}

#[tauri::command]
pub async fn tokens_delete(db: State<'_, Db>, id: String, remove_file: Option<bool>) -> Result<(), AppError> {
    let token = tokens_repo::get(&db, &id).await?;

    if remove_file.unwrap_or(false) {
        let _ = std::fs::remove_file(&token.path);
    }

    tokens_repo::delete(&db, &id).await
}

#[tauri::command]
pub async fn tokens_test_trigger(
    db: State<'_, Db>,
    id: String,
) -> Result<(), AppError> {
    use crate::domain::alert::EventKind;

    use crate::storage::alerts_repo;

    let token = tokens_repo::get(&db, &id).await?;

    let new_alert = alerts_repo::NewAlert {
        token_id: token.id.clone(),
        event_kind: EventKind::Test,
        severity: token.severity.clone(),
        is_test: true,
        forensics: None,
        raw_event: None,
    };

    let alert = alerts_repo::insert(&db, new_alert).await?;
    crate::alerts::chain::append(&db, &alert).await?;


    tracing::info!("Test trigger fired for token {}", id);
    Ok(())
}
