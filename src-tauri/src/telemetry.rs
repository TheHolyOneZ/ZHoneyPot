use std::path::Path;
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

pub fn init(log_dir: &Path) {
    std::fs::create_dir_all(log_dir).ok();

    let file_appender = tracing_appender::rolling::daily(log_dir, "zhoneypot.log");
    let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);


    Box::leak(Box::new(_guard));

    let file_layer = fmt::layer()
        .json()
        .with_writer(non_blocking)
        .with_ansi(false);

    let stderr_layer = fmt::layer().with_writer(std::io::stderr);

    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .with(file_layer)
        .with(stderr_layer)
        .init();
}
