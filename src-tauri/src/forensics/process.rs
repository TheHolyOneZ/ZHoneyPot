use crate::domain::alert::ProcessInfo;

pub fn snapshot(pid: u32) -> Option<ProcessInfo> {
    #[cfg(feature = "linux-forensics")]
    {
        snapshot_linux(pid)
    }
    #[cfg(not(feature = "linux-forensics"))]
    {
        snapshot_sysinfo(pid)
    }
}

#[cfg(feature = "linux-forensics")]
fn snapshot_linux(pid: u32) -> Option<ProcessInfo> {
    use procfs::process::Process;


    let proc = Process::new(pid as i32).ok()?;
    let stat = proc.stat().ok()?;
    let cmdline = proc.cmdline().ok().map(|c| c.join(" "));
    let exe = proc.exe().ok().map(|e| e.to_string_lossy().into_owned());
    let cwd = proc.cwd().ok().map(|c| c.to_string_lossy().into_owned());
    let uid = proc.status().ok().map(|s| s.ruid);

    let exe_sha256 = exe.as_ref().and_then(|p| {
        std::fs::read(p).ok().map(|bytes| {
            use sha2::{Digest, Sha256};
            let hash = Sha256::digest(&bytes);
            format!("{:x}", hash)
        })
    });

    let username = uid.and_then(|u| {

        std::fs::read_to_string("/etc/passwd").ok().and_then(|passwd| {
            passwd.lines().find_map(|line| {
                let parts: Vec<&str> = line.split(':').collect();
                if parts.len() > 2 && parts[2].parse::<u32>().ok() == Some(u) {
                    Some(parts[0].to_string())
                } else {
                    None
                }
            })
        })
    });

    let parent_chain = build_parent_chain(stat.ppid as u32);

    Some(ProcessInfo {
        pid: Some(pid),
        ppid: Some(stat.ppid as u32),
        cmdline,
        exe,
        exe_sha256,
        cwd,
        uid,
        username,
        parent_chain,
    })
}

#[cfg(feature = "linux-forensics")]
fn build_parent_chain(mut pid: u32) -> Vec<String> {
    use procfs::process::Process;
    let mut chain = Vec::new();
    let mut depth = 0;
    while pid > 1 && depth < 10 {
        let Ok(proc) = Process::new(pid as i32) else { break };
        let name = proc
            .stat()
            .ok()
            .map(|s| format!("{}({})", s.comm, pid))
            .unwrap_or_else(|| pid.to_string());
        chain.push(name);
        let Ok(stat) = proc.stat() else { break };
        pid = stat.ppid as u32;
        depth += 1;
    }
    chain
}

#[cfg(not(feature = "linux-forensics"))]
fn snapshot_sysinfo(pid: u32) -> Option<ProcessInfo> {
    use sysinfo::{Pid, System};
    let mut sys = System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    let proc = sys.process(Pid::from_u32(pid))?;

    Some(ProcessInfo {
        pid: Some(pid),
        ppid: proc.parent().map(|p| p.as_u32()),
        cmdline: Some(proc.cmd().join(" ")),
        exe: proc.exe().map(|e| e.to_string_lossy().into_owned()),
        exe_sha256: None,
        cwd: proc.root().map(|r| r.to_string_lossy().into_owned()),
        uid: None,
        username: proc.user_id().map(|u| u.to_string()),
        parent_chain: vec![],
    })
}
