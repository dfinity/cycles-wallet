use std::fmt::{self, Formatter};

use crate::events::*;
use crate::*;
use candid::types::{Compound, Serializer, Type, TypeInner};
use candid::{CandidType, Deserialize, Principal};
use indexmap::IndexMap;
use serde::de::{SeqAccess, Visitor};
use serde::Deserializer;

#[derive(CandidType, Clone, Deserialize)]
pub enum V1EventKind {
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

#[derive(CandidType, Deserialize)]
pub struct V1EventBuffer {
    pub events: Vec<V1Event>,
}

#[derive(CandidType, Clone, Deserialize)]
pub struct V1Event {
    pub id: u32,
    pub timestamp: u64,
    pub kind: V1EventKind,
}

#[derive(CandidType, Deserialize)]
pub struct V1StableStorage {
    pub address_book: Vec<AddressEntry>,
    pub events: V1EventBuffer,
    pub name: Option<String>,
    pub chart: Vec<ChartTick>,
    pub wasm_module: Option<serde_bytes::ByteBuf>,
    pub managed: Option<V1ManagedList>,
}

#[derive(CandidType, Deserialize)]
pub enum V1ManagedCanisterEventKind {
    CyclesSent { amount: u64, refund: u64 },
    Called { method_name: String, cycles: u64 },
    Created { cycles: u64 },
}

#[derive(CandidType, Deserialize)]
pub struct V1ManagedCanisterEvent {
    pub id: u32,
    pub timestamp: u64,
    pub kind: V1ManagedCanisterEventKind,
}

#[derive(CandidType, Deserialize)]
pub struct V1ManagedCanister {
    pub info: ManagedCanisterInfo,
    pub events: Vec<V1ManagedCanisterEvent>,
}

#[derive(Default)]
pub struct V1ManagedList(pub IndexMap<Principal, V1ManagedCanister>);

impl CandidType for V1ManagedList {
    fn _ty() -> Type {
        Type(<_>::from(TypeInner::Vec(ManagedCanister::ty())))
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

impl V1ManagedList {
    pub fn push_with_timestamp(
        &mut self,
        canister: Principal,
        event: V1ManagedCanisterEventKind,
        timestamp: u64,
    ) {
        let events = &mut self
            .0
            .entry(canister)
            .or_insert_with(|| V1ManagedCanister::new(canister))
            .events;
        events.push(V1ManagedCanisterEvent {
            kind: event,
            id: events.len() as u32,
            timestamp,
        })
    }
}

impl V1EventKind {
    pub fn to_managed(&self) -> Option<(Principal, V1ManagedCanisterEventKind)> {
        match *self {
            Self::CanisterCreated { cycles, canister } => {
                Some((canister, V1ManagedCanisterEventKind::Created { cycles }))
            }
            Self::CanisterCalled {
                canister,
                ref method_name,
                cycles,
            } => Some((
                canister,
                V1ManagedCanisterEventKind::Called {
                    method_name: method_name.clone(),
                    cycles,
                },
            )),
            Self::CyclesSent { to, amount, refund } => Some((
                to,
                V1ManagedCanisterEventKind::CyclesSent { amount, refund },
            )),
            Self::AddressAdded { .. }
            | Self::AddressRemoved { .. }
            | Self::CyclesReceived { .. }
            | Self::WalletDeployed { .. } => None,
        }
    }
}

impl<'de> Deserialize<'de> for V1ManagedList {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        deserializer.deserialize_seq(IdxMapVisitor)
    }
}

struct IdxMapVisitor;

impl<'de> Visitor<'de> for IdxMapVisitor {
    type Value = V1ManagedList;
    fn expecting(&self, formatter: &mut Formatter) -> fmt::Result {
        write!(formatter, "a sequence of `ManagedList` records")
    }
    fn visit_seq<A>(self, mut seq: A) -> Result<Self::Value, A::Error>
    where
        A: SeqAccess<'de>,
    {
        let mut map = IndexMap::with_capacity(seq.size_hint().unwrap_or(20));
        while let Some(elem) = seq.next_element::<V1ManagedCanister>()? {
            map.insert(elem.info.id, elem);
        }
        Ok(V1ManagedList(map))
    }
}

impl V1ManagedCanister {
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
