import type { Principal } from '@dfinity/principal';
export interface AddressEntry {
  'id' : Principal,
  'kind' : Kind,
  'name' : [] | [string],
  'role' : Role,
}
export interface CanisterSettings {
  'controller' : [] | [Principal],
  'freezing_threshold' : [] | [bigint],
  'controllers' : [] | [Array<Principal>],
  'memory_allocation' : [] | [bigint],
  'compute_allocation' : [] | [bigint],
}
export interface CreateCanisterArgs {
  'cycles' : bigint,
  'settings' : CanisterSettings,
}
export interface Event {
  'id' : number,
  'kind' : EventKind,
  'timestamp' : bigint,
}
export type EventKind = {
    'CyclesReceived' : {
      'from' : Principal,
      'memo' : [] | [string],
      'amount' : bigint,
    }
  } |
  { 'CanisterCreated' : { 'cycles' : bigint, 'canister' : Principal } } |
  {
    'CanisterCalled' : {
      'cycles' : bigint,
      'method_name' : string,
      'canister' : Principal,
    }
  } |
  {
    'CyclesSent' : { 'to' : Principal, 'amount' : bigint, 'refund' : bigint }
  } |
  { 'AddressRemoved' : { 'id' : Principal } } |
  { 'WalletDeployed' : { 'canister' : Principal } } |
  {
    'AddressAdded' : { 'id' : Principal, 'name' : [] | [string], 'role' : Role }
  };
export type HeaderField = [string, string];
export interface HttpRequest {
  'url' : string,
  'method' : string,
  'body' : Array<number>,
  'headers' : Array<HeaderField>,
}
export interface HttpResponse {
  'body' : Array<number>,
  'headers' : Array<HeaderField>,
  'streaming_strategy' : [] | [StreamingStrategy],
  'status_code' : number,
}
export type Kind = { 'User' : null } |
  { 'Canister' : null } |
  { 'Unknown' : null };
export interface ManagedCanisterEvent {
  'id' : number,
  'kind' : ManagedCanisterEventKind,
  'timestamp' : bigint,
}
export type ManagedCanisterEventKind = {
    'CyclesSent' : { 'amount' : bigint, 'refund' : bigint }
  } |
  { 'Created' : { 'cycles' : bigint } } |
  { 'Called' : { 'cycles' : bigint, 'method_name' : string } };
export interface ManagedCanisterInfo {
  'id' : Principal,
  'name' : [] | [string],
  'created_at' : bigint,
}
export interface ReceiveOptions { 'memo' : [] | [string] }
export type Role = { 'Custodian' : null } |
  { 'Contact' : null } |
  { 'Controller' : null };
export interface StreamingCallbackHttpResponse {
  'token' : [] | [Token],
  'body' : Array<number>,
}
export type StreamingStrategy = {
    'Callback' : { 'token' : Token, 'callback' : [Principal, string] }
  };
export type Token = {};
export type WalletResult = { 'Ok' : null } |
  { 'Err' : string };
export type WalletResultCall = { 'Ok' : { 'return' : Array<number> } } |
  { 'Err' : string };
export type WalletResultCreate = { 'Ok' : { 'canister_id' : Principal } } |
  { 'Err' : string };
export interface _SERVICE {
  'add_address' : (arg_0: AddressEntry) => Promise<undefined>,
  'add_controller' : (arg_0: Principal) => Promise<undefined>,
  'authorize' : (arg_0: Principal) => Promise<undefined>,
  'deauthorize' : (arg_0: Principal) => Promise<WalletResult>,
  'get_chart' : (
      arg_0: [] | [{ 'count' : [] | [number], 'precision' : [] | [bigint] }],
    ) => Promise<Array<[bigint, bigint]>>,
  'get_controllers' : () => Promise<Array<Principal>>,
  'get_custodians' : () => Promise<Array<Principal>>,
  'get_events' : (
      arg_0: [] | [{ 'to' : [] | [number], 'from' : [] | [number] }],
    ) => Promise<Array<Event>>,
  'get_managed_canister_events' : (
      arg_0: {
        'to' : [] | [number],
        'from' : [] | [number],
        'canister' : Principal,
      },
    ) => Promise<[] | [Array<ManagedCanisterEvent>]>,
  'http_request' : (arg_0: HttpRequest) => Promise<HttpResponse>,
  'list_addresses' : () => Promise<Array<AddressEntry>>,
  'list_managed_canisters' : (
      arg_0: { 'to' : [] | [number], 'from' : [] | [number] },
    ) => Promise<[Array<ManagedCanisterInfo>, number]>,
  'name' : () => Promise<[] | [string]>,
  'remove_address' : (arg_0: Principal) => Promise<WalletResult>,
  'remove_controller' : (arg_0: Principal) => Promise<WalletResult>,
  'set_name' : (arg_0: string) => Promise<undefined>,
  'set_short_name' : (arg_0: Principal, arg_1: [] | [string]) => Promise<
      [] | [ManagedCanisterInfo]
    >,
  'wallet_api_version' : () => Promise<string>,
  'wallet_balance' : () => Promise<{ 'amount' : bigint }>,
  'wallet_call' : (
      arg_0: {
        'args' : Array<number>,
        'cycles' : bigint,
        'method_name' : string,
        'canister' : Principal,
      },
    ) => Promise<WalletResultCall>,
  'wallet_create_canister' : (arg_0: CreateCanisterArgs) => Promise<
      WalletResultCreate
    >,
  'wallet_create_wallet' : (arg_0: CreateCanisterArgs) => Promise<
      WalletResultCreate
    >,
  'wallet_receive' : (arg_0: [] | [ReceiveOptions]) => Promise<undefined>,
  'wallet_send' : (
      arg_0: { 'canister' : Principal, 'amount' : bigint },
    ) => Promise<WalletResult>,
  'wallet_store_wallet_wasm' : (
      arg_0: { 'wasm_module' : Array<number> },
    ) => Promise<undefined>,
}
