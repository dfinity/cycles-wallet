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

struct WalletWASMBytes(Option<serde_bytes::ByteBuf>);

impl Default for WalletWASMBytes {
    fn default() -> Self {
        WalletWASMBytes(None)
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
    address_book: Vec<AddressEntry>,
    events: EventBuffer,
    name: Option<String>,
    chart: Vec<ChartTick>,
    wasm_module: Option<serde_bytes::ByteBuf>,
}

#[pre_upgrade]
fn pre_upgrade() {
    let address_book = storage::get::<AddressBook>();
    let stable = StableStorage {
        address_book: address_book.iter().cloned().collect(),
        events: storage::get::<EventBuffer>().clone(),
        name: storage::get::<WalletName>().0.clone(),
        chart: storage::get::<Vec<ChartTick>>().to_vec(),
        wasm_module: storage::get::<WalletWASMBytes>().0.clone(),
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

        event_buffer.clear();
        event_buffer.clone_from(&storage.events);

        for entry in storage.address_book.into_iter() {
            address_book.insert(entry)
        }

        storage::get_mut::<WalletName>().0 = storage.name;

        storage::get_mut::<WalletWASMBytes>().0 = storage.wasm_module;

        let chart = storage::get_mut::<Vec<ChartTick>>();
        chart.clear();
        chart.clone_from(&storage.chart);
    }
}

/***************************************************************************************************
 * Wallet Name
 **************************************************************************************************/
#[query(guard = "is_custodian_or_controller")]
fn name() -> Option<String> {
    storage::get::<WalletName>().0.clone()
}

#[update(guard = "is_controller")]
fn set_name(name: String) {
    storage::get_mut::<WalletName>().0 = Some(name);
    update_chart();
}

/***************************************************************************************************
 * Frontend
 **************************************************************************************************/
include!(concat!(env!("OUT_DIR"), "/http_request.rs"));

/***************************************************************************************************
 * Controller Management
 **************************************************************************************************/

/// Get the controller of this canister.
#[query(guard = "is_custodian_or_controller")]
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
fn remove_controller(controller: Principal) -> Result<(), String> {
    if storage::get::<AddressBook>().controllers().count() > 1 {
        let book = storage::get_mut::<AddressBook>();

        if let Some(mut entry) = book.take(&controller) {
            entry.role = Role::Contact;
            book.insert(entry);
        }
        update_chart();
        Ok(())
    } else {
        Err("The wallet must have at least one controller.".to_string())
    }
}

/***************************************************************************************************
 * Custodian Management
 **************************************************************************************************/

/// Get the custodians of this canister.
#[query(guard = "is_custodian_or_controller")]
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
fn deauthorize(custodian: Principal) -> Result<(), String> {
    if storage::get::<AddressBook>().is_custodian(&custodian) {
        remove_address(custodian)?;
        update_chart();
        Ok(())
    } else {
        Err(format!(
            "Cannot deauthorize {} as it ss not a custodian.",
            custodian.to_text()
        ))
    }
}

mod wallet {
    use crate::{events, is_custodian_or_controller};
    use ic_cdk::export::candid::{CandidType, Nat};
    use ic_cdk::export::Principal;
    use ic_cdk::{api, caller, id, storage};
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

    /// Return the cycle balance of this canister.
    #[query(guard = "is_custodian_or_controller", name = "wallet_balance")]
    fn balance() -> BalanceResult {
        BalanceResult {
            amount: api::canister_balance() as u64,
        }
    }

    /// Send cycles to another canister.
    #[update(guard = "is_custodian_or_controller", name = "wallet_send")]
    async fn send(args: SendCyclesArgs) -> Result<(), String> {
        match api::call::call_with_payment(
            args.canister.clone(),
            "wallet_receive",
            (),
            args.amount as i64,
        )
        .await
        {
            Ok(x) => {
                let refund = api::call::msg_cycles_refunded();
                events::record(events::EventKind::CyclesSent {
                    to: args.canister,
                    amount: args.amount,
                    refund: refund as u64,
                });
                super::update_chart();
                x
            }
            Err((code, msg)) => {
                let refund = api::call::msg_cycles_refunded();
                events::record(events::EventKind::CyclesSent {
                    to: args.canister,
                    amount: args.amount,
                    refund: refund as u64,
                });
                let call_error =
                    format!("An error happened during the call: {}: {}", code as u8, msg);
                let error = format!(
                    "Cycles sent: {}\nCycles refunded: {}\n{}",
                    args.amount, refund, call_error
                );
                return Err(error);
            }
        };

        Ok(())
    }

    /// Receive cycles from another canister.
    #[update(name = "wallet_receive")]
    fn receive() {
        let from = caller();
        let amount = ic_cdk::api::call::msg_cycles_available();
        if amount > 0 {
            let amount_accepted = ic_cdk::api::call::msg_cycles_accept(amount);
            events::record(events::EventKind::CyclesReceived {
                from,
                amount: amount_accepted as u64,
            });
            super::update_chart();
        }
    }

    /***************************************************************************************************
     * Managing Canister
     **************************************************************************************************/
    #[derive(CandidType, Clone, Deserialize)]
    struct CanisterSettings {
        controller: Option<Principal>,
        compute_allocation: Option<Nat>,
        memory_allocation: Option<Nat>,
        freezing_threshold: Option<Nat>,
    }

    #[derive(CandidType, Clone, Deserialize)]
    struct CreateCanisterArgs {
        cycles: u64,
        settings: CanisterSettings,
    }

    #[derive(CandidType, Deserialize)]
    struct UpdateSettingsArgs {
        canister_id: Principal,
        settings: CanisterSettings,
    }

    #[derive(CandidType, Deserialize)]
    struct CreateResult {
        canister_id: Principal,
    }

    #[update(guard = "is_custodian_or_controller", name = "wallet_create_canister")]
    async fn create_canister(args: CreateCanisterArgs) -> Result<CreateResult, String> {
        let create_result = create_canister_call(args).await?;

        super::update_chart();
        Ok(create_result)
    }

    async fn create_canister_call(args: CreateCanisterArgs) -> Result<CreateResult, String> {
        #[derive(CandidType)]
        struct In {
            settings: Option<CanisterSettings>,
        }
        let in_arg = In {
            settings: Some(args.settings),
        };

        let (create_result,): (CreateResult,) = match api::call::call_with_payment(
            Principal::management_canister(),
            "create_canister",
            (in_arg,),
            args.cycles as i64,
        )
        .await
        {
            Ok(x) => x,
            Err((code, msg)) => {
                return Err(format!(
                    "An error happened during the call: {}: {}",
                    code as u8, msg
                ))
            }
        };

        events::record(events::EventKind::CanisterCreated {
            canister: create_result.canister_id.clone(),
            cycles: args.cycles,
        });
        Ok(create_result)
    }

    async fn update_settings_call(
        args: UpdateSettingsArgs,
        update_acl: bool,
    ) -> Result<(), String> {
        if update_acl {
            match api::call::call(
                args.canister_id.clone(),
                "add_controller",
                (args.settings.controller.clone().unwrap().clone(),),
            )
            .await
            {
                Ok(x) => x,
                Err((code, msg)) => {
                    return Err(format!(
                        "An error happened during the call: {}: {}",
                        code as u8, msg
                    ))
                }
            };

            match api::call::call(args.canister_id.clone(), "remove_controller", (id(),)).await {
                Ok(x) => x,
                Err((code, msg)) => {
                    return Err(format!(
                        "An error happened during the call: {}: {}",
                        code as u8, msg
                    ))
                }
            };
        }

        match api::call::call(Principal::management_canister(), "update_settings", (args,)).await {
            Ok(x) => x,
            Err((code, msg)) => {
                return Err(format!(
                    "An error happened during the call: {}: {}",
                    code as u8, msg
                ))
            }
        };
        Ok(())
    }

    async fn install_wallet(canister_id: &Principal, wasm_module: Vec<u8>) -> Result<(), String> {
        // Install Wasm
        #[derive(CandidType, Deserialize)]
        enum InstallMode {
            #[serde(rename = "install")]
            Install,
            #[serde(rename = "reinstall")]
            Reinstall,
            #[serde(rename = "upgrade")]
            Upgrade,
        }

        #[derive(CandidType, Deserialize)]
        struct CanisterInstall {
            mode: InstallMode,
            canister_id: Principal,
            #[serde(with = "serde_bytes")]
            wasm_module: Vec<u8>,
            arg: Vec<u8>,
        }

        let install_config = CanisterInstall {
            mode: InstallMode::Install,
            canister_id: canister_id.clone(),
            wasm_module: wasm_module.clone(),
            arg: b" ".to_vec(),
        };

        match api::call::call(
            Principal::management_canister(),
            "install_code",
            (install_config,),
        )
        .await
        {
            Ok(x) => x,
            Err((code, msg)) => {
                return Err(format!(
                    "An error happened during the call: {}: {}",
                    code as u8, msg
                ))
            }
        };

        events::record(events::EventKind::WalletDeployed {
            canister: canister_id.clone(),
        });

        // Store wallet wasm
        let store_args = WalletStoreWASMArgs { wasm_module };
        match api::call::call(
            canister_id.clone(),
            "wallet_store_wallet_wasm",
            (store_args,),
        )
        .await
        {
            Ok(x) => x,
            Err((code, msg)) => {
                return Err(format!(
                    "An error happened during the call: {}: {}",
                    code as u8, msg
                ))
            }
        };
        Ok(())
    }

    #[update(guard = "is_custodian_or_controller", name = "wallet_create_wallet")]
    async fn create_wallet(args: CreateCanisterArgs) -> Result<CreateResult, String> {
        let wallet_bytes = storage::get::<super::WalletWASMBytes>();
        let wasm_module = match &wallet_bytes.0 {
            None => {
                ic_cdk::trap("No wasm module stored.");
            }
            Some(o) => o,
        };

        let args_without_controller = CreateCanisterArgs {
            cycles: args.cycles,
            settings: CanisterSettings {
                controller: None,
                ..args.clone().settings
            },
        };

        let create_result = create_canister_call(args_without_controller).await?;

        install_wallet(&create_result.canister_id, wasm_module.clone().into_vec()).await?;

        // Set controller
        if args.settings.controller.is_some() {
            update_settings_call(
                UpdateSettingsArgs {
                    canister_id: create_result.canister_id.clone(),
                    settings: args.settings,
                },
                true,
            )
            .await?;
        }
        super::update_chart();
        Ok(create_result)
    }

    #[derive(CandidType, Deserialize)]
    struct WalletStoreWASMArgs {
        #[serde(with = "serde_bytes")]
        wasm_module: Vec<u8>,
    }

    #[update(guard = "is_controller", name = "wallet_store_wallet_wasm")]
    async fn store_wallet_wasm(args: WalletStoreWASMArgs) {
        let wallet_bytes = storage::get_mut::<super::WalletWASMBytes>();
        wallet_bytes.0 = Some(serde_bytes::ByteBuf::from(args.wasm_module));
        super::update_chart();
    }

    /// @todo Once https://github.com/dfinity/cdk-rs/issues/70 is fixed, use the proper guard above.
    fn is_controller() -> Result<(), String> {
        super::is_controller()
    }

    /***************************************************************************************************
     * Call Forwarding
     **************************************************************************************************/
    #[derive(CandidType, Deserialize)]
    struct CallCanisterArgs {
        canister: Principal,
        method_name: String,
        #[serde(with = "serde_bytes")]
        args: Vec<u8>,
        cycles: u64,
    }

    #[derive(CandidType, Deserialize)]
    struct CallResult {
        #[serde(with = "serde_bytes")]
        r#return: Vec<u8>,
    }

    /// Forward a call to another canister.
    #[update(guard = "is_custodian_or_controller", name = "wallet_call")]
    async fn call(args: CallCanisterArgs) -> Result<CallResult, String> {
        if api::id() == caller() {
            return Err("Attempted to call forward on self. This is not allowed. Call this method via a different custodian.".to_string());
        }

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
                Ok(CallResult { r#return: x })
            }
            Err((code, msg)) => Err(format!(
                "An error happened during the call: {}: {}",
                code as u8, msg
            )),
        }
    }
}

/***************************************************************************************************
 * Address Book
 **************************************************************************************************/

// Address book
#[update(guard = "is_controller")]
fn add_address(address: AddressEntry) {
    storage::get_mut::<AddressBook>().insert(address.clone());
    record(EventKind::AddressAdded {
        id: address.id,
        name: address.name,
        role: address.role,
    });
    update_chart();
}

#[query(guard = "is_custodian_or_controller")]
fn list_addresses() -> Vec<&'static AddressEntry> {
    storage::get::<AddressBook>().iter().collect()
}

#[update(guard = "is_controller")]
fn remove_address(address: Principal) -> Result<(), String> {
    if storage::get::<AddressBook>().is_controller(&address)
        && storage::get::<AddressBook>().controllers().count() == 1
    {
        Err("The wallet must have at least one controller.".to_string())
    } else {
        storage::get_mut::<AddressBook>().remove(&address);
        record(EventKind::AddressRemoved { id: address });
        update_chart();
        Ok(())
    }
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
#[query(guard = "is_custodian_or_controller")]
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

#[query(guard = "is_custodian_or_controller")]
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
fn is_custodian_or_controller() -> Result<(), String> {
    let caller = &caller();
    if storage::get::<AddressBook>().is_controller_or_custodian(caller) || &api::id() == caller {
        Ok(())
    } else {
        Err("Only a controller or custodian can call this method.".to_string())
    }
}
