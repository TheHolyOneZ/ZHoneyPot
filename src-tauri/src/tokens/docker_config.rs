use crate::domain::token::TokenSpec;
use crate::error::Result;
use rand::Rng;
use super::GeneratedContent;

fn rand_b64(len: usize) -> String {
    let chars = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut rng = rand::thread_rng();
    (0..len).map(|_| chars[rng.gen_range(0..chars.len())] as char).collect()
}

pub fn generate(spec: &TokenSpec) -> Result<GeneratedContent> {
    let username = spec.metadata.get("username")
        .and_then(|v| v.as_str()).unwrap_or("devuser");
    let email = spec.metadata.get("email")
        .and_then(|v| v.as_str()).unwrap_or("dev@company.com");
    let registry = spec.metadata.get("registry")
        .and_then(|v| v.as_str()).unwrap_or("registry.company.internal:5000");


    let dh_token = rand_b64(44);
    let dh_auth = base64_encode(&format!("{username}:{dh_token}"));
    let private_token = rand_b64(32);
    let private_auth = base64_encode(&format!("{username}:{private_token}"));

    let content = serde_json::json!({
        "auths": {
            "https://index.docker.io/v1/": {
                "auth": dh_auth,
                "email": email
            },
            registry: {
                "auth": private_auth
            }
        },
        "credsStore": "secretservice",
        "HttpHeaders": {
            "User-Agent": "Docker-Client/24.0.7 (linux)"
        }
    });

    Ok(GeneratedContent::new(serde_json::to_string_pretty(&content)?))
}

fn base64_encode(input: &str) -> String {
    use std::fmt::Write;
    let bytes = input.as_bytes();
    let mut out = String::new();
    let chars = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let n = (b0 << 16) | (b1 << 8) | b2;
        let _ = write!(out, "{}", chars[((n >> 18) & 63) as usize] as char);
        let _ = write!(out, "{}", chars[((n >> 12) & 63) as usize] as char);
        let _ = write!(out, "{}", if chunk.len() > 1 { chars[((n >> 6) & 63) as usize] as char } else { '=' });
        let _ = write!(out, "{}", if chunk.len() > 2 { chars[(n & 63) as usize] as char } else { '=' });
    }
    out
}
