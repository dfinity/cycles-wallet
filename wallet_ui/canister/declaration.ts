import type { Principal } from "@dfinity/agent";
export interface AddressEntry {
  id: Principal;
  kind: Kind;
  name: [] | [string];
  role: Role;
}
export interface Event {
  id: number;
  kind: EventKind;
  timestamp: BigInt;
}
export type EventKind =
  | {
      CyclesReceived: { from: Principal; amount: BigInt };
    }
  | { CanisterCreated: { cycles: BigInt; canister: Principal } }
  | {
      CanisterCalled: {
        cycles: BigInt;
        method_name: string;
        canister: Principal;
      };
    }
  | { CyclesSent: { to: Principal; amount: BigInt } }
  | { AddressRemoved: { id: Principal } }
  | { WalletDeployed: { canister: Principal } }
  | {
      AddressAdded: { id: Principal; name: [] | [string]; role: Role };
    };
export type Kind = { User: null } | { Canister: null } | { Unknown: null };
export type Role =
  | { Custodian: null }
  | { Contact: null }
  | { Controller: null };
export default interface _SERVICE {
  add_address: (arg_0: AddressEntry) => Promise<undefined>;
  add_controller: (arg_0: Principal) => Promise<undefined>;
  authorize: (arg_0: Principal) => Promise<undefined>;
  deauthorize: (arg_0: Principal) => Promise<undefined>;
  get_chart: (
    arg_0: [] | [{ count: [] | [number]; precision: [] | [BigInt] }]
  ) => Promise<Array<[BigInt, BigInt]>>;
  get_controllers: () => Promise<Array<Principal>>;
  get_custodians: () => Promise<Array<Principal>>;
  get_events: (
    arg_0: [] | [{ to: [] | [number]; from: [] | [number] }]
  ) => Promise<Array<Event>>;
  list_addresses: () => Promise<Array<AddressEntry>>;
  name: () => Promise<[] | [string]>;
  remove_address: (arg_0: Principal) => Promise<undefined>;
  remove_controller: (arg_0: Principal) => Promise<undefined>;
  set_name: (arg_0: string) => Promise<undefined>;
  wallet_balance: () => Promise<{ amount: BigInt }>;
  wallet_call: (arg_0: {
    args: Array<number>;
    cycles: BigInt;
    method_name: string;
    canister: Principal;
  }) => Promise<{ return: Array<number> }>;
  wallet_create_canister: (arg_0: {
    controller: [] | [Principal];
    cycles: BigInt;
  }) => Promise<{ canister_id: Principal }>;
  wallet_create_wallet: (arg_0: {
    controller: [] | [Principal];
    cycles: BigInt;
  }) => Promise<{ canister_id: Principal }>;
  wallet_receive: () => Promise<{ accepted: BigInt }>;
  wallet_send: (arg_0: {
    canister: Principal;
    amount: BigInt;
  }) => Promise<undefined>;
  wallet_store_wallet_wasm: (arg_0: {
    wasm_module: Array<number>;
  }) => Promise<undefined>;
}
