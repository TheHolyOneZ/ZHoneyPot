use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct NotificationSettings {
    pub desktop_enabled: bool,
    pub tray_enabled: bool,
    pub webhook_url: Option<String>,
    pub sound_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct CallbackSettings {
    pub server_url: Option<String>,
    pub server_secret: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct DaemonSettings {
    pub autostart: bool,
    pub close_to_tray: bool,
    pub start_minimized: bool,
    pub log_level: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct StorageSettings {
    pub max_alerts: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "snake_case")]
pub enum Theme {
    System,
    Light,
    Dark,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct AppSettings {
    pub notifications: NotificationSettings,
    pub callback: CallbackSettings,
    pub daemon: DaemonSettings,
    pub storage: StorageSettings,
    pub theme: Theme,
    pub network_audit_enabled: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            notifications: NotificationSettings {
                desktop_enabled: true,
                tray_enabled: true,
                webhook_url: None,
                sound_enabled: false,
            },
            callback: CallbackSettings {
                server_url: None,
                server_secret: None,
            },
            daemon: DaemonSettings {
                autostart: true,
                close_to_tray: true,
                start_minimized: false,
                log_level: "info".into(),
            },
            storage: StorageSettings { max_alerts: 10_000 },
            theme: Theme::System,
            network_audit_enabled: true,
        }
    }
}
