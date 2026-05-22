use crate::domain::token::TokenSpec;
use crate::error::Result;
use rand::Rng;
use super::GeneratedContent;

fn rand_b64(len: usize) -> String {
    let chars = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
    let mut rng = rand::thread_rng();
    (0..len).map(|_| chars[rng.gen_range(0..chars.len())] as char).collect()
}

pub fn generate(spec: &TokenSpec) -> Result<GeneratedContent> {
    let private_repo = spec.metadata.get("private_repo")
        .and_then(|v| v.as_str()).unwrap_or("https://pypi.company.internal/simple/");
    let username = spec.metadata.get("username")
        .and_then(|v| v.as_str()).unwrap_or("admin");
    let private_pass = spec.metadata.get("private_password")
        .and_then(|v| v.as_str());


    let pypi_token = format!("pypi-{}", rand_b64(120));
    let private_password = private_pass.map(|s| s.to_string())
        .unwrap_or_else(|| rand_b64(24));

    let content = format!(
        "[distutils]\n\
         index-servers =\n\
           pypi\n\
           private\n\
         \n\
         [pypi]\n\
         username = __token__\n\
         password = {pypi_token}\n\
         \n\
         [private]\n\
         repository = {private_repo}\n\
         username = {username}\n\
         password = {private_password}\n",
    );

    Ok(GeneratedContent::new(content))
}
