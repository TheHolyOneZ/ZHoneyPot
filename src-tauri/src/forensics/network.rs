use crate::domain::alert::NetworkConnection;

pub fn snapshot() -> Vec<NetworkConnection> {
    #[cfg(feature = "linux-forensics")]
    {
        snapshot_procfs()
    }
    #[cfg(not(feature = "linux-forensics"))]
    {
        vec![]
    }
}

#[cfg(feature = "linux-forensics")]
fn snapshot_procfs() -> Vec<NetworkConnection> {
    let mut conns = Vec::new();

    for (proto, path) in &[
        ("tcp", "/proc/net/tcp"),
        ("tcp6", "/proc/net/tcp6"),
        ("udp", "/proc/net/udp"),
        ("udp6", "/proc/net/udp6"),
    ] {
        if let Ok(content) = std::fs::read_to_string(path) {
            for line in content.lines().skip(1) {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() < 4 { continue; }
                let local = hex_to_addr(parts[1]);
                let remote = hex_to_addr(parts[2]);
                let state = parse_state(parts[3]).to_string();
                conns.push(NetworkConnection {
                    local_addr: local,
                    remote_addr: remote,
                    state,
                    protocol: proto.to_string(),
                });
            }
        }
    }

    conns
}

fn hex_to_addr(hex: &str) -> String {
    let parts: Vec<&str> = hex.splitn(2, ':').collect();
    if parts.len() != 2 { return hex.to_string(); }
    let (addr_hex, port_hex) = (parts[0], parts[1]);
    let port = u16::from_str_radix(port_hex, 16).unwrap_or(0);

    if addr_hex.len() == 8 {


        let n = u32::from_str_radix(addr_hex, 16).unwrap_or(0);
        let [a, b, c, d] = n.to_le_bytes();
        format!("{}.{}.{}.{}:{}", a, b, c, d, port)
    } else if addr_hex.len() == 32 {

        let mut groups = [0u8; 16];
        for (i, chunk) in addr_hex.as_bytes().chunks(8).enumerate() {
            if let Ok(word_hex) = std::str::from_utf8(chunk) {
                if let Ok(n) = u32::from_str_radix(word_hex, 16) {
                    let bytes = n.to_le_bytes();
                    groups[i * 4..(i + 1) * 4].copy_from_slice(&bytes);
                }
            }
        }

        let words: Vec<u16> = groups.chunks(2)
            .map(|c| u16::from_be_bytes([c[0], c[1]]))
            .collect();
        let ipv6 = words.iter().map(|w| format!("{:x}", w)).collect::<Vec<_>>().join(":");
        format!("[{}]:{}", ipv6, port)
    } else {
        format!("{}:{}", addr_hex, port)
    }
}

fn parse_state(hex: &str) -> &'static str {
    match hex {
        "01" => "ESTABLISHED",
        "02" => "SYN_SENT",
        "03" => "SYN_RECV",
        "04" => "FIN_WAIT1",
        "05" => "FIN_WAIT2",
        "06" => "TIME_WAIT",
        "07" => "CLOSE",
        "08" => "CLOSE_WAIT",
        "09" => "LAST_ACK",
        "0A" => "LISTEN",
        "0B" => "CLOSING",
        _    => "UNKNOWN",
    }
}
