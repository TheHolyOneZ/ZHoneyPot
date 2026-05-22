use crate::domain::settings::AppSettings;
use crate::error::AppError;
use crate::storage::{settings_repo, Db};
use std::sync::atomic::Ordering;
use tauri::{AppHandle, State};
use tauri_plugin_autostart::ManagerExt;

#[tauri::command]
pub async fn settings_get(db: State<'_, Db>) -> Result<AppSettings, AppError> {
    settings_repo::load(&db).await
}

#[tauri::command]
pub async fn settings_set(
    app: AppHandle,
    db: State<'_, Db>,
    settings: AppSettings,
) -> Result<(), AppError> {
    settings_repo::save(&db, &settings).await?;


    let mgr = app.autolaunch();
    if settings.daemon.autostart {
        let _ = mgr.enable();
    } else {
        let _ = mgr.disable();
    }


    crate::commands::daemon::CLOSE_TO_TRAY
        .store(settings.daemon.close_to_tray, Ordering::Relaxed);

    Ok(())
}


#[tauri::command]
pub async fn app_reset(db: State<'_, Db>) -> Result<(), AppError> {

    let paths: Vec<(String,)> =
        sqlx::query_as("SELECT path FROM tokens")
            .fetch_all(&*db)
            .await
            .unwrap_or_default();


    for (path,) in &paths {
        let _ = std::fs::remove_file(path);
    }


    sqlx::query("DELETE FROM alert_chain").execute(&*db).await?;
    sqlx::query("DELETE FROM alerts").execute(&*db).await?;
    sqlx::query("DELETE FROM heal_queue").execute(&*db).await?;
    sqlx::query("DELETE FROM auto_responses").execute(&*db).await?;
    sqlx::query("DELETE FROM access_baseline").execute(&*db).await?;
    sqlx::query("DELETE FROM network_audit").execute(&*db).await?;
    sqlx::query("DELETE FROM tokens").execute(&*db).await?;
    sqlx::query("DELETE FROM settings").execute(&*db).await?;

    tracing::warn!("App reset: all data wiped by user");
    Ok(())
}
