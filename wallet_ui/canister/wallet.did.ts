// This file was generated using did-to-js tools, with some modifications.
// It is essentially hand written.
import { IDL } from '@dfinity/agent';

export const factory: IDL.InterfaceFactory = ({ IDL }) => {
  const EventKind = IDL.Variant({
    'CyclesReceived' : IDL.Record({
      'from' : IDL.Principal,
      'amount' : IDL.Nat64,
    }),
    'CustodianRemoved' : IDL.Record({ 'custodian' : IDL.Principal }),
    'CanisterCreated' : IDL.Record({ 'canister' : IDL.Principal }),
    'CustodianAdded' : IDL.Record({ 'custodian' : IDL.Principal }),
    'CanisterCalled' : IDL.Record({
      'method_name' : IDL.Text,
      'canister' : IDL.Principal,
    }),
    'CyclesSent' : IDL.Record({ 'to' : IDL.Principal, 'amount' : IDL.Nat64 }),
  });
  const event = IDL.Record({
    'id' : IDL.Nat32,
    'kind' : EventKind,
    'timestamp' : IDL.Nat64,
  });
  return IDL.Service({
    'wallet_create_canister' : IDL.Func(
      [
        IDL.Record({
          'controller' : IDL.Opt(IDL.Principal),
          'cycles' : IDL.Nat64,
        }),
      ],
      [IDL.Record({ 'canister_id' : IDL.Principal })],
      [],
    ),
    'get_controller' : IDL.Func([], [IDL.Principal], ['query']),
    'get_events' : IDL.Func([], [IDL.Vec(event)], ['query']),
    'set_controller' : IDL.Func([IDL.Principal], [], []),
    'wallet_call' : IDL.Func(
      [
        IDL.Record({
          'args' : IDL.Vec(IDL.Nat8),
          'cycles' : IDL.Nat64,
          'method_name' : IDL.Text,
          'canister' : IDL.Principal,
        }),
      ],
      [IDL.Record({ 'return' : IDL.Vec(IDL.Nat8) })],
      [],
    ),
    'wallet_send' : IDL.Func(
      [IDL.Record({ 'canister' : IDL.Principal, 'amount' : IDL.Nat64 })],
      [],
      [],
    ),
    'authorize' : IDL.Func([IDL.Principal], [], []),
    'wallet_balance' : IDL.Func(
      [],
      [IDL.Record({ 'amount' : IDL.Nat64 })],
      ['query'],
    ),
    'wallet_receive' : IDL.Func(
      [],
      [IDL.Record({ 'accepted' : IDL.Nat64 })],
      [],
    ),
    'deauthorize' : IDL.Func([IDL.Principal], [], []),
    'get_custodians' : IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
  });
};
