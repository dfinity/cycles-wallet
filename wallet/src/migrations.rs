use crate::events::*;
use crate::*;
use ic_cdk::storage;

pub mod v1;
use v1::*;

use Event as V2Event;
use EventBuffer as V2EventBuffer;
use EventKind as V2EventKind;
use ManagedCanister as V2ManagedCanister;
use ManagedCanisterEvent as V2ManagedCanisterEvent;
use ManagedCanisterEventKind as V2ManagedCanisterEventKind;
use ManagedList as V2ManagedList;
use StableStorage as V2StableStorage;

pub(crate) fn migrate_from(version: u32) -> Option<StableStorage> {
    let v2 = if version != 2 {
        let (mut v1,) = storage::stable_restore::<(V1StableStorage,)>().ok()?;
        // from before versioning
        if v1.managed.is_none() {
            _1_create_managed_canister_list(&mut v1);
        }
        _2_convert_nat64_to_nat(v1)
    } else {
        storage::stable_restore::<(V2StableStorage,)>().ok()?.0
    };
    Some(v2)
}

/// Creates the managed canister list from the event list.
///
/// Call during `#[post_upgrade]`, after the event list is deserialized, if the canister list can't be deserialized.
pub fn _1_create_managed_canister_list(store: &mut V1StableStorage) {
    let mut managed = V1ManagedList::default();
    let events = &store.events;
    for event in events.events.as_slice() {
        if let Some((to, kind)) = event.kind.to_managed() {
            managed.push_with_timestamp(to, kind, event.timestamp);
        }
    }
    store.managed = Some(managed);
}

pub(crate) fn _2_convert_nat64_to_nat(
    V1StableStorage {
        address_book,
        events,
        name,
        chart,
        wasm_module,
        managed,
    }: V1StableStorage,
) -> V2StableStorage {
    let events = events
        .events
        .into_iter()
        .map(
            |V1Event {
                 id,
                 timestamp,
                 kind,
             }| {
                let kind = match kind {
                    V1EventKind::AddressAdded { id, name, role } => {
                        V2EventKind::AddressAdded { id, name, role }
                    }
                    V1EventKind::AddressRemoved { id } => V2EventKind::AddressRemoved { id },
                    V1EventKind::CanisterCalled {
                        canister,
                        cycles,
                        method_name,
                    } => V2EventKind::CanisterCalled {
                        canister,
                        cycles: cycles as u128,
                        method_name,
                    },
                    V1EventKind::CanisterCreated { canister, cycles } => {
                        V2EventKind::CanisterCreated {
                            canister,
                            cycles: cycles as u128,
                        }
                    }
                    V1EventKind::CyclesReceived { amount, from, memo } => {
                        V2EventKind::CyclesReceived {
                            amount: amount as u128,
                            from,
                            memo,
                        }
                    }
                    V1EventKind::CyclesSent { amount, refund, to } => V2EventKind::CyclesSent {
                        amount: amount as u128,
                        refund: refund as u128,
                        to,
                    },
                    V1EventKind::WalletDeployed { canister } => {
                        V2EventKind::WalletDeployed { canister }
                    }
                };
                V2Event {
                    id,
                    timestamp,
                    kind,
                }
            },
        )
        .collect();
    let events = V2EventBuffer { events };
    let managed = managed
        .unwrap_or_default()
        .0
        .into_iter()
        .map(|(principal, V1ManagedCanister { info, events })| {
            let events = events
                .into_iter()
                .map(
                    |V1ManagedCanisterEvent {
                         id,
                         timestamp,
                         kind,
                     }| {
                        let kind = match kind {
                            V1ManagedCanisterEventKind::Called {
                                cycles,
                                method_name,
                            } => V2ManagedCanisterEventKind::Called {
                                cycles: cycles as u128,
                                method_name,
                            },
                            V1ManagedCanisterEventKind::Created { cycles } => {
                                V2ManagedCanisterEventKind::Created {
                                    cycles: cycles as u128,
                                }
                            }
                            V1ManagedCanisterEventKind::CyclesSent { amount, refund } => {
                                V2ManagedCanisterEventKind::CyclesSent {
                                    amount: amount as u128,
                                    refund: refund as u128,
                                }
                            }
                        };
                        V2ManagedCanisterEvent {
                            id,
                            timestamp,
                            kind,
                        }
                    },
                )
                .collect();
            (principal, V2ManagedCanister { info, events })
        })
        .collect();
    let managed = Some(V2ManagedList(managed));
    V2StableStorage {
        address_book,
        events,
        name,
        chart,
        wasm_module,
        managed,
    }
}
