use crate::domain::token::TokenSpec;
use crate::error::Result;
use rand::Rng;

use super::GeneratedContent;

fn rand_pw(len: usize) -> String {
    const CHARS: &[u8] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let mut rng = rand::thread_rng();
    (0..len).map(|_| CHARS[rng.gen_range(0..CHARS.len())] as char).collect()
}

pub fn generate(_spec: &TokenSpec) -> Result<GeneratedContent> {
    let content = format!(
        "# Personal passwords — keep private!\n\
         \n\
         Gmail: {}\n\
         GitHub: {}\n\
         AWS root: {}\n\
         VPN: {}\n\
         SSH passphrase: {}\n\
         Bitwarden master: {}\n",
        rand_pw(14),
        rand_pw(16),
        rand_pw(20),
        rand_pw(12),
        rand_pw(18),
        rand_pw(22),
    );
    Ok(GeneratedContent::new(content))
}
