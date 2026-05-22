use crate::domain::token::{Severity, TokenKind, TokenSpec};

pub fn specs() -> Vec<TokenSpec> {
    vec![
        TokenSpec {
            kind: TokenKind::AwsCredentials,
            path: "/root/.aws/credentials".into(),
            display_name: Some("AWS Credentials (root)".into()),
            metadata: serde_json::json!({ "profile": "default", "region": "us-east-1" }),
            severity: Severity::Critical,
            callback_url: None,
        },
        TokenSpec {
            kind: TokenKind::Dotenv,
            path: "/var/www/app/.env".into(),
            display_name: Some(".env (web app)".into()),
            metadata: serde_json::json!({ "app_name": "webapp" }),
            severity: Severity::Critical,
            callback_url: None,
        },
    ]
}
