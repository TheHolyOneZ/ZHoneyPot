use crate::domain::token::TokenSpec;
use crate::error::Result;
use rand::Rng;

use super::GeneratedContent;

const HEX: &[u8] = b"0123456789abcdef";
const B64: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

fn rand_hex(len: usize) -> String {
    let mut rng = rand::thread_rng();
    (0..len).map(|_| HEX[rng.gen_range(0..HEX.len())] as char).collect()
}

fn rand_b64(len: usize) -> String {
    let mut rng = rand::thread_rng();
    (0..len).map(|_| B64[rng.gen_range(0..B64.len())] as char).collect()
}

pub fn generate(spec: &TokenSpec) -> Result<GeneratedContent> {
    let app_name = spec.metadata
        .get("app_name")
        .and_then(|v| v.as_str())
        .unwrap_or("app");

    let db_name = spec.metadata
        .get("db_name")
        .and_then(|v| v.as_str())
        .unwrap_or(app_name);

    let db_pass = rand_hex(24);
    let jwt_secret = rand_b64(64);
    let stripe_key = format!("sk_live_{}", rand_b64(24));
    let redis_pass = rand_hex(16);
    let session_secret = rand_b64(32);

    let content = format!(
        "# {app_name} environment configuration\n\
         # DO NOT commit this file\n\
         \n\
         NODE_ENV=production\n\
         PORT=3000\n\
         \n\
         # Database\n\
         DATABASE_URL=postgresql://admin:{db_pass}@db.internal:5432/{db_name}_prod\n\
         \n\
         # Redis\n\
         REDIS_URL=redis://:{redis_pass}@redis.internal:6379/0\n\
         \n\
         # Auth\n\
         JWT_SECRET={jwt_secret}\n\
         SESSION_SECRET={session_secret}\n\
         \n\
         # Payments\n\
         STRIPE_SECRET_KEY={stripe_key}\n\
         STRIPE_WEBHOOK_SECRET=whsec_{}\n\
         \n\
         # Storage\n\
         AWS_ACCESS_KEY_ID=AKIA{}\n\
         AWS_SECRET_ACCESS_KEY={}\n\
         AWS_REGION=us-east-1\n\
         S3_BUCKET={app_name}-prod-assets\n",
        rand_b64(24),
        {
            let mut rng = rand::thread_rng();
            let s: String = (0..16).map(|_| b"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[rng.gen_range(0..36)] as char).collect();
            s
        },
        rand_b64(40),
    );

    Ok(GeneratedContent::new(content))
}
