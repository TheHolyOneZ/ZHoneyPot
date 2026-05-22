

use crate::domain::autonomous::AnomalyFlags;
use crate::storage::Db;
use time::OffsetDateTime;


pub async fn observe(db: &Db, token_id: &str, at: OffsetDateTime) -> AnomalyFlags {
    let hour = at.hour() as usize;
    let weekday = at.weekday().number_days_from_monday() as usize;


    let row: Option<(String, String, i64)> = sqlx::query_as(
        "SELECT hour_histogram, day_histogram, total_accesses FROM access_baseline WHERE token_id = ?"
    )
    .bind(token_id)
    .fetch_optional(db)
    .await
    .ok()
    .flatten();

    let (mut hours, mut days, total) = match row {
        Some((h, d, t)) => {
            let hours: Vec<u64> = serde_json::from_str(&h).unwrap_or_else(|_| vec![0; 24]);
            let days: Vec<u64> = serde_json::from_str(&d).unwrap_or_else(|_| vec![0; 7]);
            (hours, days, t as u64)
        }
        None => (vec![0u64; 24], vec![0u64; 7], 0u64),
    };

    let anomaly = detect(&hours, &days, hour, weekday, total);


    if hours.len() == 24 { hours[hour] += 1; }
    if days.len() == 7 { days[weekday] += 1; }
    let new_total = total + 1;
    let now = OffsetDateTime::now_utc().to_string();

    let _ = sqlx::query(
        "INSERT INTO access_baseline (token_id, hour_histogram, day_histogram, total_accesses, last_updated)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(token_id) DO UPDATE SET
           hour_histogram = excluded.hour_histogram,
           day_histogram  = excluded.day_histogram,
           total_accesses = excluded.total_accesses,
           last_updated   = excluded.last_updated"
    )
    .bind(token_id)
    .bind(serde_json::to_string(&hours).unwrap_or_default())
    .bind(serde_json::to_string(&days).unwrap_or_default())
    .bind(new_total as i64)
    .bind(&now)
    .execute(db)
    .await;

    anomaly
}

fn detect(hours: &[u64], days: &[u64], hour: usize, weekday: usize, total: u64) -> AnomalyFlags {
    if total < 5 {
        return AnomalyFlags { is_anomalous: false, reason: None };
    }

    let hour_total: u64 = hours.iter().sum();
    let day_total: u64 = days.iter().sum();


    if hour_total > 0 {
        let hour_frac = hours.get(hour).copied().unwrap_or(0) as f64 / hour_total as f64;
        if hour_frac < 0.05 {
            let label = hour_label(hour);
            return AnomalyFlags {
                is_anomalous: true,
                reason: Some(format!(
                    "Access at {label} is unusual — only {:.0}% of historical access happens at this hour",
                    hour_frac * 100.0
                )),
            };
        }
    }


    if day_total > 0 {
        let day_frac = days.get(weekday).copied().unwrap_or(0) as f64 / day_total as f64;
        if day_frac < 0.05 {
            let day_name = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
                .get(weekday)
                .copied()
                .unwrap_or("?");
            return AnomalyFlags {
                is_anomalous: true,
                reason: Some(format!(
                    "Access on {day_name} is unusual — only {:.0}% of historical access happens on this day",
                    day_frac * 100.0
                )),
            };
        }
    }

    AnomalyFlags { is_anomalous: false, reason: None }
}

fn hour_label(h: usize) -> String {
    let ampm = if h < 12 { "AM" } else { "PM" };
    let h12 = if h == 0 { 12 } else if h > 12 { h - 12 } else { h };
    format!("{h12}:00 {ampm}")
}

pub async fn get_baseline(db: &Db, token_id: &str) -> Option<crate::domain::autonomous::AccessBaseline> {
    let row: Option<(String, String, i64, String)> = sqlx::query_as(
        "SELECT hour_histogram, day_histogram, total_accesses, last_updated FROM access_baseline WHERE token_id = ?"
    )
    .bind(token_id)
    .fetch_optional(db)
    .await
    .ok()
    .flatten();

    row.map(|(h, d, t, lu)| crate::domain::autonomous::AccessBaseline {
        token_id: token_id.to_string(),
        hour_histogram: serde_json::from_str(&h).unwrap_or_else(|_| vec![0; 24]),
        day_histogram: serde_json::from_str(&d).unwrap_or_else(|_| vec![0; 7]),
        total_accesses: t as u64,
        last_updated: lu,
    })
}
