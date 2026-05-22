

use crate::domain::token::TokenStatus;
use crate::storage::{tokens_repo, Db};
use crate::tokens;
use std::path::Path;
use time::OffsetDateTime;

pub async fn tick(db: &Db, heal_delay_secs: u64) {
    process_heal_queue(db).await;
    enqueue_missing(db, heal_delay_secs).await;
}


async fn enqueue_missing(db: &Db, delay_secs: u64) {
    let tokens = tokens_repo::list(db).await.unwrap_or_default();
    let now = OffsetDateTime::now_utc();
    let heal_after = now + time::Duration::seconds(delay_secs as i64);

    for token in tokens {
        if !matches!(token.status, crate::domain::token::TokenStatus::Active) {
            continue;
        }
        if !Path::new(&token.path).exists() {

            let _ = tokens_repo::set_status(db, &token.id, &TokenStatus::Missing).await;


            let _ = sqlx::query(
                "INSERT OR IGNORE INTO heal_queue (token_id, queued_at, heal_after) VALUES (?, ?, ?)"
            )
            .bind(&token.id)
            .bind(now)
            .bind(heal_after)
            .execute(db)
            .await;

            tracing::info!("Token {} missing, queued for healing at {heal_after}", token.id);
        }
    }
}


async fn process_heal_queue(db: &Db) {
    let now = OffsetDateTime::now_utc();

    let rows: Vec<(i64, String)> = sqlx::query_as(
        "SELECT id, token_id FROM heal_queue WHERE heal_after <= ?"
    )
    .bind(now)
    .fetch_all(db)
    .await
    .unwrap_or_default();

    for (row_id, token_id) in rows {
        if let Ok(token) = tokens_repo::get(db, &token_id).await {

            if Path::new(&token.path).exists() {

                let _ = sqlx::query("DELETE FROM heal_queue WHERE id = ?")
                    .bind(row_id)
                    .execute(db)
                    .await;
                let _ = tokens_repo::set_status(db, &token_id, &TokenStatus::Active).await;
                continue;
            }

            let spec = crate::domain::token::TokenSpec {
                kind: token.kind.clone(),
                path: token.path.clone(),
                display_name: token.display_name.clone(),
                metadata: token.metadata.clone(),
                severity: token.severity.clone(),
                callback_url: token.callback_url.clone(),
            };

            match tokens::generate(&spec) {
                Ok(gen) => {
                    match tokens::write_to_disk(Path::new(&token.path), &gen.content, 0o600) {
                        Ok(_) => {
                            tracing::info!("Healed token {} at {}", token_id, token.path);
                            let _ = tokens_repo::set_status(db, &token_id, &TokenStatus::Active).await;
                        }
                        Err(e) => tracing::warn!("Heal write failed for {token_id}: {e}"),
                    }
                }
                Err(e) => tracing::warn!("Heal generate failed for {token_id}: {e}"),
            }


            let _ = sqlx::query("DELETE FROM heal_queue WHERE id = ?")
                .bind(row_id)
                .execute(db)
                .await;
        }
    }
}
