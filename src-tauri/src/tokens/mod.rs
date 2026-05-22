pub mod aws_credentials;
pub mod docker_config;
pub mod dotenv;
pub mod generic_file;
pub mod git_repo;
pub mod kube_config;
pub mod npmrc;
pub mod passwords_txt;
pub mod pypirc;
pub mod ssh_keypair;

use crate::domain::token::{TokenKind, TokenSpec};
use crate::error::Result;
use std::path::Path;

pub fn generate(spec: &TokenSpec) -> Result<GeneratedContent> {
    match spec.kind {
        TokenKind::AwsCredentials  => aws_credentials::generate(spec),
        TokenKind::Dotenv          => dotenv::generate(spec),
        TokenKind::SshKeypair      => ssh_keypair::generate(spec),
        TokenKind::GitRepo         => git_repo::generate(spec),
        TokenKind::PasswordsTxt    => passwords_txt::generate(spec),
        TokenKind::KubeConfig      => kube_config::generate(spec),
        TokenKind::DockerConfig    => docker_config::generate(spec),
        TokenKind::Npmrc           => npmrc::generate(spec),
        TokenKind::Pypirc          => pypirc::generate(spec),
        TokenKind::GenericFile     => generic_file::generate(spec),
    }
}

pub struct GeneratedContent {
    pub content: String,
    pub content_hash: String,
}

impl GeneratedContent {
    pub fn new(content: String) -> Self {
        let hash = blake3::hash(content.as_bytes()).to_hex().to_string();
        Self { content, content_hash: hash }
    }
}

pub fn write_to_disk(path: &Path, content: &str, mode: u32) -> Result<()> {
    use std::fs;
    #[cfg(unix)]
    use std::os::unix::fs::PermissionsExt;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    fs::write(path, content)?;

    #[cfg(unix)]
    {
        let perms = fs::Permissions::from_mode(mode);
        fs::set_permissions(path, perms)?;
    }

    Ok(())
}
