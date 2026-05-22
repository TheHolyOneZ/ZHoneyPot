use crate::domain::alert::EventKind;
use notify::{event::ModifyKind, EventKind as NotifyKind};

pub fn classify(kind: &NotifyKind) -> Option<EventKind> {
    match kind {
        NotifyKind::Access(_) => Some(EventKind::Read),
        NotifyKind::Modify(ModifyKind::Name(_)) => Some(EventKind::Rename),
        NotifyKind::Modify(_) => Some(EventKind::Write),
        NotifyKind::Remove(_) => Some(EventKind::Delete),
        NotifyKind::Create(_) => None,
        _ => None,
    }
}
