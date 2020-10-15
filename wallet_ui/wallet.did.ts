// tslint:disable
import { IDL } from '@dfinity/agent';

const walletIdl: IDL.InterfaceFactory = ({ IDL }) => {
  const device = IDL.Record({
    'id' : IDL.Text,
    'public_key' : IDL.Text,
    'name' : IDL.Text,
  });
  const Unit = IDL.Vec(IDL.Nat8);
  const EventKind = IDL.Variant({
    'CustodianRemoved' : IDL.Record({ 'custodian' : IDL.Principal }),
    'UnitReceived' : IDL.Record({
      'from' : IDL.Principal,
      'unit' : Unit,
      'amount' : IDL.Nat64,
    }),
    'CustodianAdded' : IDL.Record({ 'custodian' : IDL.Principal }),
    'UnitSent' : IDL.Record({
      'to' : IDL.Principal,
      'unit' : Unit,
      'amount' : IDL.Nat64,
    }),
  });
  const event = IDL.Record({
    'id' : IDL.Nat32,
    'kind' : EventKind,
    'timestamp' : IDL.Nat64,
  });
  const __init = [];
  return IDL.Service({
    'receive_cycles' : IDL.Func([], [], []),
    'send_icpt' : IDL.Func([IDL.Principal, IDL.Nat64], [], []),
    'call' : IDL.Func(
        [IDL.Principal, IDL.Text, IDL.Vec(IDL.Nat8), IDL.Nat64],
        [IDL.Vec(IDL.Nat8)],
        [],
      ),
    'get_devices' : IDL.Func([], [IDL.Vec(device)], ['query']),
    'get_controller' : IDL.Func([], [IDL.Principal], ['query']),
    'get_events' : IDL.Func([], [IDL.Vec(event)], ['query']),
    'cycle_balance' : IDL.Func([], [IDL.Nat64], ['query']),
    'set_controller' : IDL.Func([IDL.Principal], [], []),
    'send_cycles' : IDL.Func([IDL.Principal, IDL.Nat64], [], []),

    'wallet_balance' : IDL.Func([Unit], [IDL.Nat64], ['query']),
    'wallet_send' : IDL.Func([IDL.Principal, Unit, IDL.Nat64], [], []),

    'authorize' : IDL.Func([IDL.Principal], [], []),
    'deauthorize' : IDL.Func([IDL.Principal], [], []),
    'register' : IDL.Func([IDL.Text, IDL.Text, IDL.Text], [], []),
    'get_custodians' : IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
  });
};

export default walletIdl;
