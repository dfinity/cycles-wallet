//! The wallet tool provides a way to DFINITY operators to create user
//! wallets on Sodium per user's request.

use anyhow::anyhow;
use delay::Delay;
use ic_agent::export::Principal;
use ic_agent::identity::BasicIdentity;
use ic_agent::{Agent, Identity};
use ic_identity_hsm::HardwareIdentity;
use ic_utils::call::AsyncCall;
use ic_utils::interfaces::management_canister::{InstallMode, MemoryAllocation};
use ic_utils::interfaces::{ManagementCanister, Wallet as WalletCanister};
use ic_utils::Canister;

use serde::{Deserialize, Serialize};
// use slog::{error, info, Logger};
use std::{
    convert::TryFrom,
    fs::File,
    io,
    io::{Read, Write},
    path::{Path, PathBuf},
    str::FromStr,
};
use structopt::StructOpt;

const BATCH_SIZE: &str = "8";
// Default cycles balance is the maximum that a canister can hold, currently
// 100T (100*10^12) cycles.
const CYCLES_BALANCE: &str = "100000000000000";
const SODIUM_STR: &str = "sodium";
const SODIUM_ENDPOINT: &str = "https://gw.dfinity.network";
const MERCURY_STR: &str = "mercury";
const MERCURY_ENDPOINT: &str = "https://mercury.dfinity.network";
const HSM_PKCS11_LIBRARY_PATH: &str = "HSM_PKCS11_LIBRARY_PATH";
const BASIC_IDENTITY_PEM_PATH: &str = "BASIC_IDENTITY_PEM_PATH";
const HSM_SLOT_INDEX: &str = "HSM_SLOT_INDEX";
const HSM_KEY_ID: &str = "HSM_KEY_ID";
const HSM_PIN: &str = "HSM_PIN";
const DEFAULT_MEM_ALLOCATION: u64 = 40000000_u64; // 40 MB

pub fn create_waiter() -> Delay {
    Delay::builder()
        .throttle(std::time::Duration::from_secs(1))
        .build()
}

fn expect_env_var(name: &str) -> Result<String, String> {
    std::env::var(name).map_err(|_| format!("Need to specify the {} environment variable", name))
}

fn get_hsm_pin() -> Result<String, String> {
    expect_env_var(HSM_PIN)
}

async fn create_basic_identity() -> WalletResult<Box<dyn Identity + Send + Sync>> {

    let id = match std::env::var(BASIC_IDENTITY_PEM_PATH) {
        Ok(_) => {
            let path = expect_env_var(BASIC_IDENTITY_PEM_PATH).map_err(|err| anyhow!("{}", err))?;
            BasicIdentity::from_pem_file(path).expect("Could not read the pem file.")
        },
        Err(_) => {
            let rng = ring::rand::SystemRandom::new();
            let key_pair = ring::signature::Ed25519KeyPair::generate_pkcs8(&rng)
                .expect("Could not generate a key pair.");
            BasicIdentity::from_key_pair(
                ring::signature::Ed25519KeyPair::from_pkcs8(key_pair.as_ref())
                    .expect("Could not read the key pair."))
        },
    };

    let sender = id.sender().map_err(|err| anyhow!("{}", err))?;
    let sender_text = sender.to_text();
    println!("basic sender {:?}", sender_text);
    Ok(Box::new(id))
}

async fn create_hsm_identity() -> WalletResult<Box<dyn Identity + Send + Sync>> {
    let path = expect_env_var(HSM_PKCS11_LIBRARY_PATH).map_err(|err| anyhow!("{}", err))?;
    let slot_index = expect_env_var(HSM_SLOT_INDEX)
        .map_err(|err| anyhow!("{}", err))?
        .parse::<usize>()
        .map_err(|e| anyhow!("Unable to parse {} value: {}", HSM_SLOT_INDEX, e))?;
    let key = expect_env_var(HSM_KEY_ID).map_err(|err| anyhow!("{}", err))?;
    let id = HardwareIdentity::new(path, slot_index, &key, get_hsm_pin)
        .map_err(|e| anyhow!("Unable to create hw identity: {}", e))?;

    let sender = id.sender().map_err(|err| anyhow!("{}", err))?;
    let sender_text = sender.to_text();
    println!("hw sender {:?}", sender_text);
    Ok(Box::new(id))
}

async fn create_identity() -> WalletResult<Box<dyn Identity + Send + Sync>> {
    if std::env::var(HSM_PKCS11_LIBRARY_PATH).is_ok() {
        create_hsm_identity().await
    } else {
        create_basic_identity().await
    }
}

/// Constructs an `Agent` to be used for submitting requests.
async fn construct_agent(endpoint: String) -> WalletResult<(Agent, Principal)> {
    let url_str = if endpoint == SODIUM_STR {
        SODIUM_ENDPOINT.to_string()
    } else if endpoint == MERCURY_STR {
        MERCURY_ENDPOINT.to_string()
    } else {
        format!("http://{}", endpoint)
    };

    let identity = create_identity().await?;
    let sender = identity.sender().map_err(|err| anyhow!("{}", err))?;
    Ok((Agent::builder()
        .with_url(url_str)
        .with_boxed_identity(identity)
        .build()
        .map_err(|err| anyhow!("{:?}", err.to_string()))?, sender))
}

type WalletResult<T = ()> = anyhow::Result<T>;

#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize, StructOpt)]
struct CreateWalletArgs {
    /// The path to a file containing a list of user ids to create wallets for.
    #[structopt(
        long = "user-ids-path",
        parse(from_os_str),
        default_value = "user_ids_example.txt"
    )]
    user_ids_path: PathBuf,

    /// The initial cycles that the wallet will contain.
    #[structopt(long = "cycles", default_value = CYCLES_BALANCE)]
    cycles: u64,

    /// The path to the wasm code that needs to be installed on the wallet.
    #[structopt(long = "wasm-path", parse(from_os_str), default_value = "wallet.wasm")]
    wasm_path: PathBuf,

    /// The endpoint to use for creating the wallet as `<host>:<port>`. E.g.
    /// `10.11.26.1:8080`. Use the special "sodium" string to run this on the
    /// Sodium network.
    #[structopt(long = "endpoint")]
    endpoint: String,

    /// Output file for storing the wallet ids that are created.
    #[structopt(long = "out", default_value = "out.txt")]
    out: String,

    /// How many wallets will be created in parallel.
    #[structopt(long = "batch-size", default_value = BATCH_SIZE)]
    batch_size: usize,
}

impl CreateWalletArgs {
    /// Returns the list of user ids as parsed from the input file.
    ///
    /// Note that it's expected that each line contains a single UserId.
    fn user_ids(&self) -> WalletResult<Vec<Principal>> {
        let user_ids_path = self.user_ids_path.as_path();
        let contents = std::fs::read_to_string(user_ids_path).map_err(|err| {
            anyhow!(
                "Could not read file containing user ids `{:?}`: {}",
                user_ids_path.to_path_buf(),
                err.to_string()
            )
        })?;

        let lines = contents.lines();
        let mut res = vec![];

        for user_id in lines.into_iter() {
            let principal_id = Principal::from_text(user_id).map_err(|err| {
                anyhow!(
                    "Invalid user id `{}`: {}",
                    user_id.to_string(),
                    err.to_string()
                )
            })?;
            res.push(principal_id);
        }

        Ok(res)
    }

    /// Returns the number of cycles to seed the wallet with.
    fn cycles(&self) -> u64 {
        self.cycles
    }

    /// Returns the endpoint to use.
    fn endpoint(&self) -> String {
        self.endpoint.clone()
    }

    fn out(&self) -> String {
        self.out.clone()
    }

    fn batch_size(&self) -> usize {
        self.batch_size
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize, StructOpt)]
struct InstallWalletArgs {
    /// The wallet id to install code.
    #[structopt(long = "wallet-id")]
    wallet_id: String,

    /// The path to the wasm code that needs to be installed on the wallet.
    #[structopt(long = "wasm-path", parse(from_os_str))]
    wasm_path: PathBuf,

    /// The endpoint to use for setting funds for the wallet as `<host>:<port>`.
    /// E.g. `10.11.26.1:8080`. Use the special "sodium" string to run this on
    /// the Sodium network.
    #[structopt(long = "endpoint")]
    endpoint: String,
}

impl InstallWalletArgs {
    /// Returns the endpoint to use.
    fn endpoint(&self) -> String {
        self.endpoint.clone()
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize, StructOpt)]
struct SetControllerWalletArgs {
    /// The wallet id to set the controller for.
    #[structopt(long = "wallet-id")]
    wallet_id: String,

    /// The user to be set as the controller for the wallet.
    #[structopt(long = "user-id")]
    user_id: String,

    /// The endpoint to use for setting funds for the wallet as `<host>:<port>`.
    /// E.g. `10.11.26.1:8080`. Use the special "sodium" string to run this on
    /// the Sodium network.
    #[structopt(long = "endpoint")]
    endpoint: String,
}

impl SetControllerWalletArgs {
    /// Returns the wasm code to be installed on the wallet.
    fn user_id(&self) -> WalletResult<Principal> {
        let principal_id = Principal::from_text(&self.user_id).map_err(|err| {
            anyhow!(
                "Invalid user id `{}`: {}",
                &self.user_id.to_string(),
                err.to_string()
            )
        })?;
        Ok(principal_id)
    }

    /// Returns the endpoint to use.
    fn endpoint(&self) -> String {
        self.endpoint.clone()
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize, StructOpt)]
struct TopUpArgs {
    /// The wallet id to set funds for.
    #[structopt(long = "wallet-id")]
    wallet_id: String,

    /// The amount of cycles to add to the balance of the wallet.
    #[structopt(long = "cycles")]
    cycles: u64,

    /// The endpoint to use for setting funds for the wallet as `<host>:<port>`.
    /// E.g. `10.11.26.1:8080`. Use the special "sodium" string to run this on
    /// the Sodium network.
    #[structopt(long = "endpoint")]
    endpoint: String,
}

impl TopUpArgs {
    /// Returns the number of cycles to be added to the balance.
    fn cycles(&self) -> u64 {
        self.cycles
    }

    /// Returns the endpoint to use.
    fn endpoint(&self) -> String {
        self.endpoint.clone()
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize, StructOpt)]
#[structopt(
    name = "wallet",
    about = "Tool to create and top up cycles for user wallets on Sodium"
)]
enum Wallet {
    Create(CreateWalletArgs),
    Install(InstallWalletArgs),
    SetController(SetControllerWalletArgs),
    TopUp(TopUpArgs),
}

#[async_std::main]
async fn main() {
    let args = Wallet::from_args();

    let _res = match args {
        Wallet::Create(args) => handle_create(args).await,
        Wallet::Install(args) => handle_install(args).await,
        Wallet::SetController(args) => handle_set_controller(args).await,
        Wallet::TopUp(args) => handle_top_up(args).await,
    };
}

/// Handles the `create` subcommand.
async fn handle_create(args: CreateWalletArgs) -> WalletResult<()> {
    // Split user_ids into batches so wallets in each batch can be created in
    // parallel.
    let user_ids = args.user_ids()?;
    let mut user_ids_chunked = vec![];
    for chunk in user_ids.chunks(args.batch_size()).into_iter() {
        user_ids_chunked.push(chunk.iter().map(|x| x.to_owned()).collect());
    }

    let cycles = args.cycles();
    let wasm = parse_wasm(args.wasm_path.as_path())?;
    let endpoint = args.endpoint();

    let mut canister_ids = vec![];

    for user_ids in user_ids_chunked.into_iter() {
        canister_ids.extend_from_slice(
            &create_wallet_batch(user_ids, cycles, endpoint.clone(), wasm.clone()).await?,
        );
    }

    // Write canister ids to a file.
    let mut f = File::create(&args.out()).expect("Unable to create canister ids file");
    for canister_id in canister_ids.iter() {
        writeln!(f, "{}", canister_id).expect("Unable to write canister id")
    }

    Ok(())
}

async fn create_wallet_batch(
    user_ids: Vec<Principal>,
    cycles: u64,
    endpoint: String,
    wasm: Vec<u8>,
) -> WalletResult<Vec<Principal>> {
    let mut canister_id_futures = vec![];
    for user_id in user_ids.into_iter() {
        let wasm = wasm.clone();
        let endpoint = endpoint.clone();
        let canister_id_future = async_std::task::spawn(async move {
            let (agent, sender) = construct_agent(endpoint).await.unwrap();
            agent.fetch_root_key().await.unwrap();
            let ic00 = ManagementCanister::create(&agent);
            println!("Creating wallet for user {}", user_id);
            let canister_id = create_wallet(&ic00, cycles).await.unwrap();

            let wallet = WalletCanister::create(&agent, canister_id.clone());

            println!("Installing code for wallet {}", canister_id);
            install_wallet(&ic00, &wallet, &canister_id, wasm).await.unwrap();

            println!(
                "Setting the controller for wallet {} to {}",
                canister_id, user_id
            );
            set_controller_for_wallet(&ic00, &wallet, &canister_id, &user_id, &sender)
                .await
                .unwrap();

            println!(
                "Successfully completed creating a wallet with id {} for user {}",
                canister_id, user_id
            );
            canister_id
        });
        canister_id_futures.push(canister_id_future);
    }

    let mut canister_ids = vec![];
    for canister_id_future in canister_id_futures.into_iter() {
        canister_ids.push(canister_id_future.await);
    }
    Ok(canister_ids)
}

/// Handles the `install` subcommand.
async fn handle_install(args: InstallWalletArgs) -> WalletResult<()> {
    let wallet_id = parse_wallet_id(&args.wallet_id)?;
    let wasm = parse_wasm(args.wasm_path.as_path())?;

    let (agent, _) = construct_agent(args.endpoint()).await?;
    agent.fetch_root_key().await.unwrap();
    let ic00 = ManagementCanister::create(&agent);
    let wallet = WalletCanister::create(&agent, wallet_id.clone());

    install_wallet(&ic00, &wallet, &wallet_id, wasm).await?;
    println!("Successfully installed wallet {}", wallet_id);

    Ok(())
}

/// Handles the `set-controller` subcommand.
async fn handle_set_controller(args: SetControllerWalletArgs) -> WalletResult<()> {
    let wallet_id = parse_wallet_id(&args.wallet_id)?;
    let user_id = args.user_id()?;

    let (agent, sender) = construct_agent(args.endpoint()).await?;
    agent.fetch_root_key().await.unwrap();
    let ic00 = ManagementCanister::create(&agent);
    let wallet = WalletCanister::create(&agent, wallet_id.clone());

    set_controller_for_wallet(&ic00, &wallet, &wallet_id, &user_id, &sender).await?;
    println!(
        "Successfully set the controller for wallet {} to {}",
        wallet_id, user_id
    );

    Ok(())
}

/// Handles the `top-up` subcommand.
async fn handle_top_up(args: TopUpArgs) -> WalletResult<()> {
    let wallet_id = parse_wallet_id(&args.wallet_id)?;
    let cycles = args.cycles();

    let (agent, _) = construct_agent(args.endpoint()).await?;
    agent.fetch_root_key().await.unwrap();
    let ic00 = ManagementCanister::create(&agent);

    println!("Topping up cycles for wallet {}...", wallet_id);
    top_up_wallet(&ic00, &wallet_id, cycles).await?;

    Ok(())
}

/// Creates a wallet canister with the given cycles as its starting balance.
async fn create_wallet(
    ic00: &Canister<'_, ManagementCanister>,
    cycles: u64,
) -> WalletResult<Principal> {
    let (canister_id,) = ic00
        .provisional_create_canister_with_cycles(Some(cycles))
        .call_and_wait(create_waiter())
        .await
        .map_err(|err| anyhow!("Could not create wallet canister: {}", err.to_string()))?;
    Ok(canister_id)
}

/// Installs the wallet code to the target canister_id.
async fn install_wallet(
    ic00: &Canister<'_, ManagementCanister>,
    wallet: &Canister<'_, WalletCanister>,
    canister_id: &Principal,
    wasm: Vec<u8>,
) -> WalletResult<()> {
    ic00.install_code(canister_id, &wasm)
        .with_mode(InstallMode::Install)
        .with_memory_allocation(MemoryAllocation::try_from(DEFAULT_MEM_ALLOCATION)
            .expect("Memory allocation must be between 0 and 2^48 (i.e 256TB), inclusively."))
        .call_and_wait(create_waiter())
        .await
        .map_err(|err| anyhow!("Could not install wallet canister: {}", err.to_string()))?;

    println!("wallet installed. now storing wasm into it.");

    wallet
        .wallet_store_wallet_wasm(wasm)
        .call_and_wait(create_waiter())
        .await?;

    Ok(())
}

/// Sets the controller of the wallet.
async fn set_controller_for_wallet(
    ic00: &Canister<'_, ManagementCanister>,
    wallet: &Canister<'_, WalletCanister>,
    wallet_id: &Principal,
    controller: &Principal,
    sender: &Principal,
) -> WalletResult<()> {
    wallet
        .add_controller(controller.clone())
        .call_and_wait(create_waiter())
        .await
        .map_err(|err| {
            anyhow!(
                "Could not set the controller of wallet canister {}: {}",
                wallet_id,
                err.to_string()
            )
        })?;

    wallet
        .remove_controller(sender.clone())
        .call_and_wait(create_waiter())
        .await
        .map_err(|err| {
            anyhow!(
                "Could not remove the controller of wallet canister {}: {}",
                wallet_id,
                err.to_string()
            )
        })?;

    ic00.set_controller(wallet_id, controller)
        .call_and_wait(create_waiter())
        .await
        .map_err(|err| {
            anyhow!(
                "Could not set the controller of wallet {}: {}",
                wallet_id,
                err.to_string()
            )
        })?;
    Ok(())
}

/// Tops up the cycles balance of the wallet.
async fn top_up_wallet(
    ic00: &Canister<'_, ManagementCanister>,
    wallet_id: &Principal,
    cycles: u64,
) -> WalletResult<()> {
    ic00.provisional_top_up_canister(wallet_id, cycles)
        .call_and_wait(create_waiter())
        .await
        .map_err(|err| {
            anyhow!(
                "Could not top up the cycles balance of wallet {}: {}",
                wallet_id,
                err.to_string()
            )
        })?;
    Ok(())
}

fn parse_wallet_id(wallet_id: &str) -> WalletResult<Principal> {
    let principal_id = Principal::from_str(wallet_id).map_err(|err| {
        anyhow!(
            "Invalid wallet id `{}`: {}",
            wallet_id.to_string(),
            err.to_string()
        )
    })?;
    Ok(principal_id)
}

fn parse_wasm(wasm_path: &Path) -> WalletResult<Vec<u8>> {
    let file = File::open(wasm_path)
        .map_err(|_| anyhow!("Unknown path to wasm file {:?}", wasm_path.to_path_buf()))?;

    let mut buf_reader = io::BufReader::new(file);
    let mut contents = Vec::new();
    buf_reader.read_to_end(&mut contents).map_err(|err| {
        anyhow!(
            "Could not read wasm file at `{:?}`: {}",
            wasm_path.to_path_buf(),
            err.to_string()
        )
    })?;

    Ok(contents)
}
