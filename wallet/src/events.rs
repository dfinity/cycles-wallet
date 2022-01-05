use crate::address::Role;
use ic_cdk::export::candid::types::{Compound, Serializer, Type};
use ic_cdk::export::candid::CandidType;
use ic_cdk::export::Principal;
use ic_cdk::{api, storage};
use indexmap::IndexMap;
use serde::de::{SeqAccess, Visitor};
use serde::{Deserialize, Deserializer};
use std::cmp::min;
use std::fmt::{self, Formatter};

#[derive(CandidType, Clone, Default, Deserialize)]
pub struct EventBuffer {
    events: Vec<Event>,
}

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct ManagedList(IndexMap<Principal, ManagedCanister>);

impl ManagedList {
    pub fn push(&mut self, canister: Principal, event: ManagedCanisterEventKind) {
        self.push_with_timestamp(canister, event, api::time())
    }
    pub fn push_with_timestamp(
        &mut self,
        canister: Principal,
        event: ManagedCanisterEventKind,
        timestamp: u64,
    ) {
        let events = &mut self
            .0
            .entry(canister)
            .or_insert_with(|| ManagedCanister::new(canister))
            .events;
        events.push(ManagedCanisterEvent {
            kind: event,
            id: events.len() as u32,
            timestamp,
        })
    }
}

#[derive(Debug, Clone, Eq, CandidType, Deserialize)]
pub struct ManagedCanister {
    pub info: ManagedCanisterInfo,
    pub events: Vec<ManagedCanisterEvent>,
}

#[derive(Debug, Clone, Eq, CandidType, Deserialize)]
pub struct ManagedCanisterInfo {
    pub id: Principal,
    pub name: Option<String>,
    pub created_at: u64,
}

impl ManagedCanister {
    pub fn new(id: Principal) -> Self {
        Self {
            info: ManagedCanisterInfo {
                id,
                name: None,
                created_at: api::time(),
            },
            events: vec![],
        }
    }
}

impl PartialEq for ManagedCanisterInfo {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
    }
}

impl PartialEq for ManagedCanister {
    fn eq(&self, other: &Self) -> bool {
        self.info == other.info
    }
}

#[derive(Debug, Clone, PartialEq, Eq, CandidType, Deserialize)]
pub struct ManagedCanisterEvent {
    pub id: u32,
    pub timestamp: u64,
    pub kind: ManagedCanisterEventKind,
}

#[derive(Debug, Clone, PartialEq, Eq, CandidType, Deserialize)]
pub enum ManagedCanisterEventKind {
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
    pub fn to_managed(&self) -> Option<(Principal, ManagedCanisterEventKind)> {
        match *self {
            Self::CanisterCreated { cycles, canister } => {
                Some((canister, ManagedCanisterEventKind::Created { cycles }))
            }
            Self::CanisterCalled {
                canister,
                ref method_name,
                cycles,
            } => Some((
                canister,
                ManagedCanisterEventKind::Called {
                    method_name: method_name.clone(),
                    cycles,
                },
            )),
            Self::CyclesSent { to, amount, refund } => {
                Some((to, ManagedCanisterEventKind::CyclesSent { amount, refund }))
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
    if let Some((to, kind)) = kind.to_managed() {
        let managed = storage::get_mut::<ManagedList>();
        managed.push(to, kind);
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

/// Return info about canisters managed by this wallet, as well as the total number of managed canisters.
pub fn get_managed_canisters(
    from: Option<u32>,
    to: Option<u32>,
) -> (Vec<&'static ManagedCanisterInfo>, u32) {
    let list = storage::get::<ManagedList>();
    let from = from.unwrap_or(0) as usize;
    let to = min(list.0.len(), to.unwrap_or(u32::MAX) as usize);
    (
        (from..to).map(|n| &list.0[n].info).collect(),
        list.0.len() as u32,
    )
}

/// Get a list of all events related to a specific managed canister. Returns `None` if the canister is unknown.
/// 
/// `from`, if unspecified, defaults to `len - 20`; `to`, if unspecified, defaults to `len`.
pub fn get_managed_canister_events(
    canister: &Principal,
    from: Option<u32>,
    to: Option<u32>,
) -> Option<Vec<ManagedCanisterEvent>> {
    let buffer = &storage::get::<ManagedList>().0.get(canister)?.events;
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

/// Changes the recorded short name of a canister. Returns the updated info, or `None` if this canister isn't known.
pub fn set_short_name(canister: &Principal, name: Option<String>) -> Option<ManagedCanisterInfo> {
    let canister = storage::get_mut::<ManagedList>().0.get_mut(canister)?;
    canister.info.name = name;
    Some(canister.info.clone())
}

/// Migration functions to run on `#[post_upgrade]`.
pub mod migrations {
    use super::*;
    /// Creates the managed canister list from the event list. 
    /// 
    /// Call during `#[post_upgrade]`, after the event list is deserialized, if the canister list can't be deserialized.
    pub fn _1_create_managed_canister_list() {
        let managed = storage::get_mut::<ManagedList>();
        let events = storage::get_mut::<EventBuffer>();
        for event in events.as_slice() {
            if let Some((to, kind)) = event.kind.to_managed() {
                managed.push_with_timestamp(to, kind, event.timestamp);
            }
        }
    }
}

impl CandidType for ManagedList {
    fn _ty() -> Type {
        Type::Vec(Box::new(ManagedCanister::ty()))
    }
    fn idl_serialize<S>(&self, serializer: S) -> Result<(), S::Error>
    where
        S: Serializer,
    {
        let mut compound = serializer.serialize_vec(self.0.len())?;
        for value in self.0.values() {
            compound.serialize_element(value)?;
        }
        Ok(())
    }
}

impl<'de> Deserialize<'de> for ManagedList {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        deserializer.deserialize_seq(IdxMapVisitor)
    }
}

struct IdxMapVisitor;

impl<'de> Visitor<'de> for IdxMapVisitor {
    type Value = ManagedList;
    fn expecting(&self, formatter: &mut Formatter) -> fmt::Result {
        write!(formatter, "a sequence of `ManagedList` records")
    }
    fn visit_seq<A>(self, mut seq: A) -> Result<Self::Value, A::Error>
    where
        A: SeqAccess<'de>,
    {
        let mut map = IndexMap::with_capacity(seq.size_hint().unwrap_or(20));
        while let Some(elem) = seq.next_element::<ManagedCanister>()? {
            map.insert(elem.info.id, elem);
        }
        Ok(ManagedList(map))
    }
}
