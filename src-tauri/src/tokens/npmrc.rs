use crate::domain::token::TokenSpec;
use crate::error::Result;
use rand::Rng;
use super::GeneratedContent;

fn rand_b64url(len: usize) -> String {
    let chars = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
    let mut rng = rand::thread_rng();
    (0..len).map(|_| chars[rng.gen_range(0..chars.len())] as char).collect()
}

fn rand_hex(len: usize) -> String {
    let mut rng = rand::thread_rng();
    (0..len).map(|_| b"0123456789abcdef"[rng.gen_range(0..16)] as char).collect()
}

pub fn generate(spec: &TokenSpec) -> Result<GeneratedContent> {
    let scope = spec.metadata.get("scope")
        .and_then(|v| v.as_str()).unwrap_or("company");
    let registry = spec.metadata.get("registry")
        .and_then(|v| v.as_str()).unwrap_or("npm.pkg.github.com");


    let npm_token = format!("npm_{}", rand_b64url(36));
    let github_token = format!("ghp_{}", rand_b64url(36));
    let session_id = rand_hex(16);

    let content = format!(
        "# npmrc — generated {}\n\
         //registry.npmjs.org/:_authToken={npm_token}\n\
         //{registry}/:_authToken={github_token}\n\
         @{scope}:registry=https://{registry}/\n\
         registry=https://registry.npmjs.org/\n\
         always-auth=true\n\
         _auth={session_id}\n",
        chrono_like_date(),
    );

    Ok(GeneratedContent::new(content))
}

fn chrono_like_date() -> String {

    "2024-03-15T08:42:00Z".to_string()
}
