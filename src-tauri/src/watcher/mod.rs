pub mod classifier;
pub mod engine;


pub struct WatcherRegistrar(pub std::sync::mpsc::Sender<std::path::PathBuf>);


#[derive(Clone, Default)]
pub struct WatchMuter(
    pub std::sync::Arc<std::sync::Mutex<std::collections::HashMap<String, std::time::Instant>>>,
);

impl WatchMuter {
    pub fn mute(&self, path: &str) {
        if let Ok(mut map) = self.0.lock() {
            map.insert(path.to_string(), std::time::Instant::now());
        }
    }

    pub fn is_muted(&self, path: &str) -> bool {
        if let Ok(mut map) = self.0.lock() {
            if let Some(ts) = map.get(path) {
                if ts.elapsed() < std::time::Duration::from_secs(5) {
                    return true;
                }
                map.remove(path);
            }
        }
        false
    }
}
