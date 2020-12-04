use candid::CandidType;
use ic_cdk::*;
use ic_cdk_macros::*;
use ic_types::principal::Principal;
use serde::Deserialize;

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
}

#[pre_upgrade]
fn pre_upgrade() {
    let custodians_set = storage::get::<CustodianSet>();
    let stable = StableStorage {
        controller: custodians_set.get_controller().clone(),
        custodians: custodians_set.custodians().cloned().collect(),
        events: storage::get::<EventBuffer>().clone(),
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
    event_buffer.clone_from(&storage.events);

    custodians.set_controller(storage.controller);
    for c in storage.custodians {
        custodians.add_custodian(c);
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

mod wallet {
    use crate::{events, is_custodian};
    use candid::CandidType;
    use ic_cdk::{api, caller};
    use ic_cdk_macros::*;
    use ic_types::Principal;
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
    #[query(name = "wallet::balance")]
    fn balance() -> BalanceResult {
        BalanceResult {
            amount: api::canister_balance() as u64,
        }
    }

    /// Send cycles to another canister.
    #[update(name = "wallet::send")]
    async fn send(args: SendCyclesArgs) {
        let _: () = api::call::call_with_payment(
            args.canister.clone(),
            "wallet::receive",
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
    #[update(name = "wallet::receive")]
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

    #[update(guard = "is_custodian", name = "wallet::create_canister")]
    async fn create_canister(args: CreateCanisterArgs) -> CreateResult {
        // cost of create_canister is 1 trillion cycles
        // so cycles provided here should be more than 1 trillion
        // i.e. the wallet should have 1 trillion at least
        // can be rejected if not enough

        /***************************************************************************************************
         * Create Canister
         **************************************************************************************************/
        // call_with_payment
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
        // what is the set_controller cycle cost? for now dont check for set controller cycle cost
        // TODO: ask public spec for ability to call create_canister with an optional controller specified
        if let Some(new_controller) = args.controller {
            // dont call set_controller if controller is None
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
    #[update(guard = "is_custodian", name = "wallet::call")]
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
