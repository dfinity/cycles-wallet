import type { Principal } from '@dfinity/agent';
export interface AddressEntry {
  'id' : Principal,
  'kind' : Kind,
  'name' : [] | [string],
  'role' : Role,
};
export interface CanisterSettings {
  'controller' : [] | Principal[],
  'controllers' : [] | Principal[],
  'freezing_threshold' : [] | [bigint],
  'memory_allocation' : [] | [bigint],
  'compute_allocation' : [] | [bigint],
};
export interface CreateCanisterArgs {
  'cycles' : bigint,
  'settings' : CanisterSettings,
};
export interface Event {
  'id' : number,
  'kind' : EventKind,
  'timestamp' : bigint,
};
export type EventKind = {
    'CyclesReceived' : { 'from' : Principal, 'amount' : bigint }
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
export type Kind = { 'User' : null } |
  { 'Canister' : null } |
  { 'Unknown' : null };
export type ResultCall = { 'Ok' : { 'return' : Array<number> } } |
  { 'Err' : string };
export type ResultCreate = { 'Ok' : { 'canister_id' : Principal } } |
  { 'Err' : string };
export type ResultSend = { 'Ok' : null } |
  { 'Err' : string };
export type Role = { 'Custodian' : null } |
  { 'Contact' : null } |
  { 'Controller' : null };
export default interface _SERVICE {
  'add_address' : (arg_0: AddressEntry) => Promise<undefined>,
  'add_controller' : (arg_0: Principal) => Promise<undefined>,
  'authorize' : (arg_0: Principal) => Promise<undefined>,
  'deauthorize' : (arg_0: Principal) => Promise<undefined>,
  'get_chart' : (
      arg_0: [] | [{ 'count' : [] | [number], 'precision' : [] | [bigint] }],
    ) => Promise<Array<[bigint, bigint]>>,
  'get_controllers' : () => Promise<Array<Principal>>,
  'get_custodians' : () => Promise<Array<Principal>>,
  'get_events' : (
      arg_0: [] | [{ 'to' : [] | [number], 'from' : [] | [number] }],
    ) => Promise<Array<Event>>,
  'list_addresses' : () => Promise<Array<AddressEntry>>,
  'name' : () => Promise<[] | [string]>,
  'remove_address' : (arg_0: Principal) => Promise<undefined>,
  'remove_controller' : (arg_0: Principal) => Promise<undefined>,
  'set_name' : (arg_0: string) => Promise<undefined>,
  'wallet_balance' : () => Promise<{ 'amount' : bigint }>,
  'wallet_call' : (
      arg_0: {
        'args' : Array<number>,
        'cycles' : bigint,
        'method_name' : string,
        'canister' : Principal,
      },
    ) => Promise<ResultCall>,
  'wallet_create_canister' : (arg_0: CreateCanisterArgs) => Promise<
      ResultCreate
    >,
  'wallet_create_wallet' : (arg_0: CreateCanisterArgs) => Promise<ResultCreate>,
  'wallet_receive' : () => Promise<undefined>,
  'wallet_send' : (
      arg_0: { 'canister' : Principal, 'amount' : bigint },
    ) => Promise<ResultSend>,
  'wallet_store_wallet_wasm' : (
      arg_0: { 'wasm_module' : Array<number> },
    ) => Promise<undefined>,
};
