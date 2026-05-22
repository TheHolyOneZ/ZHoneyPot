use crate::domain::alert::Alert;
use crate::error::Result;
use sqlx::SqlitePool;

const GENESIS: &str = "GENESIS";

fn canonical_json(alert: &Alert) -> Result<String> {
    Ok(serde_json::to_string(alert)?)
}

fn compute_hash(prev_hash: &str, alert: &Alert) -> Result<String> {
    let payload = format!("{}{}", prev_hash, canonical_json(alert)?);
    Ok(blake3::hash(payload.as_bytes()).to_hex().to_string())
}

pub async fn append(pool: &SqlitePool, alert: &Alert) -> Result<()> {
    let prev_hash: Option<(String,)> =
        sqlx::query_as("SELECT entry_hash FROM alert_chain ORDER BY seq DESC LIMIT 1")
            .fetch_optional(pool)
            .await?;

    let prev_hash = prev_hash.map(|(h,)| h).unwrap_or_else(|| GENESIS.to_string());
    let entry_hash = compute_hash(&prev_hash, alert)?;

    sqlx::query(
        "INSERT INTO alert_chain (alert_id, prev_hash, entry_hash) VALUES (?, ?, ?)"
    )
    .bind(&alert.id)
    .bind(&prev_hash)
    .bind(&entry_hash)
    .execute(pool)
    .await?;

    Ok(())
}

pub struct VerifyResult {
    pub ok: bool,
    pub tampered_at_seq: Option<i64>,
}


pub async fn rebuild(pool: &SqlitePool) -> Result<usize> {
    sqlx::query("DELETE FROM alert_chain").execute(pool).await?;

    let alert_ids: Vec<(String,)> =
        sqlx::query_as("SELECT id FROM alerts ORDER BY triggered_at ASC, id ASC")
            .fetch_all(pool)
            .await?;

    let mut count = 0;
    for (id,) in alert_ids {
        if let Ok(alert) = crate::storage::alerts_repo::get(pool, &id).await {
            append(pool, &alert).await?;
            count += 1;
        }
    }
    Ok(count)
}

pub async fn verify(pool: &SqlitePool) -> Result<VerifyResult> {
    let rows: Vec<(i64, String, String, String)> =
        sqlx::query_as(
            "SELECT c.seq, c.prev_hash, c.entry_hash, a.id
             FROM alert_chain c
             JOIN alerts a ON a.id = c.alert_id
             ORDER BY c.seq ASC"
        )
        .fetch_all(pool)
        .await?;

    let mut expected_prev = GENESIS.to_string();

    for (seq, prev_hash, stored_hash, alert_id) in &rows {
        if prev_hash != &expected_prev {
            return Ok(VerifyResult { ok: false, tampered_at_seq: Some(*seq) });
        }


        let alert = crate::storage::alerts_repo::get(pool, alert_id).await?;
        let expected_hash = compute_hash(prev_hash, &alert)?;

        if &expected_hash != stored_hash {
            return Ok(VerifyResult { ok: false, tampered_at_seq: Some(*seq) });
        }

        expected_prev = stored_hash.clone();
    }

    Ok(VerifyResult { ok: true, tampered_at_seq: None })
}
