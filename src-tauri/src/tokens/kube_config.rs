use crate::domain::token::TokenSpec;
use crate::error::Result;
use rand::Rng;
use super::GeneratedContent;

fn rand_b64(len: usize) -> String {
    let chars = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut rng = rand::thread_rng();
    (0..len).map(|_| chars[rng.gen_range(0..chars.len())] as char).collect()
}

fn rand_hex(len: usize) -> String {
    let mut rng = rand::thread_rng();
    (0..len).map(|_| b"0123456789abcdef"[rng.gen_range(0..16)] as char).collect()
}

pub fn generate(spec: &TokenSpec) -> Result<GeneratedContent> {
    let cluster_name = spec.metadata.get("cluster_name")
        .and_then(|v| v.as_str()).unwrap_or("production");
    let server_host = spec.metadata.get("server")
        .and_then(|v| v.as_str()).unwrap_or("kubernetes.company-internal.com");
    let username = spec.metadata.get("username")
        .and_then(|v| v.as_str()).unwrap_or("admin");

    let token = rand_b64(86);
    let cert_data = rand_b64(1824);
    let key_data = rand_b64(1684);
    let ca_data = rand_b64(1616);
    let namespace = "default";

    let content = format!(
        "apiVersion: v1\n\
         clusters:\n\
         - cluster:\n\
             certificate-authority-data: {ca_data}\n\
             server: https://{server_host}:6443\n\
           name: {cluster_name}\n\
         contexts:\n\
         - context:\n\
             cluster: {cluster_name}\n\
             namespace: {namespace}\n\
             user: {username}\n\
           name: {cluster_name}\n\
         current-context: {cluster_name}\n\
         kind: Config\n\
         preferences: {{}}\n\
         users:\n\
         - name: {username}\n\
           user:\n\
             client-certificate-data: {cert_data}\n\
             client-key-data: {key_data}\n\
             token: {token}\n\
         # cluster-id: {}\n",
        rand_hex(32),
    );

    Ok(GeneratedContent::new(content))
}
