pub mod tokens_repo;
pub mod alerts_repo;
pub mod settings_repo;

use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
use std::path::Path;

pub type Db = SqlitePool;

pub async fn open(db_path: &Path) -> anyhow::Result<Db> {
    let url = format!("sqlite://{}?mode=rwc", db_path.display());

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&url)
        .await?;

    sqlx::query("PRAGMA journal_mode=WAL").execute(&pool).await?;
    sqlx::query("PRAGMA foreign_keys=ON").execute(&pool).await?;
    sqlx::query("PRAGMA busy_timeout=5000").execute(&pool).await?;

    sqlx::migrate!("./src/storage/migrations")
        .run(&pool)
        .await?;

    Ok(pool)
}
