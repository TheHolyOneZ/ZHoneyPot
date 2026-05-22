use crate::domain::token::{Severity, TokenKind, TokenSpec};

pub fn specs(home: &str) -> Vec<TokenSpec> {
    vec![
        TokenSpec {
            kind: TokenKind::AwsCredentials,
            path: format!("{home}/.aws/credentials"),
            display_name: Some("AWS Credentials (Developer)".into()),
            metadata: serde_json::json!({ "profile": "default", "region": "us-east-1" }),
            severity: Severity::Critical,
            callback_url: None,
        },
        TokenSpec {
            kind: TokenKind::SshKeypair,
            path: format!("{home}/.ssh/id_rsa_backup"),
            display_name: Some("SSH Backup Key".into()),
            metadata: serde_json::json!({ "comment": "backup@workstation" }),
            severity: Severity::Critical,
            callback_url: None,
        },
        TokenSpec {
            kind: TokenKind::Dotenv,
            path: format!("{home}/projects/internal-api/.env"),
            display_name: Some(".env (internal-api)".into()),
            metadata: serde_json::json!({ "app_name": "internal-api" }),
            severity: Severity::Warn,
            callback_url: None,
        },
        TokenSpec {
            kind: TokenKind::PasswordsTxt,
            path: format!("{home}/Documents/passwords.txt"),
            display_name: Some("Passwords list".into()),
            metadata: serde_json::json!({}),
            severity: Severity::Critical,
            callback_url: None,
        },
    ]
}
