import type { Principal } from "@dfinity/principal";
import type { ActorMethod } from "@dfinity/agent";

export interface AddressEntry {
  id: Principal;
  kind: Kind;
  name: [] | [string];
  role: Role;
}
export interface CanisterSettings {
  controller: [] | [Principal];
  freezing_threshold: [] | [bigint];
  controllers: [] | [Array<Principal>];
  memory_allocation: [] | [bigint];
  compute_allocation: [] | [bigint];
}
export interface CreateCanisterArgs {
  cycles: bigint;
  settings: CanisterSettings;
}
export interface CreateCanisterArgs128 {
  cycles: bigint;
  settings: CanisterSettings;
}
export interface Event {
  id: number;
  kind: EventKind;
  timestamp: bigint;
}
export interface Event128 {
  id: number;
  kind: EventKind128;
  timestamp: bigint;
}
export type EventKind =
  | {
      CyclesReceived: {
        from: Principal;
        memo: [] | [string];
        amount: bigint;
      };
    }
  | { CanisterCreated: { cycles: bigint; canister: Principal } }
  | {
      CanisterCalled: {
        cycles: bigint;
        method_name: string;
        canister: Principal;
      };
    }
  | {
      CyclesSent: { to: Principal; amount: bigint; refund: bigint };
    }
  | { AddressRemoved: { id: Principal } }
  | { WalletDeployed: { canister: Principal } }
  | {
      AddressAdded: { id: Principal; name: [] | [string]; role: Role };
    };
export type EventKind128 =
  | {
      CyclesReceived: {
        from: Principal;
        memo: [] | [string];
        amount: bigint;
      };
    }
  | { CanisterCreated: { cycles: bigint; canister: Principal } }
  | {
      CanisterCalled: {
        cycles: bigint;
        method_name: string;
        canister: Principal;
      };
    }
  | {
      CyclesSent: { to: Principal; amount: bigint; refund: bigint };
    }
  | { AddressRemoved: { id: Principal } }
  | { WalletDeployed: { canister: Principal } }
  | {
      AddressAdded: { id: Principal; name: [] | [string]; role: Role };
    };
export type HeaderField = [string, string];
export interface HttpRequest {
  url: string;
  method: string;
  body: Array<number>;
  headers: Array<HeaderField>;
}
export interface HttpResponse {
  body: Array<number>;
  headers: Array<HeaderField>;
  streaming_strategy: [] | [StreamingStrategy];
  status_code: number;
}
export type Kind = { User: null } | { Canister: null } | { Unknown: null };
export interface ManagedCanisterEvent {
  id: number;
  kind: ManagedCanisterEventKind;
  timestamp: bigint;
}
export interface ManagedCanisterEvent128 {
  id: number;
  kind: ManagedCanisterEventKind128;
  timestamp: bigint;
}
export type ManagedCanisterEventKind =
  | {
      CyclesSent: { amount: bigint; refund: bigint };
    }
  | { Created: { cycles: bigint } }
  | { Called: { cycles: bigint; method_name: string } };
export type ManagedCanisterEventKind128 =
  | {
      CyclesSent: { amount: bigint; refund: bigint };
    }
  | { Created: { cycles: bigint } }
  | { Called: { cycles: bigint; method_name: string } };
export interface ManagedCanisterInfo {
  id: Principal;
  name: [] | [string];
  created_at: bigint;
}
export interface ReceiveOptions {
  memo: [] | [string];
}
export type Role =
  | { Custodian: null }
  | { Contact: null }
  | { Controller: null };
export interface StreamingCallbackHttpResponse {
  token: [] | [Token];
  body: Array<number>;
}
export type StreamingStrategy = {
  Callback: { token: Token; callback: [Principal, string] };
};
export type Token = {};
export type WalletResult = { Ok: null } | { Err: string };
export type WalletResultCall =
  | { Ok: { return: Array<number> } }
  | { Err: string };
export type WalletResultCreate =
  | { Ok: { canister_id: Principal } }
  | { Err: string };
export interface _SERVICE {
  add_address: ActorMethod<[AddressEntry], undefined>;
  add_controller: ActorMethod<[Principal], undefined>;
  authorize: ActorMethod<[Principal], undefined>;
  deauthorize: ActorMethod<[Principal], WalletResult>;
  get_chart: ActorMethod<
    [[] | [{ count: [] | [number]; precision: [] | [bigint] }]],
    Array<[bigint, bigint]>
  >;
  get_controllers: ActorMethod<[], Array<Principal>>;
  get_custodians: ActorMethod<[], Array<Principal>>;
  get_events: ActorMethod<
    [[] | [{ to: [] | [number]; from: [] | [number] }]],
    Array<Event>
  >;
  get_events128: ActorMethod<
    [[] | [{ to: [] | [number]; from: [] | [number] }]],
    Array<Event128>
  >;
  get_managed_canister_events: ActorMethod<
    [{ to: [] | [number]; from: [] | [number]; canister: Principal }],
    [] | [Array<ManagedCanisterEvent>]
  >;
  get_managed_canister_events128: ActorMethod<
    [{ to: [] | [number]; from: [] | [number]; canister: Principal }],
    [] | [Array<ManagedCanisterEvent128>]
  >;
  http_request: ActorMethod<[HttpRequest], HttpResponse>;
  list_addresses: ActorMethod<[], Array<AddressEntry>>;
  list_managed_canisters: ActorMethod<
    [{ to: [] | [number]; from: [] | [number] }],
    [Array<ManagedCanisterInfo>, number]
  >;
  name: ActorMethod<[], [] | [string]>;
  remove_address: ActorMethod<[Principal], WalletResult>;
  remove_controller: ActorMethod<[Principal], WalletResult>;
  set_name: ActorMethod<[string], undefined>;
  set_short_name: ActorMethod<
    [Principal, [] | [string]],
    [] | [ManagedCanisterInfo]
  >;
  wallet_api_version: ActorMethod<[], string>;
  wallet_balance: ActorMethod<[], { amount: bigint }>;
  wallet_balance128: ActorMethod<[], { amount: bigint }>;
  wallet_call: ActorMethod<
    [
      {
        args: Array<number>;
        cycles: bigint;
        method_name: string;
        canister: Principal;
      }
    ],
    WalletResultCall
  >;
  wallet_call128: ActorMethod<
    [
      {
        args: Array<number>;
        cycles: bigint;
        method_name: string;
        canister: Principal;
      }
    ],
    WalletResultCall
  >;
  wallet_create_canister: ActorMethod<[CreateCanisterArgs], WalletResultCreate>;
  wallet_create_canister128: ActorMethod<
    [CreateCanisterArgs128],
    WalletResultCreate
  >;
  wallet_create_wallet: ActorMethod<[CreateCanisterArgs], WalletResultCreate>;
  wallet_create_wallet128: ActorMethod<
    [CreateCanisterArgs128],
    WalletResultCreate
  >;
  wallet_receive: ActorMethod<[[] | [ReceiveOptions]], undefined>;
  wallet_send: ActorMethod<
    [{ canister: Principal; amount: bigint }],
    WalletResult
  >;
  wallet_send128: ActorMethod<
    [{ canister: Principal; amount: bigint }],
    WalletResult
  >;
  wallet_store_wallet_wasm: ActorMethod<
    [{ wasm_module: Array<number> }],
    undefined
  >;
}
