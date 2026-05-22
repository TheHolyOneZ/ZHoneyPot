pub mod alerts;
pub mod autonomous;
pub mod commands;
pub mod config;
pub mod daemon;
pub mod domain;
pub mod error;
pub mod forensics;
pub mod ipc;
pub mod storage;
pub mod telemetry;
pub mod tokens;
pub mod watcher;

use config::AppPaths;
use std::sync::atomic::Ordering;
use tauri::{Manager, WindowEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let paths = AppPaths::resolve();
            paths.ensure_dirs()?;

            telemetry::init(&paths.logs);
            commands::daemon::record_start();

            daemon::tray::build(app.handle())?;

            let app_handle = app.handle().clone();


            let start_hidden = std::env::args().any(|a| a == "--minimized");

            tauri::async_runtime::spawn(async move {
                match storage::open(&AppPaths::resolve().db).await {
                    Ok(db) => {
                        app_handle.manage(db.clone());
                        let paths = AppPaths::resolve();


                        if let Ok(s) = storage::settings_repo::load(&db).await {
                            commands::daemon::CLOSE_TO_TRAY
                                .store(s.daemon.close_to_tray, Ordering::Relaxed);


                            use tauri_plugin_autostart::ManagerExt;
                            let mgr = app_handle.autolaunch();
                            if s.daemon.autostart {
                                let _ = mgr.enable();
                            } else {
                                let _ = mgr.disable();
                            }


                            if s.daemon.start_minimized || start_hidden {
                                if let Some(w) = app_handle.get_webview_window("main") {
                                    let _ = w.hide();
                                }
                            }
                        }

                        daemon::start(app_handle, db, paths).await;
                    }
                    Err(e) => {
                        tracing::error!("Failed to open database: {e}");
                    }
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if crate::commands::daemon::CLOSE_TO_TRAY.load(Ordering::Relaxed) {
                    api.prevent_close();
                    let _ = window.hide();
                }

            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::tokens::tokens_list,
            commands::tokens::tokens_get,
            commands::tokens::tokens_create,
            commands::tokens::tokens_delete,
            commands::tokens::tokens_test_trigger,
            commands::alerts::alerts_list,
            commands::alerts::alerts_get,
            commands::alerts::alerts_acknowledge,
            commands::alerts::alerts_verify_chain,
            commands::alerts::alerts_rebuild_chain,
            commands::settings::settings_get,
            commands::settings::settings_set,
            commands::settings::app_reset,
            commands::daemon::daemon_status,
            commands::templates::templates_list,
            commands::autonomous::autonomous_scan,
            commands::autonomous::autonomous_get_settings,
            commands::autonomous::autonomous_set_settings,
            commands::autonomous::auto_responses_list,
            commands::autonomous::auto_responses_create,
            commands::autonomous::auto_responses_delete,
            commands::autonomous::anomaly_get_baseline,
            commands::selftest::self_test_run,
        ])
        .run(tauri::generate_context!())
        .expect("Error running ZHoneyPot");
}
