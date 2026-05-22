use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::token::{Severity, TokenSpec};

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct AutoResponse {
    pub id: String,
    pub name: String,
    pub token_filter: Option<String>,
    pub min_severity: Severity,
    pub lock_file: bool,
    pub kill_process: bool,
    pub run_script: Option<String>,
    pub enabled: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct AccessBaseline {
    pub token_id: String,
    pub hour_histogram: Vec<u64>,
    pub day_histogram: Vec<u64>,
    pub total_accesses: u64,
    pub last_updated: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ScanSuggestion {
    pub kind: super::token::TokenKind,
    pub suggested_path: String,
    pub reason: String,
    pub confidence: f32,
    pub spec: TokenSpec,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ScanResult {
    pub suggestions: Vec<ScanSuggestion>,
    pub coverage_score: f32,
    pub scanned_paths: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct AnomalyFlags {
    pub is_anomalous: bool,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct AutonomousSettings {
    pub self_heal_enabled: bool,
    pub heal_delay_secs: u64,
    pub auto_response_enabled: bool,
    pub anomaly_detection_enabled: bool,
    pub scanner_paths: Vec<String>,
}

impl Default for AutonomousSettings {
    fn default() -> Self {
        Self {
            self_heal_enabled: false,
            heal_delay_secs: 60,
            auto_response_enabled: false,
            anomaly_detection_enabled: true,
            scanner_paths: vec![],
        }
    }
}
