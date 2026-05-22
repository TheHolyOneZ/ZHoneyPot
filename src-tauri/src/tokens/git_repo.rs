use crate::domain::token::TokenSpec;
use crate::error::Result;
use rand::Rng;

use super::GeneratedContent;

pub fn generate(spec: &TokenSpec) -> Result<GeneratedContent> {


    let path = &spec.path;
    let secret = format!("sk_live_{}", {
        let mut rng = rand::thread_rng();
        let s: String = (0..24).map(|_| b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"[rng.gen_range(0..64)] as char).collect();
        s
    });

    let manifest = serde_json::json!({
        "type": "git_repo",
        "path": path,
        "leaked_secret": secret,
        "commit_depth": 5,
    });

    Ok(GeneratedContent::new(serde_json::to_string(&manifest)?))
}
