use crate::domain::token::{Severity, TokenKind, TokenSpec};

pub fn specs(home: &str) -> Vec<TokenSpec> {
    vec![
        TokenSpec {
            kind: TokenKind::AwsCredentials,
            path: format!("{home}/.aws/credentials"),
            display_name: Some("AWS Credentials".into()),
            metadata: serde_json::json!({ "profile": "default", "region": "us-east-1" }),
            severity: Severity::Critical,
            callback_url: None,
        },
        TokenSpec {
            kind: TokenKind::Dotenv,
            path: format!("{home}/.env"),
            display_name: Some("Root .env".into()),
            metadata: serde_json::json!({ "app_name": "myapp" }),
            severity: Severity::Warn,
            callback_url: None,
        },
        TokenSpec {
            kind: TokenKind::PasswordsTxt,
            path: format!("{home}/Documents/passwords.txt"),
            display_name: Some("Passwords".into()),
            metadata: serde_json::json!({}),
            severity: Severity::Critical,
            callback_url: None,
        },
    ]
}
