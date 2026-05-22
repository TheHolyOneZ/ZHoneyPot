use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct DeploymentTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub token_count: usize,
}
