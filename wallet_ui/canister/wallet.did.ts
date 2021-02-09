// This file was generated using did-to-js tools, with some modifications.
// It is essentially hand written.
import type { IDL, Principal } from "@dfinity/agent";
import BigNumber from "bignumber.js";

export interface Role {
  Contact?: null;
  Custodian?: null;
  Controller?: null;
}
export interface Kind {
  Unknown?: null;
  User?: null;
  Canister?: null;
}
export interface AddressEntry {
  id: Principal;
  name: [string] | [];
  kind: Kind;
  role: Role;
}
export interface EventKind {
  CyclesSent?: { to: Principal; amount: BigNumber };
  CyclesReceived?: { from: Principal; amount: BigNumber };
  AddressAdded?: AddressEntry;
  AddressRemoved?: { id: Principal };
  CanisterCreated?: { canister: Principal; cycles: BigNumber };
  CanisterCalled?: {
    method_name: string;
    canister: Principal;
    cycles: BigNumber;
  };
}

export interface Event {
  id: number;
  kind: EventKind;
  timestamp: Date;
}

export function convertIdlEventMap(idlEvent: any): Event {
  return {
    id: idlEvent.id,
    timestamp: new Date(idlEvent.timestamp.div(1000000).toNumber()),
    kind: idlEvent.kind,
  };
}

export const factory: IDL.InterfaceFactory = ({ IDL }) => {
  const Role = IDL.Variant({
    Contact: IDL.Null,
    Custodian: IDL.Null,
    Controller: IDL.Null,
  });
  const EventKind = IDL.Variant({
    CyclesSent: IDL.Record({ to: IDL.Principal, amount: IDL.Nat64 }),
    CyclesReceived: IDL.Record({
      from: IDL.Principal,
      amount: IDL.Nat64,
    }),
    AddressAdded: IDL.Record({
      id: IDL.Principal,
      name: IDL.Opt(IDL.Text),
      role: Role,
    }),
    AddressRemoved: IDL.Record({
      id: IDL.Principal,
    }),
    CanisterCreated: IDL.Record({ canister: IDL.Principal, cycles: IDL.Nat64 }),
    CanisterCalled: IDL.Record({
      method_name: IDL.Text,
      canister: IDL.Principal,
    }),
  });
  const Event = IDL.Record({
    id: IDL.Nat32,
    kind: EventKind,
    timestamp: IDL.Nat64,
  });
  const AddressEntry = IDL.Record({
    id: IDL.Principal,
    name: IDL.Opt(IDL.Text),
    role: Role,
  });
  return IDL.Service({
    name: IDL.Func([], [IDL.Opt(IDL.Text)], ["query"]),
    wallet_create_canister: IDL.Func(
      [
        IDL.Record({
          controller: IDL.Opt(IDL.Principal),
          cycles: IDL.Nat64,
        }),
      ],
      [IDL.Record({ canister_id: IDL.Principal })],
      []
    ),
    get_controller: IDL.Func([], [IDL.Principal], ["query"]),
    set_controller: IDL.Func([IDL.Principal], [], []),
    wallet_call: IDL.Func(
      [
        IDL.Record({
          args: IDL.Vec(IDL.Nat8),
          cycles: IDL.Nat64,
          method_name: IDL.Text,
          canister: IDL.Principal,
        }),
      ],
      [IDL.Record({ return: IDL.Vec(IDL.Nat8) })],
      []
    ),
    wallet_send: IDL.Func(
      [IDL.Record({ canister: IDL.Principal, amount: IDL.Nat64 })],
      [],
      []
    ),
    authorize: IDL.Func([IDL.Principal], [], []),
    wallet_balance: IDL.Func(
      [],
      [IDL.Record({ amount: IDL.Nat64 })],
      ["query"]
    ),
    wallet_receive: IDL.Func([], [IDL.Record({ accepted: IDL.Nat64 })], []),
    deauthorize: IDL.Func([IDL.Principal], [], []),
    get_custodians: IDL.Func([], [IDL.Vec(IDL.Principal)], ["query"]),

    add_address: IDL.Func([AddressEntry], [], []),
    list_addresses: IDL.Func([], [IDL.Vec(AddressEntry)], ["query"]),
    remove_address: IDL.Func([IDL.Principal], [], []),

    get_events: IDL.Func(
      [
        IDL.Opt(
          IDL.Record({ from: IDL.Opt(IDL.Nat32), to: IDL.Opt(IDL.Nat32) })
        ),
      ],
      [IDL.Vec(Event)],
      ["query"]
    ),
    get_chart: IDL.Func(
      [
        IDL.Opt(
          IDL.Record({
            count: IDL.Opt(IDL.Nat32),
            precision: IDL.Opt(IDL.Nat64),
          })
        ),
      ],
      [IDL.Vec(IDL.Tuple(IDL.Nat64, IDL.Nat64))],
      ["query"]
    ),
  });
};
