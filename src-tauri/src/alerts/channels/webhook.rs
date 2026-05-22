use crate::domain::alert::Alert;
use serde_json::json;

pub async fn send(alert: &Alert, url: &str, client: &reqwest::Client) {
    let payload = if url.contains("discord.com/api/webhooks") {
        discord_payload(alert)
    } else if url.contains("hooks.slack.com") {
        slack_payload(alert)
    } else {
        serde_json::to_value(alert).unwrap_or_default()
    };

    match client
        .post(url)
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
    {
        Ok(r) if r.status().is_success() => {
            tracing::info!("Webhook delivered to {url}: {}", r.status());
        }
        Ok(r) => {
            let status = r.status();
            let body = r.text().await.unwrap_or_default();
            tracing::warn!("Webhook {url} returned {status}: {body}");
        }
        Err(e) => {
            tracing::warn!("Webhook {url} failed: {e}");
        }
    }
}

fn discord_payload(alert: &Alert) -> serde_json::Value {
    let severity_color: u32 = match alert.severity {
        crate::domain::token::Severity::Critical => 0xFF0000,
        crate::domain::token::Severity::Warn     => 0xFFA500,
        crate::domain::token::Severity::Info     => 0x3498DB,
    };
    let kind = format!("{:?}", alert.event_kind).to_lowercase();
    let test_tag = if alert.is_test { " `[TEST]`" } else { "" };
    let cmdline = alert.process_info.as_ref()
        .and_then(|p| p.cmdline.as_deref())
        .unwrap_or("unknown");
    let pid = alert.process_info.as_ref()
        .and_then(|p| p.pid)
        .map(|p| p.to_string())
        .unwrap_or_else(|| "?".into());

    json!({
        "embeds": [{
            "title": format!("ZHoneyPot Alert{test_tag}"),
            "description": format!("`{}` event on token `{}`", kind, alert.token_id),
            "color": severity_color,
            "fields": [
                { "name": "Severity", "value": format!("{:?}", alert.severity), "inline": true },
                { "name": "Event", "value": kind, "inline": true },
                { "name": "PID", "value": pid, "inline": true },
                { "name": "Process", "value": format!("`{cmdline}`"), "inline": false },
            ],
            "footer": { "text": format!("Alert ID: {}", alert.id) },
            "timestamp": alert.triggered_at.format(&time::format_description::well_known::Rfc3339).unwrap_or_default(),
        }]
    })
}

fn slack_payload(alert: &Alert) -> serde_json::Value {
    let kind = format!("{:?}", alert.event_kind).to_lowercase();
    let sev = format!("{:?}", alert.severity);
    let test_tag = if alert.is_test { "[TEST] " } else { "" };
    json!({
        "text": format!("{test_tag}ZHoneyPot Alert — {sev} {kind} event on token `{}`", alert.token_id)
    })
}
