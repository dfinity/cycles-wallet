use candid::CandidType;
use ic_cdk::*;
use ic_cdk_macros::*;
use ic_types::principal::Principal;
use serde::Deserialize;
use std::collections::BTreeMap;

mod custodians;
mod events;

use crate::events::EventBuffer;
use custodians::CustodianSet;
use events::{record, Event, EventKind};

// TODO: add this as argument to init when dfx 0.7 gets out.
// #[derive(CandidType, Deserialize)]
// struct WalletInitArgs {
//     event_buffer_size: Option<u32>,
// }

/// Initialize this canister.
#[init]
fn init() {
    storage::get_mut::<events::EventBuffer>().resize(32);

    let caller = caller();
    set_controller(caller.clone());
    authorize(caller);
}

/// Until the stable storage works better in the ic-cdk, this does the job just fine.
#[derive(CandidType, Deserialize)]
struct StableStorage {
    controller: Principal,
    custodians: Vec<Principal>,
    events: EventBuffer,
    devices: Vec<Device>,
}

#[pre_upgrade]
fn pre_upgrade() {
    let custodians_set = storage::get::<CustodianSet>();
    let stable = StableStorage {
        controller: custodians_set.get_controller().clone(),
        custodians: custodians_set.custodians().cloned().collect(),
        events: storage::get::<EventBuffer>().clone(),
        devices: get_devices(),
    };
    storage::stable_save((stable,)).unwrap();
}

#[post_upgrade]
fn post_upgrade() {
    let (storage,): (StableStorage,) = storage::stable_restore().unwrap();
    let event_buffer = storage::get_mut::<events::EventBuffer>();
    let custodians = storage::get_mut::<CustodianSet>();

    // Before cloning the buffer, we need to set the capacity properly.
    event_buffer.resize(storage.events.capacity());
    for e in storage.events.iter() {
        event_buffer.push(e.clone());
    }

    custodians.set_controller(storage.controller);
    for c in storage.custodians {
        custodians.add_custodian(c);
    }

    for d in storage.devices {
        register(d.name, d.id, d.public_key);
    }
}

#[query]
fn retrieve(path: String) -> &'static [u8] {
    if &path == "index.js" {
        include_bytes!("../../dist/index.js")
    } else {
        ic_cdk::trap("Invalid path...")
    }
}

/***************************************************************************************************
 * Controller Management
 **************************************************************************************************/

/// Get the controller of this canister.
#[query]
fn get_controller() -> &'static Principal {
    storage::get_mut::<CustodianSet>().get_controller()
}

/// Set the controller (transfer of ownership).
#[update(guard = "is_controller")]
fn set_controller(controller: Principal) {
    storage::get_mut::<CustodianSet>().set_controller(controller)
}

/***************************************************************************************************
 * Custodian Management
 **************************************************************************************************/

/// Get the custodians of this canister.
#[query]
fn get_custodians() -> &'static Vec<Principal> {
    storage::get::<Vec<Principal>>()
}

/// Authorize a custodian.
#[update(guard = "is_controller")]
fn authorize(custodian: Principal) {
    let custodians = storage::get_mut::<CustodianSet>();
    custodians.add_custodian(custodian.clone());
    record(EventKind::CustodianAdded { custodian })
}

/// Deauthorize a custodian.
#[update(guard = "is_controller")]
fn deauthorize(custodian: Principal) {
    let custodians = storage::get_mut::<CustodianSet>();
    custodians.remove_custodian(custodian.clone());
    record(EventKind::CustodianRemoved { custodian })
}

/***************************************************************************************************
 * WebAuthn Support
 **************************************************************************************************/

#[derive(CandidType, Clone, Deserialize)]
struct Device {
    name: String,
    id: String,
    public_key: String,
}

#[update(guard = "is_custodian")]
fn register(device: String, webauthn_id: String, custodian: String) {
    let device_credentials_store = storage::get_mut::<BTreeMap<String, (String, String)>>();
    let credentials = (webauthn_id, custodian.clone());
    let _ = device_credentials_store.insert(device, credentials);

    if let Ok(principal) = Principal::from_text(custodian) {
        authorize(principal);
    }
}

#[query]
fn get_devices() -> Vec<Device> {
    let device_credentials_store = storage::get_mut::<BTreeMap<String, (String, String)>>();
    let mut devices = vec![];
    for (name, (id, public_key)) in device_credentials_store {
        devices.push(Device {
            name: name.clone(),
            id: id.clone(),
            public_key: public_key.clone(),
        })
    }

    devices
}

mod wallet {
    use ic_cdk::api::call::funds::Unit;
    use ic_cdk::{api, caller};
    use ic_types::Principal;
    use crate::events;

    #[query(name = "wallet_balance")]
    fn balance(unit: Unit) -> u64 {
        api::canister_balance(unit) as u64
    }

    #[update(name = "wallet_send")]
    fn send(to: Principal, amounts: Vec<(Unit, u64)>) {
        for (u, a) in amounts {
            let _: () = api::call::call_with_payment(to.clone(), "wallet_receive", (), amount as i64)
                .await
                .unwrap();

            events::record(events::EventKind::UnitSent {
                to,
                unit: events::Unit::from(unit),
                amount,
            });
        }
    }

    #[update(name = "wallet_receive")]
    fn receive() {
        let from = caller();

        // For now only support cycles and ICPTs.
        for

        let amount = ic_cdk::api::call::funds::available(api::call::funds::Unit::Cycle);
        if amount > 0 {
            events::record(events::EventKind::UnitReceived {
                from,
                unit: events::Unit::from(ic_cdk::api::call::funds::Unit::Cycle),
                amount: amount as u64,
            });
        }
        ic_cdk::api::call::funds::accept(api::call::funds::Unit::Cycle, amount);
    }
}

/***************************************************************************************************
 * Cycle Management
 **************************************************************************************************/

/// Return the cycle balance of this canister.
#[query]
fn cycle_balance() -> u64 {
    api::canister_balance() as u64
}

/// Send cycles to another canister.
#[update(guard = "is_custodian")]
async fn send_cycles(to: Principal, amount: u64) {
    let _: () = api::call::call_with_payment(to.clone(), "receive_cycles", (), amount as i64)
        .await
        .unwrap();

    events::record(events::EventKind::CyclesSent { to, amount });
}

/// Receive cycles from another canister.
#[update]
fn receive_cycles() {
    let from = caller();
    let amount = ic_cdk::api::call::msg_cycles_available();
    if amount > 0 {
        events::record(events::EventKind::CyclesReceived {
            from,
            amount: amount as u64,
        });
    }
    ic_cdk::api::call::msg_cycles_accept(amount);
}

/// Return the cycle balance of this canister.
#[query]
fn icpt_balance() -> u64 {
    api::canister_balance(api::call::funds::Unit::IcpToken) as u64
}

/// Send icpts to another canister.
#[update(guard = "is_custodian")]
async fn send_icpts(to: Principal, amount: u64) {
    let _: () = api::call::call_with_payment(to.clone(), "receive_icpts", (), amount as i64)
        .await
        .unwrap();

    events::record(events::EventKind::UnitSent {
        to,
        unit: events::Unit::from(ic_cdk::api::call::funds::Unit::IcpToken),
        amount,
    });
}

/// Receive icpts from another canister.
#[update]
fn receive_icpts() {
    let from = caller();
    let amount = ic_cdk::api::call::funds::available(api::call::funds::Unit::IcpToken);
    if amount > 0 {
        events::record(events::EventKind::UnitReceived {
            from,
            unit: events::Unit::from(ic_cdk::api::call::funds::Unit::IcpToken),
            amount: amount as u64,
        });
    }
    ic_cdk::api::call::funds::accept(api::call::funds::Unit::IcpToken, amount);
}

/***************************************************************************************************
 * Call Forwarding
 **************************************************************************************************/

/// Forward a call to another canister.
#[update(guard = "is_custodian")]
async fn call(id: Principal, method: String, args: Vec<u8>, amount: u64) -> Vec<u8> {
    match api::call::call_raw(id, &method, args, amount as i64)
        .await
    {
        Ok(x) => x,
        Err((code, msg)) => {
            ic_cdk::trap(&format!("An error happened during the call: {}: {}", code as u8, msg));
        }
    }
}

/***************************************************************************************************
 * Events
 **************************************************************************************************/

/// Return the recent events observed by this canister.
#[query]
fn get_events() -> &'static [Event] {
    events::get_events()
}

/***************************************************************************************************
 * Utilities
 **************************************************************************************************/

/// Check if the caller is the initializer.
fn is_controller() -> Result<(), String> {
    if storage::get::<CustodianSet>().is_controller(&caller()) {
        Ok(())
    } else {
        Err("Only the controller can call this method.".to_string())
    }
}

/// Check if the caller is a custodian.
fn is_custodian() -> Result<(), String> {
    if storage::get::<CustodianSet>().is_custodian(&caller()) {
        Ok(())
    } else {
        Err("Only a custodian can call this method.".to_string())
    }
}
