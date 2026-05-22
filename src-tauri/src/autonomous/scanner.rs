

use crate::domain::autonomous::{ScanResult, ScanSuggestion};
use crate::domain::token::{Severity, TokenKind, TokenSpec};
use crate::storage::{tokens_repo, Db};
use std::path::{Path, PathBuf};

pub async fn scan(db: &Db, extra_paths: &[String]) -> ScanResult {
    let home = dirs_home();
    let existing = tokens_repo::list(db).await.unwrap_or_default();
    let existing_paths: std::collections::HashSet<String> =
        existing.iter().map(|t| t.path.clone()).collect();

    let mut suggestions = Vec::new();
    let mut scanned = 0u32;


    let aws_dir = home.join(".aws");
    let aws_creds = aws_dir.join("credentials");
    scanned += 1;
    if aws_dir.exists() && !existing_paths.contains(&aws_creds.display().to_string()) {
        suggestions.push(ScanSuggestion {
            kind: TokenKind::AwsCredentials,
            suggested_path: aws_creds.display().to_string(),
            reason: "~/.aws/ directory exists — add a fake credentials file".into(),
            confidence: 0.95,
            spec: TokenSpec {
                kind: TokenKind::AwsCredentials,
                path: aws_creds.display().to_string(),
                display_name: Some("AWS Credentials (auto)".into()),
                metadata: serde_json::json!({ "profile": "default", "region": "us-east-1" }),
                severity: Severity::Critical,
                callback_url: None,
            },
        });
    }


    let ssh_dir = home.join(".ssh");
    scanned += 1;
    if ssh_dir.exists() {
        let backup_key = ssh_dir.join("id_rsa_backup");
        if !existing_paths.contains(&backup_key.display().to_string()) {
            suggestions.push(ScanSuggestion {
                kind: TokenKind::SshKeypair,
                suggested_path: backup_key.display().to_string(),
                reason: "~/.ssh/ exists — a backup key is a realistic decoy".into(),
                confidence: 0.9,
                spec: TokenSpec {
                    kind: TokenKind::SshKeypair,
                    path: backup_key.display().to_string(),
                    display_name: Some("SSH Backup Key".into()),
                    metadata: serde_json::json!({ "comment": "backup@workstation" }),
                    severity: Severity::Critical,
                    callback_url: None,
                },
            });
        }
    }


    let kube_config = home.join(".kube").join("config");
    scanned += 1;
    if which_exists("kubectl") && !existing_paths.contains(&kube_config.display().to_string()) {
        suggestions.push(ScanSuggestion {
            kind: TokenKind::KubeConfig,
            suggested_path: kube_config.display().to_string(),
            reason: "`kubectl` is installed — fake kubeconfig is a high-value decoy".into(),
            confidence: 0.88,
            spec: TokenSpec {
                kind: TokenKind::KubeConfig,
                path: kube_config.display().to_string(),
                display_name: Some("Kubeconfig (auto)".into()),
                metadata: serde_json::json!({}),
                severity: Severity::Critical,
                callback_url: None,
            },
        });
    }


    let docker_config = home.join(".docker").join("config.json");
    scanned += 1;
    if which_exists("docker") && !existing_paths.contains(&docker_config.display().to_string()) {
        suggestions.push(ScanSuggestion {
            kind: TokenKind::DockerConfig,
            suggested_path: docker_config.display().to_string(),
            reason: "`docker` is installed — fake Docker config with registry creds".into(),
            confidence: 0.82,
            spec: TokenSpec {
                kind: TokenKind::DockerConfig,
                path: docker_config.display().to_string(),
                display_name: Some("Docker Config (auto)".into()),
                metadata: serde_json::json!({}),
                severity: Severity::Warn,
                callback_url: None,
            },
        });
    }


    let project_dirs = vec![
        home.join("projects"),
        home.join("code"),
        home.join("src"),
        home.join("dev"),
        home.join("work"),
    ];

    for dir in &project_dirs {
        if dir.exists() {
            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    scanned += 1;
                    let path = entry.path();
                    if path.is_dir() && path.join(".git").exists() {
                        let env_path = path.join(".env");
                        if !existing_paths.contains(&env_path.display().to_string()) {
                            let app_name = path
                                .file_name()
                                .and_then(|n| n.to_str())
                                .unwrap_or("app")
                                .to_string();
                            suggestions.push(ScanSuggestion {
                                kind: TokenKind::Dotenv,
                                suggested_path: env_path.display().to_string(),
                                reason: format!("Git repo `{app_name}` found — .env is the most commonly leaked file"),
                                confidence: 0.85,
                                spec: TokenSpec {
                                    kind: TokenKind::Dotenv,
                                    path: env_path.display().to_string(),
                                    display_name: Some(format!(".env ({app_name})")),
                                    metadata: serde_json::json!({ "app_name": app_name }),
                                    severity: Severity::Warn,
                                    callback_url: None,
                                },
                            });
                        }
                    }
                }
            }
        }
    }


    for extra in extra_paths {
        let p = PathBuf::from(extra);
        scanned += 1;
        if p.is_dir() {
            if let Ok(entries) = std::fs::read_dir(&p) {
                for _entry in entries.flatten() {
                    scanned += 1;
                }
            }
        }
    }


    let docs = home.join("Documents");
    let pw_path = docs.join("passwords.txt");
    scanned += 1;
    if !existing_paths.contains(&pw_path.display().to_string()) {
        suggestions.push(ScanSuggestion {
            kind: TokenKind::PasswordsTxt,
            suggested_path: pw_path.display().to_string(),
            reason: "~/Documents/passwords.txt is a classic high-signal decoy".into(),
            confidence: 0.75,
            spec: TokenSpec {
                kind: TokenKind::PasswordsTxt,
                path: pw_path.display().to_string(),
                display_name: Some("Passwords.txt".into()),
                metadata: serde_json::json!({}),
                severity: Severity::Critical,
                callback_url: None,
            },
        });
    }


    suggestions.sort_by(|a, b| b.confidence.partial_cmp(&a.confidence).unwrap_or(std::cmp::Ordering::Equal));

    let total_possible = suggestions.len() + existing.len();
    let coverage_score = if total_possible == 0 {
        1.0
    } else {
        existing.len() as f32 / total_possible as f32
    };

    ScanResult { suggestions, coverage_score, scanned_paths: scanned }
}

fn dirs_home() -> PathBuf {
    std::env::var("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("/tmp"))
}

fn which_exists(cmd: &str) -> bool {
    std::env::var("PATH")
        .unwrap_or_default()
        .split(':')
        .any(|dir| Path::new(dir).join(cmd).exists())
}
