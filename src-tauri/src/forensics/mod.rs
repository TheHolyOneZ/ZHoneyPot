pub mod network;
pub mod process;

use crate::domain::alert::ForensicSnapshot;

pub fn capture(pid_hint: Option<u32>) -> ForensicSnapshot {
    let process = pid_hint.and_then(|pid| process::snapshot(pid));
    let connections = network::snapshot();
    ForensicSnapshot { process, connections }
}


pub fn capture_for_path(path: &str) -> ForensicSnapshot {
    let pid = find_process_by_open_file(path);
    let process = pid.and_then(|p| process::snapshot(p));
    let connections = network::snapshot();
    ForensicSnapshot { process, connections }
}

fn find_process_by_open_file(target: &str) -> Option<u32> {
    let proc_dir = std::fs::read_dir("/proc").ok()?;
    for entry in proc_dir.flatten() {
        let name = entry.file_name();
        let Ok(pid) = name.to_string_lossy().parse::<u32>() else { continue };
        let fd_dir = format!("/proc/{}/fd", pid);
        let Ok(fds) = std::fs::read_dir(&fd_dir) else { continue };
        for fd in fds.flatten() {
            if let Ok(link) = std::fs::read_link(fd.path()) {
                if link.to_string_lossy() == target {
                    return Some(pid);
                }
            }
        }
    }
    None
}
