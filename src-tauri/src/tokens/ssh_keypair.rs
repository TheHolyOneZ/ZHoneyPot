use crate::domain::token::TokenSpec;
use crate::error::{AppError, Result};

use super::GeneratedContent;

pub fn generate(spec: &TokenSpec) -> Result<GeneratedContent> {
    use ssh_key::{Algorithm, LineEnding, PrivateKey};
    use rand::rngs::OsRng;

    let _comment = spec.metadata
        .get("comment")
        .and_then(|v| v.as_str())
        .unwrap_or("user@workstation");

    let key = PrivateKey::random(&mut OsRng, Algorithm::Ed25519)
        .map_err(|e| AppError::Other(e.to_string()))?;

    let pem = key.to_openssh(LineEnding::LF)
        .map_err(|e| AppError::Other(e.to_string()))?
        .to_string();

    Ok(GeneratedContent::new(pem))
}
