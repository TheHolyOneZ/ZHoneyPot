use crate::domain::token::TokenSpec;
use crate::error::Result;
use super::GeneratedContent;

pub fn generate(spec: &TokenSpec) -> Result<GeneratedContent> {

    let content = if let Some(c) = spec.metadata.get("content").and_then(|v| v.as_str()) {
        c.to_string()
    } else {

        let name = spec.metadata.get("name").and_then(|v| v.as_str()).unwrap_or("config");
        format!(
            "# {name}\n\
             # Internal use only — do not distribute\n\
             \n\
             db_host=db.internal\n\
             db_port=5432\n\
             api_key=secret_internal_key_do_not_share\n\
             admin_password=correcthorsebatterystaple\n\
             internal_endpoint=https://internal.company.com/api/v1\n\
             \n\
             # Last updated: 2024-01-15\n"
        )
    };

    Ok(GeneratedContent::new(content))
}
