use ic_cdk::export::candid::CandidType;
use ic_cdk::export::Principal;
use ic_cdk::*;
use ic_cdk_macros::*;
use serde::Deserialize;
use std::borrow::Cow;

mod address;
mod events;

use crate::address::{AddressBook, AddressEntry, Role};
use crate::events::EventBuffer;
use events::{record, Event, EventKind};

/// The frontend bytes.
struct FrontendBytes(pub Cow<'static, [u8]>);

impl Default for FrontendBytes {
    fn default() -> Self {
        FrontendBytes(Cow::Borrowed(include_bytes!("../../dist/index.js")))
    }
}

/// The wallet (this canister's) name.
#[derive(Default)]
struct WalletName(pub(crate) Option<String>);

/// Initialize this canister.
#[init]
fn init() {
    add_address(AddressEntry::new(caller(), None, Role::Controller));
}

/// Until the stable storage works better in the ic-cdk, this does the job just fine.
#[derive(CandidType, Deserialize)]
struct StableStorage {
    /// This is None if it's still borrowed.
    frontend: Option<Vec<u8>>,
    address_book: Vec<AddressEntry>,
    events: EventBuffer,
    name: Option<String>,
    chart: Vec<ChartTick>,
}

#[pre_upgrade]
fn pre_upgrade() {
    let frontend_bytes = storage::get::<FrontendBytes>();
    let address_book = storage::get::<AddressBook>();
    let stable = StableStorage {
        frontend: match &frontend_bytes.0 {
            Cow::Borrowed(_) => None,
            Cow::Owned(o) => Some(o.to_vec()),
        },
        address_book: address_book.iter().cloned().collect(),
        events: storage::get::<EventBuffer>().clone(),
        name: storage::get::<WalletName>().0.clone(),
        chart: storage::get::<Vec<ChartTick>>().to_vec(),
    };
    match storage::stable_save((stable,)) {
        Ok(_) => (),
        Err(candid_err) => {
            ic_cdk::trap(&format!(
                "An error occurred when saving to stable memory (pre_upgrade): {}",
                candid_err
            ));
        }
    };
}

#[post_upgrade]
fn post_upgrade() {
    init();
    if let Ok((storage,)) = storage::stable_restore::<(StableStorage,)>() {
        let event_buffer = storage::get_mut::<events::EventBuffer>();
        let address_book = storage::get_mut::<AddressBook>();
        let frontend_bytes = storage::get_mut::<FrontendBytes>();

        // Copy the frontend if there's one.
        if let Some(blob) = storage.frontend {
            frontend_bytes.0 = Cow::Owned(blob);
        }

        event_buffer.clear();
        event_buffer.clone_from(&storage.events);

        for entry in storage.address_book.into_iter() {
            address_book.insert(entry)
        }

        storage::get_mut::<WalletName>().0 = storage.name;

        let chart = storage::get_mut::<Vec<ChartTick>>();
        chart.clear();
        chart.clone_from(&storage.chart);
    }
}

/***************************************************************************************************
 * Frontend
 **************************************************************************************************/
#[update(guard = "is_controller")]
fn store(blob: Vec<u8>) {
    let frontend_bytes = storage::get_mut::<FrontendBytes>();
    frontend_bytes.0 = Cow::Owned(blob);
    update_chart();
}

#[query]
fn retrieve(path: String) -> &'static [u8] {
    let frontend_bytes = storage::get::<FrontendBytes>();
    if path == "index.js" {
        match &frontend_bytes.0 {
            Cow::Owned(o) => o.as_slice(),
            Cow::Borrowed(b) => b,
        }
    } else {
        trap(&format!(r#"Cannot find "{}" in the assets."#, path));
    }
}

/***************************************************************************************************
 * Wallet Name
 **************************************************************************************************/
#[query(guard = "is_custodian")]
fn name() -> Option<String> {
    storage::get::<WalletName>().0.clone()
}

#[update(guard = "is_controller")]
fn set_name(name: String) {
    storage::get_mut::<WalletName>().0 = Some(name);
    update_chart();
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
    update_chart();
}

/// Remove a controller. This is equivalent to moving the role to a regular user.
#[update(guard = "is_controller")]
fn remove_controller(controller: Principal) {
    let book = storage::get_mut::<AddressBook>();

    if let Some(mut entry) = book.take(&controller) {
        entry.role = Role::Contact;
        book.insert(entry);
    }
    update_chart();
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
    add_address(AddressEntry::new(custodian, None, Role::Custodian));
    update_chart();
}

/// Deauthorize a custodian.
#[update(guard = "is_controller")]
fn deauthorize(custodian: Principal) {
    remove_address(custodian);
    update_chart();
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
        let (_,): (candid::parser::value::IDLValue,) = match api::call::call_with_payment(
            args.canister.clone(),
            "wallet_receive",
            (),
            args.amount as i64,
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

        events::record(events::EventKind::CyclesSent {
            to: args.canister,
            amount: args.amount,
        });
        super::update_chart();
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
        super::update_chart();
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
            cycles: args.cycles,
        });
        super::update_chart();
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
                    cycles: args.cycles,
                });
                super::update_chart();
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
fn add_address(address: AddressEntry) {
    storage::get_mut::<AddressBook>().insert(address.clone());
    record(EventKind::AddressAdded {
        id: address.id,
        name: address.name,
        role: address.role,
    });
    update_chart();
}

#[query]
fn list_addresses() -> Vec<&'static AddressEntry> {
    storage::get::<AddressBook>().iter().collect()
}

#[update]
fn remove_address(address: Principal) {
    storage::get_mut::<AddressBook>().remove(&address);
    update_chart();
    record(EventKind::AddressRemoved { id: address })
}

/***************************************************************************************************
 * Events
 **************************************************************************************************/

#[derive(CandidType, Deserialize)]
struct GetEventsArgs {
    from: Option<u32>,
    to: Option<u32>,
}

/// Return the recent events observed by this canister.
#[query(guard = "is_custodian")]
fn get_events(args: Option<GetEventsArgs>) -> &'static [Event] {
    if let Some(GetEventsArgs { from, to }) = args {
        events::get_events(from, to)
    } else {
        events::get_events(None, None)
    }
}

/***************************************************************************************************
 * Charts
 **************************************************************************************************/
#[derive(Clone, CandidType, Deserialize)]
struct ChartTick {
    timestamp: u64,
    cycles: u64,
}

#[derive(CandidType, Deserialize)]
struct GetChartArgs {
    count: Option<u32>,
    precision: Option<u64>,
}

#[query(guard = "is_custodian")]
fn get_chart(args: Option<GetChartArgs>) -> Vec<(u64, u64)> {
    let chart = storage::get_mut::<Vec<ChartTick>>();

    let GetChartArgs { count, precision } = args.unwrap_or(GetChartArgs {
        count: None,
        precision: None,
    });
    let take = count.unwrap_or(100).max(1000);
    // Precision is in nanoseconds. This is an hour.
    let precision = precision.unwrap_or(60 * 60 * 1_000_000);

    let mut last_tick = u64::MAX;
    #[allow(clippy::unnecessary_filter_map)]
    chart
        .iter()
        .rev()
        .filter_map(|tick| {
            if tick.timestamp >= last_tick {
                None
            } else {
                last_tick = tick.timestamp - precision;
                Some(tick)
            }
        })
        .take(take as usize)
        .map(|tick| (tick.timestamp, tick.cycles))
        .collect()
}

fn update_chart() {
    let chart = storage::get_mut::<Vec<ChartTick>>();
    let timestamp = api::time() as u64;
    let cycles = api::canister_balance() as u64;
    chart.push(ChartTick { timestamp, cycles });
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
