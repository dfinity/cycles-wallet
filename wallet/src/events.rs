use candid::CandidType;
use ic_cdk::{api, storage};
use ic_types::Principal;
use serde::Deserialize;

#[derive(CandidType, Clone, Default, Deserialize)]
pub struct EventBuffer {
    next_index: usize,
    events: Vec<Event>,
}

impl EventBuffer {
    #[inline]
    pub fn resize(&mut self, new_capacity: usize) {
        // If previous vector is empty, just replace it with a new one.
        if self.events.is_empty() {
            self.next_index = 0;
            self.events = Vec::with_capacity(new_capacity);
        } else {
            // Swap vectors and copy old events.
            let old_events = self.events.as_slice();
            let index = self.next_index;
            let mut new_events: Vec<Event> = Vec::with_capacity(new_capacity);
            for event in &old_events[index..old_events.len()] {
                if new_events.len() > new_capacity {
                    break;
                }
                new_events.push(event.clone());
            }
            for event in &old_events[..index] {
                if new_events.len() > new_capacity {
                    break;
                }
                new_events.push(event.clone());
            }
            self.next_index = new_events.len();
            self.events = new_events;
        }
    }

    #[inline]
    pub fn add(&mut self, event: Event) {
        if self.events.capacity() == 0 {
            return;
        }

        let i = self.next_index;
        let next = (i + 1) % self.events.capacity();
        self.next_index = next;

        if i >= self.events.len() {
            self.events.push(event);
        } else {
            self.events[i] = event;
        }
    }

    #[inline]
    pub fn capacity(&self) -> usize {
        self.events.capacity()
    }
}

/// The type of an event identifier.
#[derive(Default)]
struct NextUniqueId(u32);

/// The type of an event in the event logs.
#[derive(CandidType, Clone, Deserialize)]
pub enum EventKind {
    CyclesSent {
        to: Principal,
        amount: u64,
    },
    CyclesReceived {
        from: Principal,
        amount: u64,
    },

    CustodianAdded {
        custodian: Principal,
    },
    CustodianRemoved {
        custodian: Principal,
    },
}

#[derive(CandidType, Clone, Deserialize)]
pub struct Event {
    pub id: u32,
    pub timestamp: u64,
    pub kind: EventKind,
}

impl Event {
    fn new(kind: EventKind) -> Self {
        let id = storage::get_mut::<NextUniqueId>();
        id.0 += 1;

        Self {
            id: id.0,
            timestamp: api::time() as u64,
            kind,
        }
    }
}

/// Record an event.
pub fn record(kind: EventKind) {
    let buffer = storage::get_mut::<EventBuffer>();
    let event = Event::new(kind);
    buffer.add(event);
}

pub fn get_events() -> &'static [Event] {
    let buffer = storage::get::<EventBuffer>();
    buffer.events.as_slice()
}
