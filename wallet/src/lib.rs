use ic_cdk::export::candid::CandidType;
use ic_cdk::export::Principal;
use ic_cdk::*;
use ic_cdk_macros::*;
use serde::Deserialize;

mod address;
mod events;

use crate::address::{AddressBook, AddressEntry, Role};
use crate::events::EventBuffer;
use events::{record, Event, EventKind};

// TODO: add this as argument to init when dfx 0.7 gets out.
// #[derive(CandidType, Deserialize)]
// struct WalletInitArgs {
//     event_buffer_size: Option<u32>,
// }

/// Initialize this canister.
#[init]
fn init() {
    storage::get_mut::<events::EventBuffer>().resize(128);
    add_address(AddressEntry::new(caller(), None, Role::Controller));
    unsafe {
        BYTES.extend_from_slice(include_bytes!("../../dist/index.js"));
    }
}

/// Until the stable storage works better in the ic-cdk, this does the job just fine.
#[derive(CandidType, Deserialize)]
struct StableStorage {
    address_book: Vec<AddressEntry>,
    events: EventBuffer,
}

#[pre_upgrade]
fn pre_upgrade() {
    let address_book = storage::get::<AddressBook>();
    let stable = StableStorage {
        address_book: address_book.iter().cloned().collect(),
        events: storage::get::<EventBuffer>().clone(),
    };
    storage::stable_save((stable,)).unwrap();
}

#[post_upgrade]
fn post_upgrade() {
    if let Ok((storage,)) = storage::stable_restore::<(StableStorage,)>() {
        let event_buffer = storage::get_mut::<events::EventBuffer>();
        let address_book = storage::get_mut::<AddressBook>();

        // Before cloning the buffer, we need to set the capacity properly.
        event_buffer.resize(storage.events.capacity());
        event_buffer.clone_from(&storage.events);

        for entry in storage.address_book.into_iter() {
            address_book.insert(entry)
        }
    } else {
        init()
    }
}

/***************************************************************************************************
 * Frontend
 **************************************************************************************************/
static mut BYTES: Vec<u8> = Vec::new();

#[update]
fn store(blob: Vec<u8>) {
    unsafe { BYTES = blob };
}

#[query]
fn retrieve(path: String) -> &'static [u8] {
    if path == "index.js" {
        unsafe { BYTES.as_slice() }
    } else {
        trap(&format!(r#"Cannot find "{}" in the assets."#, path));
    }
}

/***************************************************************************************************
 * Controller Management
 **************************************************************************************************/

/// Get the controller of this canister.
#[query(guard = "is_custodian")]
fn get_controllers() -> Vec<&'static Principal> {
    storage::get_mut::<AddressBook>()
        .controllers()
        .map(|e| &e.id)
        .collect()
}

/// Set the controller (transfer of ownership).
#[update(guard = "is_controller")]
fn add_controller(controller: Principal) {
    add_address(AddressEntry::new(controller, None, Role::Controller));
}

/// Remove a controller. This is equivalent to moving the role to a regular user.
#[update(guard = "is_controller")]
fn remove_controller(controller: Principal) {
    let book = storage::get_mut::<AddressBook>();

    if let Some(mut entry) = book.take(&controller) {
        entry.role = Role::Contact;
        book.insert(entry);
    }
}

/***************************************************************************************************
 * Custodian Management
 **************************************************************************************************/

/// Get the custodians of this canister.
#[query(guard = "is_custodian")]
fn get_custodians() -> Vec<&'static Principal> {
    storage::get::<AddressBook>()
        .custodians()
        .map(|e| &e.id)
        .collect()
}

/// Authorize a custodian.
#[update(guard = "is_controller")]
fn authorize(custodian: Principal) {
    add_address(AddressEntry::new(custodian.clone(), None, Role::Custodian));
}

/// Deauthorize a custodian.
#[update(guard = "is_controller")]
fn deauthorize(custodian: Principal) {
    remove_address(custodian)
}

mod wallet {
    use crate::{events, is_custodian};
    use ic_cdk::export::candid::CandidType;
    use ic_cdk::export::Principal;
    use ic_cdk::{api, caller};
    use ic_cdk_macros::*;
    use serde::Deserialize;

    /***************************************************************************************************
     * Cycle Management
     **************************************************************************************************/
    #[derive(CandidType)]
    struct BalanceResult {
        amount: u64,
    }

    #[derive(CandidType, Deserialize)]
    struct SendCyclesArgs {
        canister: Principal,
        amount: u64,
    }

    #[derive(CandidType)]
    struct ReceiveResult {
        accepted: u64,
    }

    /// Return the cycle balance of this canister.
    #[query(guard = "is_custodian", name = "wallet_balance")]
    fn balance() -> BalanceResult {
        BalanceResult {
            amount: api::canister_balance() as u64,
        }
    }

    /// Send cycles to another canister.
    #[update(guard = "is_custodian", name = "wallet_send")]
    async fn send(args: SendCyclesArgs) {
        let _: () = api::call::call_with_payment(
            args.canister.clone(),
            "wallet_receive",
            (),
            args.amount as i64,
        )
        .await
        .unwrap();

        events::record(events::EventKind::CyclesSent {
            to: args.canister,
            amount: args.amount,
        });
    }

    /// Receive cycles from another canister.
    #[update(name = "wallet_receive")]
    fn receive() -> ReceiveResult {
        let from = caller();
        let amount = ic_cdk::api::call::msg_cycles_available();
        if amount > 0 {
            events::record(events::EventKind::CyclesReceived {
                from,
                amount: amount as u64,
            });
        }
        ReceiveResult {
            accepted: ic_cdk::api::call::msg_cycles_accept(amount) as u64,
        }
    }

    /***************************************************************************************************
     * Managing Canister
     **************************************************************************************************/
    #[derive(CandidType, Deserialize)]
    struct CreateCanisterArgs {
        cycles: u64,
        controller: Option<Principal>,
    }

    #[derive(CandidType, Deserialize)]
    struct CreateResult {
        canister_id: Principal,
    }

    #[update(guard = "is_custodian", name = "wallet_create_canister")]
    async fn create_canister(args: CreateCanisterArgs) -> CreateResult {
        /***************************************************************************************************
         * Create Canister
         **************************************************************************************************/
        let (create_result,): (CreateResult,) = match api::call::call_with_payment(
            Principal::management_canister(),
            "create_canister",
            (),
            args.cycles as i64,
        )
        .await
        {
            Ok(x) => x,
            Err((code, msg)) => {
                ic_cdk::trap(&format!(
                    "An error happened during the call: {}: {}",
                    code as u8, msg
                ));
            }
        };

        /***************************************************************************************************
         * Set Controller
         **************************************************************************************************/
        if let Some(new_controller) = args.controller {
            match api::call::call(
                Principal::management_canister(),
                "set_controller",
                (create_result.canister_id.clone(), new_controller),
            )
            .await
            {
                Ok(x) => x,
                Err((code, msg)) => {
                    ic_cdk::trap(&format!(
                        "An error happened during the call: {}: {}",
                        code as u8, msg
                    ));
                }
            };
        }
        events::record(events::EventKind::CanisterCreated {
            canister: create_result.canister_id.clone(),
        });
        create_result
    }

    /***************************************************************************************************
     * Call Forwarding
     **************************************************************************************************/
    #[derive(CandidType, Deserialize)]
    struct CallCanisterArgs {
        canister: Principal,
        method_name: String,
        args: Vec<u8>,
        cycles: u64,
    }

    #[derive(CandidType)]
    struct CallResult {
        r#return: Vec<u8>,
    }

    /// Forward a call to another canister.
    #[update(guard = "is_custodian", name = "wallet_call")]
    async fn call(args: CallCanisterArgs) -> CallResult {
        match api::call::call_raw(
            args.canister.clone(),
            &args.method_name,
            args.args,
            args.cycles as i64,
        )
        .await
        {
            Ok(x) => {
                events::record(events::EventKind::CanisterCalled {
                    canister: args.canister,
                    method_name: args.method_name,
                });
                CallResult { r#return: x }
            }
            Err((code, msg)) => {
                ic_cdk::trap(&format!(
                    "An error happened during the call: {}: {}",
                    code as u8, msg
                ));
            }
        }
    }
}

/***************************************************************************************************
 * Address Book
 **************************************************************************************************/

// Address book
#[update]
fn add_address(address: AddressEntry) -> () {
    storage::get_mut::<AddressBook>().insert(address.clone());
    record(EventKind::AddressAdded {
        id: address.id,
        name: address.name,
        role: address.role,
    })
}

#[query]
fn list_address() -> Vec<&'static AddressEntry> {
    storage::get::<AddressBook>().iter().collect()
}

#[update]
fn remove_address(address: Principal) -> () {
    storage::get_mut::<AddressBook>().remove(&address);
    record(EventKind::AddressRemoved { id: address })
}

/***************************************************************************************************
 * Events
 **************************************************************************************************/

/// Return the recent events observed by this canister.
#[query(guard = "is_custodian")]
fn get_events() -> &'static [Event] {
    events::get_events()
}

/***************************************************************************************************
 * Utilities
 **************************************************************************************************/

/// Check if the caller is the initializer.
fn is_controller() -> Result<(), String> {
    if storage::get::<AddressBook>().is_controller(&caller()) {
        Ok(())
    } else {
        Err("Only the controller can call this method.".to_string())
    }
}

/// Check if the caller is a custodian.
fn is_custodian() -> Result<(), String> {
    if storage::get::<AddressBook>().is_custodian(&caller()) {
        Ok(())
    } else {
        Err("Only a custodian can call this method.".to_string())
    }
}
