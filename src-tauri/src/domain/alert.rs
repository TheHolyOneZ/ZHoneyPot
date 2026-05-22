use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use ts_rs::TS;

use super::token::Severity;

mod rfc3339 {
    use serde::{Deserialize, Deserializer, Serialize, Serializer};
    use time::OffsetDateTime;
    use time::format_description::well_known::Rfc3339;

    pub fn serialize<S: Serializer>(dt: &OffsetDateTime, s: S) -> Result<S::Ok, S::Error> {
        dt.format(&Rfc3339).map_err(serde::ser::Error::custom)?.serialize(s)
    }

    pub fn deserialize<'de, D: Deserializer<'de>>(d: D) -> Result<OffsetDateTime, D::Error> {
        let s = <String as Deserialize>::deserialize(d)?;
        OffsetDateTime::parse(&s, &Rfc3339).map_err(serde::de::Error::custom)
    }

    pub mod option {
        use serde::{Deserialize, Deserializer, Serializer};
        use time::OffsetDateTime;
        use time::format_description::well_known::Rfc3339;

        pub fn serialize<S: Serializer>(dt: &Option<OffsetDateTime>, s: S) -> Result<S::Ok, S::Error> {
            match dt {
                Some(dt) => s.serialize_some(&dt.format(&Rfc3339).map_err(serde::ser::Error::custom)?),
                None => s.serialize_none(),
            }
        }

        pub fn deserialize<'de, D: Deserializer<'de>>(d: D) -> Result<Option<OffsetDateTime>, D::Error> {
            let s = <Option<String> as Deserialize>::deserialize(d)?;
            s.map(|s| OffsetDateTime::parse(&s, &Rfc3339).map_err(serde::de::Error::custom)).transpose()
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "snake_case")]
pub enum EventKind {
    Read,
    Write,
    Rename,
    Delete,
    Attr,
    Test,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ProcessInfo {
    pub pid: Option<u32>,
    pub ppid: Option<u32>,
    pub cmdline: Option<String>,
    pub exe: Option<String>,
    pub exe_sha256: Option<String>,
    pub cwd: Option<String>,
    pub uid: Option<u32>,
    pub username: Option<String>,
    pub parent_chain: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct NetworkConnection {
    pub local_addr: String,
    pub remote_addr: String,
    pub state: String,
    pub protocol: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ForensicSnapshot {
    pub process: Option<ProcessInfo>,
    pub connections: Vec<NetworkConnection>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Alert {
    pub id: String,
    pub token_id: String,
    #[ts(type = "string")]
    #[serde(with = "rfc3339")]
    pub triggered_at: OffsetDateTime,
    pub event_kind: EventKind,
    pub severity: Severity,
    pub is_test: bool,
    pub process_info: Option<ProcessInfo>,
    pub network_info: Vec<NetworkConnection>,
    #[ts(type = "unknown | null")]
    pub raw_event: Option<serde_json::Value>,
    pub acknowledged: bool,
    #[ts(type = "string | null")]
    #[serde(with = "rfc3339::option")]
    pub ack_at: Option<OffsetDateTime>,
    pub note: Option<String>,
}
