use crate::address::Role;
use ic_cdk::export::candid::CandidType;
use ic_cdk::export::Principal;
use ic_cdk::{api, storage};
use serde::Deserialize;
use std::cmp::min;

#[derive(CandidType, Clone, Default, Deserialize)]
pub struct EventBuffer {
    events: Vec<Event>,
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
        amount: Option<u64>,
        refund: Option<u64>,
    },
    CyclesReceived {
        from: Principal,
        amount: u64,
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

#[derive(CandidType, Clone, Deserialize)]
pub struct Event {
    pub id: u32,
    pub timestamp: u64,
    pub kind: EventKind,
}

/// Record an event.
pub fn record(kind: EventKind) {
    let buffer = storage::get_mut::<EventBuffer>();
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
    let to = min(buffer.len() - 1, to.unwrap_or(u32::MAX)) as usize;

    &buffer.as_slice()[from..to]
}
