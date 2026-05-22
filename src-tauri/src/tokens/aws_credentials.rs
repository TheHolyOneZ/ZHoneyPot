use crate::domain::token::TokenSpec;
use crate::error::Result;
use rand::Rng;

use super::GeneratedContent;

const UPPERS_DIGITS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const BASE64_CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";


fn gen_access_key_id() -> String {
    let mut rng = rand::thread_rng();
    let suffix: String = (0..16)
        .map(|_| UPPERS_DIGITS[rng.gen_range(0..UPPERS_DIGITS.len())] as char)
        .collect();
    format!("AKIA{}", suffix)
}


fn gen_secret_key() -> String {
    let mut rng = rand::thread_rng();
    (0..40)
        .map(|_| BASE64_CHARS[rng.gen_range(0..BASE64_CHARS.len())] as char)
        .collect()
}

pub fn generate(spec: &TokenSpec) -> Result<GeneratedContent> {
    let region = spec.metadata
        .get("region")
        .and_then(|v| v.as_str())
        .unwrap_or("us-east-1");

    let profile = spec.metadata
        .get("profile")
        .and_then(|v| v.as_str())
        .unwrap_or("default");

    let _username = spec.metadata
        .get("username")
        .and_then(|v| v.as_str())
        .unwrap_or("john.doe");

    let key_id = gen_access_key_id();
    let secret = gen_secret_key();

    let content = format!(
        "[{profile}]\n\
         aws_access_key_id = {key_id}\n\
         aws_secret_access_key = {secret}\n\
         region = {region}\n\
         # Last rotated: 2024-{:02}-{:02}\n",
        rand::thread_rng().gen_range(1u8..=12),
        rand::thread_rng().gen_range(1u8..=28),
    );

    Ok(GeneratedContent::new(content))
}
