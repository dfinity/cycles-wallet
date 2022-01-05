use ic_cdk::api::{data_certificate, set_certified_data, trap};
use ic_cdk::export::candid::{CandidType, Func, Principal};
use ic_cdk::*;
use ic_cdk_macros::*;
use ic_certified_map::{AsHashTree, Hash, RbTree};
use serde::{Deserialize, Serialize};
use serde_bytes::{ByteBuf, Bytes};
use std::borrow::Cow;
use std::collections::HashMap;

mod address;
mod events;

use crate::address::{AddressBook, AddressEntry, Role};
use crate::events::EventBuffer;
use events::{record, Event, EventKind, ManagedList};

const WALLET_API_VERSION: &str = "0.2.0";

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
    init_assets();
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
    managed: Option<ManagedList>,
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
        managed: Some(storage::get::<ManagedList>().clone()),
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
        if let Some(managed) = storage.managed {
            *storage::get_mut::<ManagedList>() = managed;
        } else {
            events::migrations::_1_create_managed_canister_list();
        }
    }
}

/***************************************************************************************************
 * Wallet API Version
 **************************************************************************************************/
#[query(guard = "is_custodian_or_controller")]
fn wallet_api_version() -> String {
    WALLET_API_VERSION.to_string()
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
include!(concat!(env!("OUT_DIR"), "/assets.rs"));

struct Assets {
    contents: HashMap<&'static str, (Vec<HeaderField>, &'static [u8])>,
    hashes: AssetHashes,
}

impl Default for Assets {
    fn default() -> Self {
        Self {
            hashes: AssetHashes::default(),
            contents: HashMap::default(),
        }
    }
}

type AssetHashes = RbTree<&'static str, Hash>;
type HeaderField = (String, String);

#[derive(Clone, Debug, CandidType, Deserialize)]
struct HttpRequest {
    method: String,
    url: String,
    headers: Vec<(String, String)>,
    body: ByteBuf,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
struct HttpResponse {
    status_code: u16,
    headers: Vec<HeaderField>,
    body: Cow<'static, Bytes>,
    streaming_strategy: Option<StreamingStrategy>,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
enum StreamingStrategy {
    Callback { callback: Func, token: Token },
}

#[derive(Clone, Debug, CandidType, Deserialize)]
struct Token {}

#[query]
fn http_request(req: HttpRequest) -> HttpResponse {
    let parts: Vec<&str> = req.url.split('?').collect();
    let asset = parts[0];
    let assets = storage::get::<Assets>();
    let certificate_header = make_asset_certificate_header(&assets.hashes, asset);
    match assets.contents.get(asset) {
        Some((headers, value)) => {
            let mut headers = headers.clone();
            headers.push(certificate_header);

            HttpResponse {
                status_code: 200,
                headers,
                body: Cow::Borrowed(Bytes::new(value)),
                streaming_strategy: None,
            }
        }
        None => HttpResponse {
            status_code: 404,
            headers: vec![certificate_header],
            body: Cow::Owned(ByteBuf::from(format!("Asset {} not found.", asset))),
            streaming_strategy: None,
        },
    }
}

fn make_asset_certificate_header(asset_hashes: &AssetHashes, asset_name: &str) -> (String, String) {
    let certificate = data_certificate().unwrap_or_else(|| {
        trap("data certificate is only available in query calls");
    });
    let witness = asset_hashes.witness(asset_name.as_bytes());
    let hash_tree = ic_certified_map::labeled(b"http_assets", witness);
    let mut serializer = serde_cbor::ser::Serializer::new(vec![]);
    serializer.self_describe().unwrap();
    hash_tree.serialize(&mut serializer).unwrap();
    (
        "IC-Certificate".to_string(),
        format!(
            "certificate=:{}:, tree=:{}:",
            base64::encode(&certificate),
            base64::encode(&serializer.into_inner())
        ),
    )
}

fn init_assets() {
    let assets = storage::get_mut::<Assets>();
    for_each_asset(|name, headers, contents, hash| {
        if name == "/index.html" {
            assets.hashes.insert("/", *hash);
            assets.contents.insert("/", (headers.clone(), contents));
        }
        assets.hashes.insert(name, *hash);
        assets.contents.insert(name, (headers, contents));
    });
    let full_tree_hash = ic_certified_map::labeled_hash(b"http_assets", &assets.hashes.root_hash());
    set_certified_data(&full_tree_hash);
}

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
    if !storage::get::<AddressBook>().is_controller(&controller) {
        return Err(format!(
            "Cannot remove {} because it is not a controller.",
            controller.to_text()
        ));
    }
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
            "Cannot deauthorize {} as it is not a custodian.",
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
            amount: api::canister_balance(),
        }
    }

    /// Send cycles to another canister.
    #[update(guard = "is_custodian_or_controller", name = "wallet_send")]
    async fn send(args: SendCyclesArgs) -> Result<(), String> {
        match api::call::call_with_payment(args.canister, "wallet_receive", (), args.amount).await {
            Ok(x) => {
                let refund = api::call::msg_cycles_refunded();
                events::record(events::EventKind::CyclesSent {
                    to: args.canister,
                    amount: args.amount,
                    refund,
                });
                super::update_chart();
                x
            }
            Err((code, msg)) => {
                let refund = api::call::msg_cycles_refunded();
                events::record(events::EventKind::CyclesSent {
                    to: args.canister,
                    amount: args.amount,
                    refund,
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

    #[derive(CandidType, Deserialize)]
    struct ReceiveOptions {
        memo: Option<String>,
    }

    /// Receive cycles from another canister.
    #[update(name = "wallet_receive")]
    fn receive(options: Option<ReceiveOptions>) {
        let from = caller();
        let amount = ic_cdk::api::call::msg_cycles_available();
        if amount > 0 {
            let amount_accepted = ic_cdk::api::call::msg_cycles_accept(amount);
            events::record(events::EventKind::CyclesReceived {
                from,
                amount: amount_accepted,
                memo: options.and_then(|opts| opts.memo),
            });
            super::update_chart();
        }
    }

    /***************************************************************************************************
     * Managing Canister
     **************************************************************************************************/
    #[derive(CandidType, Clone, Deserialize)]
    struct CanisterSettings {
        // dfx versions <= 0.8.1 (or other wallet callers expecting version 0.1.0 of the wallet)
        // will set a controller (or not) in the the `controller` field:
        controller: Option<Principal>,

        // dfx versions >= 0.8.2 will set 0 or more controllers here:
        controllers: Option<Vec<Principal>>,

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
    async fn create_canister(mut args: CreateCanisterArgs) -> Result<CreateResult, String> {
        let mut settings = normalize_canister_settings(args.settings)?;
        let controllers = settings
            .controllers
            .get_or_insert_with(|| Vec::with_capacity(2));
        if controllers.is_empty() {
            controllers.push(ic_cdk::api::caller());
            controllers.push(ic_cdk::api::id());
        }
        args.settings = settings;
        let create_result = create_canister_call(args).await?;
        super::update_chart();
        Ok(create_result)
    }

    // Make it so the controller or controllers are stored only in the controllers field.
    fn normalize_canister_settings(settings: CanisterSettings) -> Result<CanisterSettings, String> {
        // Agent <= 0.8.0, dfx <= 0.8.1 will send controller
        // Agents >= 0.9.0, dfx >= 0.8.2 will send controllers
        // The management canister will accept either controller or controllers, but not both.
        match (&settings.controller, &settings.controllers) {
            (Some(_), Some(_)) => {
                Err("CanisterSettings cannot have both controller and controllers set.".to_string())
            }
            (Some(controller), None) => Ok(CanisterSettings {
                controller: None,
                controllers: Some(vec![*controller]),
                ..settings
            }),
            _ => Ok(settings),
        }
    }

    async fn create_canister_call(args: CreateCanisterArgs) -> Result<CreateResult, String> {
        #[derive(CandidType)]
        struct In {
            settings: Option<CanisterSettings>,
        }
        let in_arg = In {
            settings: Some(normalize_canister_settings(args.settings)?),
        };

        let (create_result,): (CreateResult,) = match api::call::call_with_payment(
            Principal::management_canister(),
            "create_canister",
            (in_arg,),
            args.cycles,
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
            canister: create_result.canister_id,
            cycles: args.cycles,
        });
        Ok(create_result)
    }

    async fn update_settings_call(
        args: UpdateSettingsArgs,
        update_acl: bool,
    ) -> Result<(), String> {
        if update_acl {
            // assumption: settings are normalized (settings.controller is never present)
            if let Some(controllers) = args.settings.controllers.as_ref() {
                for controller in controllers {
                    match api::call::call(args.canister_id, "add_controller", (*controller,)).await
                    {
                        Ok(x) => x,
                        Err((code, msg)) => {
                            return Err(format!(
                                "An error happened during the call: {}: {}",
                                code as u8, msg
                            ))
                        }
                    };
                }
            }

            match api::call::call(args.canister_id, "remove_controller", (id(),)).await {
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
            canister_id: *canister_id,
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
            canister: *canister_id,
        });

        // Store wallet wasm
        let store_args = WalletStoreWASMArgs { wasm_module };
        match api::call::call(*canister_id, "wallet_store_wallet_wasm", (store_args,)).await {
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
                controllers: None,
                ..args.clone().settings
            },
        };

        let create_result = create_canister_call(args_without_controller).await?;

        install_wallet(&create_result.canister_id, wasm_module.clone().into_vec()).await?;

        // Set controller
        if args.settings.controller.is_some() || args.settings.controllers.is_some() {
            update_settings_call(
                UpdateSettingsArgs {
                    canister_id: create_result.canister_id,
                    settings: normalize_canister_settings(args.settings)?,
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

        match api::call::call_raw(args.canister, &args.method_name, args.args, args.cycles).await {
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
 * Managed canisters
 **************************************************************************************************/

#[derive(CandidType, Deserialize)]
struct ListCanistersArgs {
    from: Option<u32>,
    to: Option<u32>,
}

#[query(guard = "is_custodian_or_controller")]
fn list_managed_canisters(
    args: ListCanistersArgs,
) -> (Vec<&'static events::ManagedCanisterInfo>, u32) {
    events::get_managed_canisters(args.from, args.to)
}

#[derive(CandidType, Deserialize)]
struct GetManagedCanisterEventArgs {
    canister: Principal,
    from: Option<u32>,
    to: Option<u32>,
}

#[query(guard = "is_custodian_or_controller")]
fn get_managed_canister_events(
    args: GetManagedCanisterEventArgs,
) -> Option<Vec<events::ManagedCanisterEvent>> {
    events::get_managed_canister_events(&args.canister, args.from, args.to)
}

#[update(guard = "is_custodian_or_controller")]
fn set_short_name(
    canister: Principal,
    name: Option<String>,
) -> Option<events::ManagedCanisterInfo> {
    events::set_short_name(&canister, name)
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
    let timestamp = api::time();
    let cycles = api::canister_balance();
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
