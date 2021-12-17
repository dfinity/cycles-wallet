use crate::address::Role;
use ic_cdk::export::candid::CandidType;
use ic_cdk::export::Principal;
use ic_cdk::{api, storage};
use serde::Deserialize;
use std::cmp::min;
use std::collections::HashMap;

#[derive(CandidType, Clone, Default, Deserialize)]
pub struct EventBuffer {
    events: Vec<Event>,
}

#[derive(Debug, Clone, PartialEq, Eq, Default, CandidType, Deserialize)]
pub struct ChildList(HashMap<Principal, Child>);

impl ChildList {
    pub fn push(&mut self, child: Principal, event: ChildEventKind) {
        self.push_with_timestamp(child, event, api::time())
    }
    pub fn push_with_timestamp(&mut self, child: Principal, event: ChildEventKind, timestamp: u64) {
        let events = &mut self
            .0
            .entry(child)
            .or_insert_with(|| Child::new(child))
            .events;
        events.push(ChildEvent {
            kind: event,
            id: events.len() as u32,
            timestamp,
        })
    }
}

#[derive(Debug, Clone, Eq, CandidType, Deserialize)]
pub struct Child {
    pub info: ChildInfo,
    pub events: Vec<ChildEvent>,
}

#[derive(Debug, Clone, Eq, CandidType, Deserialize)]
pub struct ChildInfo {
    pub id: Principal,
    pub name: Option<String>,
    pub created_at: i64,
}

impl Child {
    pub fn new(id: Principal) -> Self {
        Self {
            info: ChildInfo {
                id,
                name: None,
                created_at: api::time() as i64,
            },
            events: vec![],
        }
    }
}

impl PartialEq for ChildInfo {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
    }
}

impl PartialEq for Child {
    fn eq(&self, other: &Self) -> bool {
        self.info == other.info
    }
}

#[derive(Debug, Clone, PartialEq, Eq, CandidType, Deserialize)]
pub struct ChildEvent {
    pub id: u32,
    pub timestamp: u64,
    pub kind: ChildEventKind,
}

#[derive(Debug, Clone, PartialEq, Eq, CandidType, Deserialize)]
pub enum ChildEventKind {
    CyclesSent { amount: u64, refund: u64 },
    Called { method_name: String, cycles: u64 },
    Created { cycles: u64 },
}

impl EventBuffer {
    #[inline]
    pub fn clear(&mut self) {
        self.events.clear();
    }

    #[inline]
    pub fn push(&mut self, event: Event) {
        self.events.push(event);
    }

    #[inline]
    pub fn len(&self) -> u32 {
        self.events.len() as u32
    }

    #[inline]
    pub fn as_slice(&self) -> &[Event] {
        self.events.as_slice()
    }
}

/// The type of an event in the event logs.
#[derive(CandidType, Clone, Deserialize)]
pub enum EventKind {
    CyclesSent {
        to: Principal,
        amount: u64,
        refund: u64,
    },
    CyclesReceived {
        from: Principal,
        amount: u64,
        memo: Option<String>,
    },
    AddressAdded {
        id: Principal,
        name: Option<String>,
        role: Role,
    },
    AddressRemoved {
        id: Principal,
    },
    CanisterCreated {
        canister: Principal,
        cycles: u64,
    },
    CanisterCalled {
        canister: Principal,
        method_name: String,
        cycles: u64,
    },
    WalletDeployed {
        canister: Principal,
    },
}

impl EventKind {
    pub fn to_child(&self) -> Option<(Principal, ChildEventKind)> {
        match *self {
            Self::CanisterCreated { cycles, canister } => {
                Some((canister, ChildEventKind::Created { cycles }))
            }
            Self::CanisterCalled {
                canister,
                ref method_name,
                cycles,
            } => Some((
                canister,
                ChildEventKind::Called {
                    method_name: method_name.clone(),
                    cycles,
                },
            )),
            Self::CyclesSent { to, amount, refund } => {
                Some((to, ChildEventKind::CyclesSent { amount, refund }))
            }
            Self::AddressAdded { .. }
            | Self::AddressRemoved { .. }
            | Self::CyclesReceived { .. }
            | Self::WalletDeployed { .. } => None,
        }
    }
}

#[derive(CandidType, Clone, Deserialize)]
pub struct Event {
    pub id: u32,
    pub timestamp: u64,
    pub kind: EventKind,
}

/// Record an event.
pub fn record(kind: EventKind) {
    let buffer = storage::get_mut::<EventBuffer>();
    if let Some((to, kind)) = kind.to_child() {
        let children = storage::get_mut::<ChildList>();
        children.push(to, kind);
    }
    buffer.push(Event {
        id: buffer.len(),
        timestamp: api::time() as u64,
        kind,
    });
}

pub fn get_events(from: Option<u32>, to: Option<u32>) -> &'static [Event] {
    let buffer = storage::get::<EventBuffer>();

    let from = from.unwrap_or_else(|| {
        if buffer.len() <= 20 {
            0
        } else {
            buffer.len() - 20
        }
    }) as usize;
    let to = min(buffer.len(), to.unwrap_or(u32::MAX)) as usize;

    &buffer.as_slice()[from..to]
}

pub fn get_children() -> Vec<&'static ChildInfo> {
    storage::get::<ChildList>()
        .0
        .values()
        .map(|x| &x.info)
        .collect()
}

pub fn get_child_events(
    child: &Principal,
    from: Option<u32>,
    to: Option<u32>,
) -> Option<Vec<ChildEvent>> {
    let buffer = &storage::get::<ChildList>().0.get(child)?.events;
    let from = from.unwrap_or_else(|| {
        if buffer.len() <= 20 {
            0
        } else {
            buffer.len() as u32 - 20
        }
    }) as usize;
    let to = min(buffer.len() as u32, to.unwrap_or(u32::MAX)) as usize;
    Some(buffer[from..to].to_owned())
}

pub fn set_short_name(child: &Principal, name: Option<String>) -> Option<ChildInfo> {
    let child = storage::get_mut::<ChildList>().0.get_mut(child)?;
    child.info.name = name;
    Some(child.info.clone())
}

pub mod migrations {
    use super::*;
    pub fn _1_create_child_list() {
        let children = storage::get_mut::<ChildList>();
        let events = storage::get_mut::<EventBuffer>();
        for event in events.as_slice() {
            if let Some((to, kind)) = event.kind.to_child() {
                children.push_with_timestamp(to, kind, event.timestamp);
            }
        }
    }
}
