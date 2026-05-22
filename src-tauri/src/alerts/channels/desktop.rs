use crate::domain::alert::Alert;

pub fn send(alert: &Alert) {
    let summary = if alert.is_test {
        "ZHoneyPot — Test Alert".to_string()
    } else {
        "ZHoneyPot — Honeypot Triggered!".to_string()
    };

    let body = format!(
        "Token {} was accessed ({:?})",
        alert.token_id, alert.event_kind
    );

    if let Err(e) = notify_rust::Notification::new()
        .summary(&summary)
        .body(&body)
        .urgency(notify_rust::Urgency::Critical)
        .show()
    {
        tracing::warn!("Desktop notification failed: {e}");
    }
}
