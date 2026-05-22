use crate::domain::template::DeploymentTemplate;
use crate::error::AppError;

#[tauri::command]
pub async fn templates_list() -> Result<Vec<DeploymentTemplate>, AppError> {
    Ok(vec![
        DeploymentTemplate {
            id: "developer_workstation".into(),
            name: "Developer Workstation".into(),
            description: "AWS credentials, SSH keypair, .env files, fake git repo".into(),
            token_count: 5,
        },
        DeploymentTemplate {
            id: "server_simulation".into(),
            name: "Server Simulation".into(),
            description: "Root AWS creds, cron script with embedded secrets, DB dump".into(),
            token_count: 3,
        },
        DeploymentTemplate {
            id: "minimal".into(),
            name: "Minimal".into(),
            description: "3 highest-signal tokens to get started fast".into(),
            token_count: 3,
        },
    ])
}
