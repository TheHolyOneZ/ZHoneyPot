use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use ts_rs::TS;
use uuid::Uuid;

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
pub enum TokenKind {
    AwsCredentials,
    SshKeypair,
    Dotenv,
    GitRepo,
    PasswordsTxt,
    KubeConfig,
    DockerConfig,
    Npmrc,
    Pypirc,
    GenericFile,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "snake_case")]
pub enum TokenStatus {
    Active,
    Disabled,
    Missing,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "snake_case")]
pub enum Severity {
    Info,
    Warn,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Token {
    pub id: String,
    pub kind: TokenKind,
    pub path: String,
    pub display_name: Option<String>,
    #[ts(type = "Record<string, unknown>")]
    pub metadata: serde_json::Value,
    pub content_hash: String,
    pub status: TokenStatus,
    pub severity: Severity,
    pub callback_url: Option<String>,
    #[ts(type = "string")]
    #[serde(with = "rfc3339")]
    pub created_at: OffsetDateTime,
    #[ts(type = "string")]
    #[serde(with = "rfc3339")]
    pub updated_at: OffsetDateTime,
    #[ts(type = "string | null")]
    #[serde(with = "rfc3339::option")]
    pub last_seen_at: Option<OffsetDateTime>,
    #[ts(type = "string | null")]
    #[serde(with = "rfc3339::option")]
    pub last_triggered_at: Option<OffsetDateTime>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct TokenSpec {
    pub kind: TokenKind,
    pub path: String,
    pub display_name: Option<String>,
    #[ts(type = "Record<string, unknown>")]
    pub metadata: serde_json::Value,
    pub severity: Severity,
    pub callback_url: Option<String>,
}

impl Token {
    pub fn new(id: Uuid, spec: &TokenSpec, content_hash: String) -> Self {
        let now = OffsetDateTime::now_utc();
        Self {
            id: id.to_string(),
            kind: spec.kind.clone(),
            path: spec.path.clone(),
            display_name: spec.display_name.clone(),
            metadata: spec.metadata.clone(),
            content_hash,
            status: TokenStatus::Active,
            severity: spec.severity.clone(),
            callback_url: spec.callback_url.clone(),
            created_at: now,
            updated_at: now,
            last_seen_at: None,
            last_triggered_at: None,
        }
    }
}
