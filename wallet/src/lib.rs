use candid::{CandidType, Func, Principal, Reserved};
use ic_cdk::api::{data_certificate, set_certified_data, trap};
use ic_cdk::*;
use ic_cdk_macros::*;
use ic_certified_map::{AsHashTree, Hash, RbTree};
use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_bytes::{ByteBuf, Bytes};
use sha2::Digest;
use std::borrow::Cow;
use std::cell::RefCell;
use std::collections::HashMap;
use std::convert::TryInto;
use std::mem;
use std::thread::LocalKey;

mod address;
mod events;
/// Migration functions to run on `#[post_upgrade]`.
mod migrations;

use crate::address::{AddressEntry, Role, ADDRESS_BOOK};
use crate::events::{EventBuffer, ManagedCanisterEvent, ManagedCanisterEventKind, EVENT_BUFFER};
use events::{record, Event, EventKind, ManagedList, MANAGED_LIST};

const WALLET_API_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Default)]
struct WalletWASMBytes(Option<serde_bytes::ByteBuf>);

/// The wallet (this canister's) name.
#[derive(Default)]
struct WalletName(pub(crate) Option<String>);

thread_local! {
    static WALLET_NAME: RefCell<WalletName> = Default::default();
    static WALLET_WASM_BYTES: RefCell<WalletWASMBytes> = Default::default();
}

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

impl Default for StableStorage {
    fn default() -> Self {
        Self {
            address_book: vec![],
            chart: vec![],
            events: Default::default(),
            name: None,
            wasm_module: None,
            managed: Some(Default::default()),
        }
    }
}

const STABLE_VERSION: u32 = 2;

#[pre_upgrade]
fn pre_upgrade() {
    fn local_take<T: Default>(key: &'static LocalKey<RefCell<T>>) -> T {
        key.with(|cell| mem::take(&mut *cell.borrow_mut()))
    }
    let address_book = local_take(&ADDRESS_BOOK);
    let stable = StableStorage {
        address_book: address_book.iter().cloned().collect(),
        events: local_take(&EVENT_BUFFER),
        name: local_take(&WALLET_NAME).0,
        chart: local_take(&CHART_TICKS),
        wasm_module: local_take(&WALLET_WASM_BYTES).0,
        managed: Some(local_take(&MANAGED_LIST)),
    };
    match storage::stable_save((stable, Some(STABLE_VERSION))) {
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
    let StableStorage {
        address_book,
        events,
        name,
        chart,
        wasm_module,
        managed,
    } = if let Ok((storage, Some(STABLE_VERSION))) =
        storage::stable_restore::<(StableStorage, Option<u32>)>()
    {
        storage
    } else if let Ok((_, version)) = storage::stable_restore::<(Reserved, Option<u32>)>() {
        migrations::migrate_from(version.unwrap_or(1)).unwrap_or_default()
    } else {
        return;
    };
    EVENT_BUFFER.with(|events0| *events0.borrow_mut() = events);
    ADDRESS_BOOK.with(|address_book0| {
        let mut address_book0 = address_book0.borrow_mut();
        for entry in address_book.into_iter() {
            address_book0.insert(entry)
        }
    });

    WALLET_NAME.with(|name0| name0.borrow_mut().0 = name);

    WALLET_WASM_BYTES.with(|bytes0| bytes0.borrow_mut().0 = wasm_module);

    CHART_TICKS.with(|chart0| *chart0.borrow_mut() = chart);
    MANAGED_LIST.with(|list0| *list0.borrow_mut() = managed.unwrap());
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
    WALLET_NAME.with(|name| name.borrow().0.clone())
}

#[update(guard = "is_controller")]
fn set_name(name: String) {
    WALLET_NAME.with(|wallet_name| wallet_name.borrow_mut().0 = Some(name));
    update_chart();
}

/***************************************************************************************************
 * Frontend
 **************************************************************************************************/
include!(concat!(env!("OUT_DIR"), "/assets.rs"));

#[derive(Default)]
struct Assets {
    contents: HashMap<&'static str, (Vec<HeaderField>, &'static [u8])>,
    hashes: AssetHashes,
}

thread_local! {
    static ASSETS: RefCell<Assets> = Default::default();
}

type AssetHashes = RbTree<&'static str, Hash>;
type HeaderField = (String, String);

#[derive(Clone, Debug, CandidType, Deserialize)]
struct HttpRequest {
    method: String,
    url: String,
    headers: Vec<HeaderField>,
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
    let mut asset = req.url.split('?').next().unwrap_or("/");
    if asset == "/authorize" {
        asset = "/index.html";
    }
    ASSETS.with(|assets| {
        let assets = assets.borrow();
        let certificate_header = make_asset_certificate_header(&assets.hashes, asset);
        match assets.contents.get(asset) {
            Some((headers, value)) => {
                let mut headers = headers.clone();
                headers.append(&mut security_headers());
                headers.push(certificate_header);

                HttpResponse {
                    status_code: 200,
                    headers,
                    body: Cow::Borrowed(Bytes::new(value)),
                    streaming_strategy: None,
                }
            }
            None => {
                let mut headers = security_headers();
                headers.push(certificate_header);
                HttpResponse {
                    status_code: 404,
                    headers,
                    body: Cow::Owned(ByteBuf::from(format!("Asset {} not found.", asset))),
                    streaming_strategy: None,
                }
            }
        }
    })
}

fn make_asset_certificate_header(asset_hashes: &AssetHashes, asset_name: &str) -> HeaderField {
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

lazy_static! {
    static ref INDEX_HTML_STR: String = {
        let index_html = include_str!("../../dist/index.html");
        let re = Regex::new("<script src=\"(?P<name>\\S+)\"></script>").unwrap();
        let replacement = "<script>var s=document.createElement('script');s.src=\"$name\";document.head.appendChild(s);</script>";
        let processed = re.replace_all(index_html, replacement);
        processed.to_string()
    };
    static ref INDEX_HTML_STR_HASH: [u8; 32] = {
        let bytes = INDEX_HTML_STR.as_bytes();
        let mut hasher = sha2::Sha256::new();
        hasher.update(&bytes);
        hasher.finalize().into()
    };
    static ref INDEX_HTML_JS_HASHES: String = {
        let re = Regex::new("<script>(.*?)</script>").unwrap();
        let mut res = String::new();
        for cap in re.captures_iter(&*INDEX_HTML_STR) {
            let s = &cap[1];
            let hash = &sha2::Sha256::digest(s.as_bytes());
            let hash = base64::encode(hash);
            res.push_str(&format!("'sha256-{hash}' "));
        }
        res
    };
}

/// List of recommended security headers as per https://owasp.org/www-project-secure-headers/
/// These headers enable browser security features (like limit access to platform apis and set
/// iFrame policies, etc.).
fn security_headers() -> Vec<HeaderField> {
    let hashes = INDEX_HTML_JS_HASHES.to_string();
    vec![
        ("X-Frame-Options".to_string(), "DENY".to_string()),
        ("X-Content-Type-Options".to_string(), "nosniff".to_string()),
        // Content Security Policy
        //
        // The sha256 hash matches the inline script in index.html. This inline script is a workaround
        // for Firefox not supporting SRI (recommended here https://csp.withgoogle.com/docs/faq.html#static-content).
        // This also prevents use of trusted-types. See https://bugzilla.mozilla.org/show_bug.cgi?id=1409200.
        //
        // script-src 'unsafe-eval' is required because agent-js uses a WebAssembly module for the
        // validation of bls signatures.
        // There is currently no other way to allow execution of WebAssembly modules with CSP.
        // See https://github.com/WebAssembly/content-security-policy/blob/main/proposals/CSP.md.
        //
        // style-src 'unsafe-inline' is currently required due to the way styles are handled by the
        // application. Adding hashes would require a big restructuring of the application and build
        // infrastructure.
        //
        // NOTE about `script-src`: we cannot use a normal script tag like this
        //   <script src="index.js" integrity="sha256-..." defer></script>
        // because Firefox does not support SRI with CSP: https://bugzilla.mozilla.org/show_bug.cgi?id=1409200
        // Instead, we add it to the CSP policy
        (
            "Content-Security-Policy".to_string(),
            format!(
                "default-src 'none';\
             connect-src 'self' https://ic0.app;\
             img-src 'self' data:;\
             script-src {} 'unsafe-eval' 'strict-dynamic' https:;\
             base-uri 'none';\
             frame-ancestors 'none';\
             form-action 'none';\
             style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;\
             style-src-elem 'unsafe-inline' https://fonts.googleapis.com;\
             font-src https://fonts.gstatic.com data:;\
             upgrade-insecure-requests;",
                hashes
            ),
        ),
        (
            "Strict-Transport-Security".to_string(),
            "max-age=31536000 ; includeSubDomains".to_string(),
        ),
        // "Referrer-Policy: no-referrer" would be more strict, but breaks local dev deployment
        // same-origin is still ok from a security perspective
        ("Referrer-Policy".to_string(), "same-origin".to_string()),
        (
            "Permissions-Policy".to_string(),
            "accelerometer=(),\
             ambient-light-sensor=(),\
             autoplay=(),\
             battery=(),\
             camera=(),\
             clipboard-read=(),\
             clipboard-write=(self),\
             conversion-measurement=(),\
             cross-origin-isolated=(),\
             display-capture=(),\
             document-domain=(),\
             encrypted-media=(),\
             execution-while-not-rendered=(),\
             execution-while-out-of-viewport=(),\
             focus-without-user-activation=(),\
             fullscreen=(),\
             gamepad=(),\
             geolocation=(),\
             gyroscope=(),\
             hid=(),\
             idle-detection=(),\
             interest-cohort=(),\
             keyboard-map=(),\
             magnetometer=(),\
             microphone=(),\
             midi=(),\
             navigation-override=(),\
             payment=(),\
             picture-in-picture=(),\
             screen-wake-lock=(),\
             serial=(),\
             speaker-selection=(),\
             sync-script=(),\
             sync-xhr=(self),\
             trust-token-redemption=(),\
             usb=(),\
             vertical-scroll=(),\
             web-share=(),\
             window-placement=(),\
             xr-spatial-tracking=()"
                .to_string(),
        ),
    ]
}

fn init_assets() {
    ASSETS.with(|assets| {
        let mut assets = assets.borrow_mut();
        for_each_asset(|name, headers, contents, hash| {
            if name == "/index.html" {
                assets.hashes.insert("/", *INDEX_HTML_STR_HASH);
                assets
                    .contents
                    .insert("/", (headers.clone(), INDEX_HTML_STR.as_bytes()));
            }
            assets.hashes.insert(name, *hash);
            assets.contents.insert(name, (headers, contents));
        });
        let full_tree_hash =
            ic_certified_map::labeled_hash(b"http_assets", &assets.hashes.root_hash());
        set_certified_data(&full_tree_hash);
    });
}

/***************************************************************************************************
 * Controller Management
 **************************************************************************************************/

/// Get the controller of this canister.
#[query(guard = "is_custodian_or_controller")]
fn get_controllers() -> Vec<Principal> {
    ADDRESS_BOOK.with(|book| book.borrow().controllers().map(|e| e.id).collect())
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
    ADDRESS_BOOK.with(|book| {
        let mut book = book.borrow_mut();
        if !book.is_controller(&controller) {
            return Err(format!(
                "Cannot remove {} because it is not a controller.",
                controller.to_text()
            ));
        }
        if book.controllers().count() > 1 {
            if let Some(mut entry) = book.take(&controller) {
                entry.role = Role::Contact;
                book.insert(entry);
            }
            update_chart();
            Ok(())
        } else {
            Err("The wallet must have at least one controller.".to_string())
        }
    })
}

/***************************************************************************************************
 * Custodian Management
 **************************************************************************************************/

/// Get the custodians of this canister.
#[query(guard = "is_custodian_or_controller")]
fn get_custodians() -> Vec<Principal> {
    ADDRESS_BOOK.with(|book| book.borrow().custodians().map(|e| e.id).collect())
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
    if ADDRESS_BOOK.with(|book| book.borrow().is_custodian(&custodian)) {
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
    use crate::{events, is_custodian_or_controller, WALLET_WASM_BYTES};
    use ic_cdk::export::candid::{CandidType, Nat};
    use ic_cdk::export::Principal;
    use ic_cdk::{api, caller, id};
    use ic_cdk_macros::*;
    use serde::Deserialize;
    use std::convert::TryInto;

    /***************************************************************************************************
     * Cycle Management
     **************************************************************************************************/
    #[derive(CandidType)]
    struct BalanceResult<TCycles> {
        amount: TCycles,
    }

    #[derive(CandidType, Deserialize)]
    struct SendCyclesArgs<TCycles> {
        canister: Principal,
        amount: TCycles,
    }

    /// Return the cycle balance of this canister.
    #[query(guard = "is_custodian_or_controller", name = "wallet_balance")]
    fn balance() -> BalanceResult<u64> {
        BalanceResult {
            amount: api::canister_balance128()
                .try_into()
                .expect("Balance exceeded a 64-bit value; call `wallet_balance128`"),
        }
    }

    #[query(guard = "is_custodian_or_controller", name = "wallet_balance128")]
    fn balance128() -> BalanceResult<u128> {
        BalanceResult {
            amount: api::canister_balance128(),
        }
    }

    #[derive(CandidType)]
    struct DepositCyclesArgs {
        canister_id: Principal,
    }

    /// Send cycles to another canister.
    #[update(guard = "is_custodian_or_controller", name = "wallet_send")]
    async fn send(SendCyclesArgs { canister, amount }: SendCyclesArgs<u64>) -> Result<(), String> {
        send128(SendCyclesArgs {
            canister,
            amount: amount as u128,
        })
        .await
    }
    #[update(guard = "is_custodian_or_controller", name = "wallet_send128")]
    async fn send128(args: SendCyclesArgs<u128>) -> Result<(), String> {
        match api::call::call_with_payment128(
            Principal::management_canister(),
            "deposit_cycles",
            (DepositCyclesArgs {
                canister_id: args.canister,
            },),
            args.amount,
        )
        .await
        {
            Ok(x) => {
                let refund = api::call::msg_cycles_refunded128();
                events::record(events::EventKind::CyclesSent {
                    to: args.canister,
                    amount: args.amount,
                    refund,
                });
                super::update_chart();
                x
            }
            Err((code, msg)) => {
                let refund = api::call::msg_cycles_refunded128();
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
        let amount = ic_cdk::api::call::msg_cycles_available128();
        if amount > 0 {
            let amount_accepted = ic_cdk::api::call::msg_cycles_accept128(amount);
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
    struct CreateCanisterArgs<TCycles> {
        cycles: TCycles,
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
    async fn create_canister(
        CreateCanisterArgs { cycles, settings }: CreateCanisterArgs<u64>,
    ) -> Result<CreateResult, String> {
        create_canister128(CreateCanisterArgs {
            cycles: cycles as u128,
            settings,
        })
        .await
    }
    #[update(
        guard = "is_custodian_or_controller",
        name = "wallet_create_canister128"
    )]
    async fn create_canister128(
        mut args: CreateCanisterArgs<u128>,
    ) -> Result<CreateResult, String> {
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

    async fn create_canister_call(args: CreateCanisterArgs<u128>) -> Result<CreateResult, String> {
        #[derive(CandidType)]
        struct In {
            settings: Option<CanisterSettings>,
        }
        let in_arg = In {
            settings: Some(normalize_canister_settings(args.settings)?),
        };

        let (create_result,): (CreateResult,) = match api::call::call_with_payment128(
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
    async fn create_wallet(
        CreateCanisterArgs { cycles, settings }: CreateCanisterArgs<u64>,
    ) -> Result<CreateResult, String> {
        create_wallet128(CreateCanisterArgs {
            cycles: cycles as u128,
            settings,
        })
        .await
    }
    #[update(guard = "is_custodian_or_controller", name = "wallet_create_wallet128")]
    async fn create_wallet128(args: CreateCanisterArgs<u128>) -> Result<CreateResult, String> {
        let wasm_module = WALLET_WASM_BYTES.with(|wallet_bytes| match &wallet_bytes.borrow().0 {
            Some(o) => o.clone().into_vec(),
            None => {
                ic_cdk::trap("No wasm module stored.");
            }
        });
        let args_without_controller = CreateCanisterArgs {
            cycles: args.cycles,
            settings: CanisterSettings {
                controller: None,
                controllers: None,
                ..args.clone().settings
            },
        };

        let create_result = create_canister_call(args_without_controller).await?;

        install_wallet(&create_result.canister_id, wasm_module).await?;

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
        WALLET_WASM_BYTES.with(|wallet_bytes| {
            wallet_bytes.borrow_mut().0 = Some(serde_bytes::ByteBuf::from(args.wasm_module))
        });
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
    struct CallCanisterArgs<TCycles> {
        canister: Principal,
        method_name: String,
        #[serde(with = "serde_bytes")]
        args: Vec<u8>,
        cycles: TCycles,
    }

    #[derive(CandidType, Deserialize)]
    struct CallResult {
        #[serde(with = "serde_bytes")]
        r#return: Vec<u8>,
    }

    /// Forward a call to another canister.
    #[update(guard = "is_custodian_or_controller", name = "wallet_call")]
    async fn call(
        CallCanisterArgs {
            canister,
            method_name,
            args,
            cycles,
        }: CallCanisterArgs<u64>,
    ) -> Result<CallResult, String> {
        call128(CallCanisterArgs {
            canister,
            method_name,
            args,
            cycles: cycles as u128,
        })
        .await
    }

    #[update(guard = "is_custodian_or_controller", name = "wallet_call128")]
    async fn call128(args: CallCanisterArgs<u128>) -> Result<CallResult, String> {
        if api::id() == caller() {
            return Err("Attempted to call forward on self. This is not allowed. Call this method via a different custodian.".to_string());
        }

        match api::call::call_raw128(args.canister, &args.method_name, &args.args, args.cycles)
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
    ADDRESS_BOOK.with(|book| book.borrow_mut().insert(address.clone()));
    record(EventKind::AddressAdded {
        id: address.id,
        name: address.name,
        role: address.role,
    });
    update_chart();
}

#[query(guard = "is_custodian_or_controller")]
fn list_addresses() -> Vec<AddressEntry> {
    ADDRESS_BOOK.with(|book| book.borrow().iter().cloned().collect())
}

#[update(guard = "is_controller")]
fn remove_address(address: Principal) -> Result<(), String> {
    ADDRESS_BOOK.with(|book| {
        let mut book = book.borrow_mut();
        if book.is_controller(&address) && book.controllers().count() == 1 {
            Err("The wallet must have at least one controller.".to_string())
        } else {
            book.remove(&address);
            record(EventKind::AddressRemoved { id: address });
            update_chart();
            Ok(())
        }
    })
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
fn get_events128(args: Option<GetEventsArgs>) -> Vec<Event> {
    if let Some(GetEventsArgs { from, to }) = args {
        events::get_events(from, to)
    } else {
        events::get_events(None, None)
    }
}

#[query(guard = "is_custodian_or_controller")]
fn get_events(args: Option<GetEventsArgs>) -> Vec<migrations::v1::V1Event> {
    use migrations::v1::*;
    let events = get_events128(args);
    events
        .into_iter()
        .map(
            |Event {
                 id,
                 timestamp,
                 kind,
             }| {
                let kind = match kind {
                    EventKind::AddressAdded { id, name, role } => {
                        V1EventKind::AddressAdded { id, name, role }
                    }
                    EventKind::AddressRemoved { id } => V1EventKind::AddressRemoved { id },
                    EventKind::CanisterCalled {
                        canister,
                        cycles,
                        method_name,
                    } => V1EventKind::CanisterCalled {
                        canister,
                        cycles: cycles.try_into().expect("`CanisterCalled` event exceeded a 64-bit cycle count; call `get_events128`"),
                        method_name,
                    },
                    EventKind::CanisterCreated { canister, cycles } => {
                        V1EventKind::CanisterCreated {
                            canister,
                            cycles: cycles.try_into().expect("`CanisterCreated` event exceeded a 64-bit cycle count; call `get_events128`"),
                        }
                    }
                    EventKind::CyclesReceived { amount, from, memo } => {
                        V1EventKind::CyclesReceived {
                            amount: amount.try_into().expect("`CyclesReceived` event exceeded a 64-bit cycle count; call `get_events128`"),
                            from,
                            memo,
                        }
                    }
                    EventKind::CyclesSent { amount, refund, to } => V1EventKind::CyclesSent {
                        amount: amount.try_into().expect("`CyclesSent` event exceeded a 64-bit `amount` cycle count; call `get_events128`"),
                        refund: refund.try_into().expect("`CyclesSent` event exceeded a 64-bit `refund` cycle count; call `get_events128`"),
                        to,
                    },
                    EventKind::WalletDeployed { canister } => {
                        V1EventKind::WalletDeployed { canister }
                    }
                };
                V1Event {
                    id,
                    timestamp,
                    kind,
                }
            },
        )
        .collect()
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
fn list_managed_canisters(args: ListCanistersArgs) -> (Vec<events::ManagedCanisterInfo>, u32) {
    events::get_managed_canisters(args.from, args.to)
}

#[derive(CandidType, Deserialize)]
struct GetManagedCanisterEventArgs {
    canister: Principal,
    from: Option<u32>,
    to: Option<u32>,
}

#[query(guard = "is_custodian_or_controller")]
fn get_managed_canister_events128(
    args: GetManagedCanisterEventArgs,
) -> Option<Vec<events::ManagedCanisterEvent>> {
    events::get_managed_canister_events(&args.canister, args.from, args.to)
}

#[query(guard = "is_custodian_or_controller")]
fn get_managed_canister_events(
    args: GetManagedCanisterEventArgs,
) -> Option<Vec<migrations::v1::V1ManagedCanisterEvent>> {
    use migrations::v1::*;
    let events = get_managed_canister_events128(args);
    events.map(|events| {
        events
            .into_iter()
            .map(
                |ManagedCanisterEvent {
                     id,
                     timestamp,
                     kind,
                 }| {
                    let kind = match kind {
                        ManagedCanisterEventKind::Called {
                            cycles,
                            method_name,
                        } => V1ManagedCanisterEventKind::Called {
                            cycles: cycles.try_into().expect("`Called` event exceeded a 64-bit cycle count; call `get_managed_canister_events128`"),
                            method_name,
                        },
                        ManagedCanisterEventKind::Created { cycles } => {
                            V1ManagedCanisterEventKind::Created {
                                cycles: cycles.try_into().expect("`Created` event exceeded a 64-bit cycle count; call `get_managed_canister_events128`"),
                            }
                        }
                        ManagedCanisterEventKind::CyclesSent { amount, refund } => {
                            V1ManagedCanisterEventKind::CyclesSent {
                                amount: amount.try_into().expect("`CyclesSent` event exceeded a 64-bit `amount` cycle count; call `get_managed_canister_events128`"),
                                refund: refund.try_into().expect("`CyclesSent` event exceeded a 64-bit `refund` cycle count; call `get_managed_canister_events128`"),
                            }
                        }
                    };
                    V1ManagedCanisterEvent {
                        id,
                        timestamp,
                        kind,
                    }
                },
            )
            .collect()
    })
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
pub struct ChartTick {
    timestamp: u64,
    cycles: u64,
}

thread_local! {
    static CHART_TICKS: RefCell<Vec<ChartTick>> = Default::default();
}

#[derive(CandidType, Deserialize)]
struct GetChartArgs {
    count: Option<u32>,
    precision: Option<u64>,
}

#[query(guard = "is_custodian_or_controller")]
fn get_chart(args: Option<GetChartArgs>) -> Vec<(u64, u64)> {
    CHART_TICKS.with(|chart| {
        let chart = chart.borrow();

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
    })
}

fn update_chart() {
    let timestamp = api::time();
    let cycles = api::canister_balance();
    CHART_TICKS.with(|chart| chart.borrow_mut().push(ChartTick { timestamp, cycles }));
}

/***************************************************************************************************
 * Utilities
 **************************************************************************************************/

/// Check if the caller is the initializer.
fn is_controller() -> Result<(), String> {
    if ADDRESS_BOOK.with(|book| book.borrow().is_controller(&caller())) {
        Ok(())
    } else {
        Err("Only the controller can call this method.".to_string())
    }
}

/// Check if the caller is a custodian.
fn is_custodian_or_controller() -> Result<(), String> {
    let caller = &caller();
    if ADDRESS_BOOK.with(|book| book.borrow().is_controller_or_custodian(caller))
        || &api::id() == caller
    {
        Ok(())
    } else {
        Err("Only a controller or custodian can call this method.".to_string())
    }
}
