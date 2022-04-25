use crate::address::Role;
use ic_cdk::api;
use ic_cdk::export::candid::types::{Compound, Serializer, Type};
use ic_cdk::export::candid::CandidType;
use ic_cdk::export::Principal;
use indexmap::IndexMap;
use serde::de::{SeqAccess, Visitor};
use serde::{Deserialize, Deserializer};
use std::cell::RefCell;
use std::cmp::min;
use std::collections::VecDeque;
use std::fmt::{self, Formatter};
use std::ops::Range;

#[derive(CandidType, Clone, Default, Deserialize)]
pub struct EventBuffer {
    pub events: VecDeque<Event>,
    pub culled: Option<usize>,
}

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct ManagedList(pub IndexMap<Principal, ManagedCanister>);

thread_local! {
    pub static EVENT_BUFFER: RefCell<EventBuffer> = Default::default();
    pub static MANAGED_LIST: RefCell<ManagedList> = Default::default();
}

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
        let canister = &mut self
            .0
            .entry(canister)
            .or_insert_with(|| ManagedCanister::new(canister));
        let events = &mut canister.events;
        events.push_back(ManagedCanisterEvent {
            kind: event,
            id: events.len() as u32,
            timestamp,
        });
        if events.len() > 1000 {
            events.drain(..events.len() - 1000);
            canister.culled = Some(events[0].id as usize);
        }
    }
}

#[derive(Debug, Clone, Eq, CandidType, Deserialize)]
pub struct ManagedCanister {
    pub info: ManagedCanisterInfo,
    pub events: VecDeque<ManagedCanisterEvent>,
    pub culled: Option<usize>,
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
            events: VecDeque::new(),
            culled: Some(0),
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
    CyclesSent { amount: u128, refund: u128 },
    Called { method_name: String, cycles: u128 },
    Created { cycles: u128 },
}

impl EventBuffer {
    #[inline]
    pub fn push(&mut self, event: Event) {
        self.events.push_back(event);
    }

    #[inline]
    pub fn len(&self) -> u32 {
        self.events.len() as u32
    }

    #[inline]
    pub fn between(&self, Range { start, end }: Range<usize>) -> Vec<Event> {
        let base = self.culled.unwrap_or(0);
        self.events.range(start.saturating_sub(base)..end.saturating_sub(base)).cloned().collect()
    }
}

/// The type of an event in the event logs.
#[derive(CandidType, Clone, Deserialize)]
pub enum EventKind {
    CyclesSent {
        to: Principal,
        amount: u128,
        refund: u128,
    },
    CyclesReceived {
        from: Principal,
        amount: u128,
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
        cycles: u128,
    },
    CanisterCalled {
        canister: Principal,
        method_name: String,
        cycles: u128,
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
    if let Some((to, kind)) = kind.to_managed() {
        MANAGED_LIST.with(|managed| managed.borrow_mut().push(to, kind));
    }
    EVENT_BUFFER.with(|buffer| {
        let mut buffer = buffer.borrow_mut();
        let buffer = &mut *buffer;
        let len = buffer.len();
        buffer.push(Event {
            id: len,
            timestamp: api::time() as u64,
            kind,
        });
        if buffer.len() > 5000 {
            buffer.events.drain(..buffer.events.len() - 5000);
            buffer.culled = Some(buffer.events[0].id as usize);
        }
    });
}

pub fn get_events(from: Option<u32>, to: Option<u32>) -> Vec<Event> {
    EVENT_BUFFER.with(|buffer| {
        let buffer = buffer.borrow();

        let from = from.unwrap_or_else(|| {
            if buffer.len() <= 20 {
                0
            } else {
                buffer.len() - 20
            }
        }) as usize;
        let to = min(buffer.len(), to.unwrap_or(u32::MAX)) as usize;

        buffer.between(from..to)
    })
}

/// Return info about canisters managed by this wallet, as well as the total number of managed canisters.
pub fn get_managed_canisters(
    from: Option<u32>,
    to: Option<u32>,
) -> (Vec<ManagedCanisterInfo>, u32) {
    MANAGED_LIST.with(|list| {
        let list = list.borrow();
        let from = from.unwrap_or(0) as usize;
        let to = min(list.0.len(), to.unwrap_or(u32::MAX) as usize);
        (
            (from..to).map(|n| list.0[n].info.clone()).collect(),
            list.0.len() as u32,
        )
    })
}

/// Get a list of all events related to a specific managed canister. Returns `None` if the canister is unknown.
///
/// `from`, if unspecified, defaults to `len - 20`; `to`, if unspecified, defaults to `len`.
pub fn get_managed_canister_events(
    canister: &Principal,
    from: Option<u32>,
    to: Option<u32>,
) -> Option<Vec<ManagedCanisterEvent>> {
    MANAGED_LIST.with(|buffer| {
        let buffer = buffer.borrow();
        let canister = &buffer.0.get(canister)?;
        let buffer = &canister.events;
        let from = from.unwrap_or_else(|| {
            if buffer.len() <= 20 {
                0
            } else {
                buffer.len() as u32 - 20
            }
        }) as usize;
        let to = min(buffer.len() as u32, to.unwrap_or(u32::MAX)) as usize;
        let base = canister.culled.unwrap_or(0);
        Some(buffer.range(from.saturating_sub(base)..to.saturating_sub(base)).cloned().collect())
    })
}

/// Changes the recorded short name of a canister. Returns the updated info, or `None` if this canister isn't known.
pub fn set_short_name(canister: &Principal, name: Option<String>) -> Option<ManagedCanisterInfo> {
    MANAGED_LIST.with(|list| {
        let mut list = list.borrow_mut();
        let canister = list.0.get_mut(canister)?;
        canister.info.name = name;
        Some(canister.info.clone())
    })
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
