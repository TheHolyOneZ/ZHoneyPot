use directories::ProjectDirs;
use std::path::PathBuf;

pub struct AppPaths {
    pub db: PathBuf,
    pub logs: PathBuf,
    pub config: PathBuf,
    pub alert_jsonl: PathBuf,
    pub selftest: PathBuf,
    pub plugins: PathBuf,
}

impl AppPaths {
    pub fn resolve() -> Self {
        let dirs = ProjectDirs::from("com", "theholyonez", "zhoneypot")
            .expect("Could not determine home directory");

        let data = dirs.data_dir().to_path_buf();
        let state = dirs.state_dir().unwrap_or_else(|| dirs.data_dir()).to_path_buf();
        let config = dirs.config_dir().to_path_buf();

        Self {
            db: data.join("zhoneypot.db"),
            logs: state.join("logs"),
            alert_jsonl: data.join("alerts.jsonl"),
            selftest: data.join("selftest"),
            plugins: config.join("plugins"),
            config: config.join("config.toml"),
        }
    }

    pub fn ensure_dirs(&self) -> std::io::Result<()> {
        for dir in [
            self.db.parent().unwrap(),
            &self.logs,
            self.config.parent().unwrap(),
            &self.selftest,
            &self.plugins,
        ] {
            std::fs::create_dir_all(dir)?;
        }
        Ok(())
    }
}
