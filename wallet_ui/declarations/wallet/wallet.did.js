export const idlFactory = ({ IDL }) => {
  const Kind = IDL.Variant({
    User: IDL.Null,
    Canister: IDL.Null,
    Unknown: IDL.Null,
  });
  const Role = IDL.Variant({
    Custodian: IDL.Null,
    Contact: IDL.Null,
    Controller: IDL.Null,
  });
  const AddressEntry = IDL.Record({
    id: IDL.Principal,
    kind: Kind,
    name: IDL.Opt(IDL.Text),
    role: Role,
  });
  const WalletResult = IDL.Variant({ Ok: IDL.Null, Err: IDL.Text });
  const EventKind = IDL.Variant({
    CyclesReceived: IDL.Record({
      from: IDL.Principal,
      memo: IDL.Opt(IDL.Text),
      amount: IDL.Nat64,
    }),
    CanisterCreated: IDL.Record({
      cycles: IDL.Nat64,
      canister: IDL.Principal,
    }),
    CanisterCalled: IDL.Record({
      cycles: IDL.Nat64,
      method_name: IDL.Text,
      canister: IDL.Principal,
    }),
    CyclesSent: IDL.Record({
      to: IDL.Principal,
      amount: IDL.Nat64,
      refund: IDL.Nat64,
    }),
    AddressRemoved: IDL.Record({ id: IDL.Principal }),
    WalletDeployed: IDL.Record({ canister: IDL.Principal }),
    AddressAdded: IDL.Record({
      id: IDL.Principal,
      name: IDL.Opt(IDL.Text),
      role: Role,
    }),
  });
  const Event = IDL.Record({
    id: IDL.Nat32,
    kind: EventKind,
    timestamp: IDL.Nat64,
  });
  const EventKind128 = IDL.Variant({
    CyclesReceived: IDL.Record({
      from: IDL.Principal,
      memo: IDL.Opt(IDL.Text),
      amount: IDL.Nat,
    }),
    CanisterCreated: IDL.Record({
      cycles: IDL.Nat,
      canister: IDL.Principal,
    }),
    CanisterCalled: IDL.Record({
      cycles: IDL.Nat,
      method_name: IDL.Text,
      canister: IDL.Principal,
    }),
    CyclesSent: IDL.Record({
      to: IDL.Principal,
      amount: IDL.Nat,
      refund: IDL.Nat,
    }),
    AddressRemoved: IDL.Record({ id: IDL.Principal }),
    WalletDeployed: IDL.Record({ canister: IDL.Principal }),
    AddressAdded: IDL.Record({
      id: IDL.Principal,
      name: IDL.Opt(IDL.Text),
      role: Role,
    }),
  });
  const Event128 = IDL.Record({
    id: IDL.Nat32,
    kind: EventKind128,
    timestamp: IDL.Nat64,
  });
  const ManagedCanisterEventKind = IDL.Variant({
    CyclesSent: IDL.Record({ amount: IDL.Nat64, refund: IDL.Nat64 }),
    Created: IDL.Record({ cycles: IDL.Nat64 }),
    Called: IDL.Record({ cycles: IDL.Nat64, method_name: IDL.Text }),
  });
  const ManagedCanisterEvent = IDL.Record({
    id: IDL.Nat32,
    kind: ManagedCanisterEventKind,
    timestamp: IDL.Nat64,
  });
  const ManagedCanisterEventKind128 = IDL.Variant({
    CyclesSent: IDL.Record({ amount: IDL.Nat, refund: IDL.Nat }),
    Created: IDL.Record({ cycles: IDL.Nat }),
    Called: IDL.Record({ cycles: IDL.Nat, method_name: IDL.Text }),
  });
  const ManagedCanisterEvent128 = IDL.Record({
    id: IDL.Nat32,
    kind: ManagedCanisterEventKind128,
    timestamp: IDL.Nat64,
  });
  const HeaderField = IDL.Tuple(IDL.Text, IDL.Text);
  const HttpRequest = IDL.Record({
    url: IDL.Text,
    method: IDL.Text,
    body: IDL.Vec(IDL.Nat8),
    headers: IDL.Vec(HeaderField),
  });
  const Token = IDL.Record({});
  const StreamingCallbackHttpResponse = IDL.Record({
    token: IDL.Opt(Token),
    body: IDL.Vec(IDL.Nat8),
  });
  const StreamingStrategy = IDL.Variant({
    Callback: IDL.Record({
      token: Token,
      callback: IDL.Func([Token], [StreamingCallbackHttpResponse], []),
    }),
  });
  const HttpResponse = IDL.Record({
    body: IDL.Vec(IDL.Nat8),
    headers: IDL.Vec(HeaderField),
    streaming_strategy: IDL.Opt(StreamingStrategy),
    status_code: IDL.Nat16,
  });
  const ManagedCanisterInfo = IDL.Record({
    id: IDL.Principal,
    name: IDL.Opt(IDL.Text),
    created_at: IDL.Nat64,
  });
  const WalletResultCall = IDL.Variant({
    Ok: IDL.Record({ return: IDL.Vec(IDL.Nat8) }),
    Err: IDL.Text,
  });
  const CanisterSettings = IDL.Record({
    controller: IDL.Opt(IDL.Principal),
    freezing_threshold: IDL.Opt(IDL.Nat),
    controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
    memory_allocation: IDL.Opt(IDL.Nat),
    compute_allocation: IDL.Opt(IDL.Nat),
  });
  const CreateCanisterArgs = IDL.Record({
    cycles: IDL.Nat64,
    settings: CanisterSettings,
  });
  const WalletResultCreate = IDL.Variant({
    Ok: IDL.Record({ canister_id: IDL.Principal }),
    Err: IDL.Text,
  });
  const CreateCanisterArgs128 = IDL.Record({
    cycles: IDL.Nat,
    settings: CanisterSettings,
  });
  const ReceiveOptions = IDL.Record({ memo: IDL.Opt(IDL.Text) });
  return IDL.Service({
    add_address: IDL.Func([AddressEntry], [], []),
    add_controller: IDL.Func([IDL.Principal], [], []),
    authorize: IDL.Func([IDL.Principal], [], []),
    deauthorize: IDL.Func([IDL.Principal], [WalletResult], []),
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
      []
    ),
    get_controllers: IDL.Func([], [IDL.Vec(IDL.Principal)], []),
    get_custodians: IDL.Func([], [IDL.Vec(IDL.Principal)], []),
    get_events: IDL.Func(
      [
        IDL.Opt(
          IDL.Record({
            to: IDL.Opt(IDL.Nat32),
            from: IDL.Opt(IDL.Nat32),
          })
        ),
      ],
      [IDL.Vec(Event)],
      []
    ),
    get_events128: IDL.Func(
      [
        IDL.Opt(
          IDL.Record({
            to: IDL.Opt(IDL.Nat32),
            from: IDL.Opt(IDL.Nat32),
          })
        ),
      ],
      [IDL.Vec(Event128)],
      []
    ),
    get_managed_canister_events: IDL.Func(
      [
        IDL.Record({
          to: IDL.Opt(IDL.Nat32),
          from: IDL.Opt(IDL.Nat32),
          canister: IDL.Principal,
        }),
      ],
      [IDL.Opt(IDL.Vec(ManagedCanisterEvent))],
      []
    ),
    get_managed_canister_events128: IDL.Func(
      [
        IDL.Record({
          to: IDL.Opt(IDL.Nat32),
          from: IDL.Opt(IDL.Nat32),
          canister: IDL.Principal,
        }),
      ],
      [IDL.Opt(IDL.Vec(ManagedCanisterEvent128))],
      []
    ),
    http_request: IDL.Func([HttpRequest], [HttpResponse], []),
    list_addresses: IDL.Func([], [IDL.Vec(AddressEntry)], []),
    list_managed_canisters: IDL.Func(
      [
        IDL.Record({
          to: IDL.Opt(IDL.Nat32),
          from: IDL.Opt(IDL.Nat32),
        }),
      ],
      [IDL.Vec(ManagedCanisterInfo), IDL.Nat32],
      []
    ),
    name: IDL.Func([], [IDL.Opt(IDL.Text)], []),
    remove_address: IDL.Func([IDL.Principal], [WalletResult], []),
    remove_controller: IDL.Func([IDL.Principal], [WalletResult], []),
    set_name: IDL.Func([IDL.Text], [], []),
    set_short_name: IDL.Func(
      [IDL.Principal, IDL.Opt(IDL.Text)],
      [IDL.Opt(ManagedCanisterInfo)],
      []
    ),
    wallet_api_version: IDL.Func([], [IDL.Text], []),
    wallet_balance: IDL.Func([], [IDL.Record({ amount: IDL.Nat64 })], []),
    wallet_balance128: IDL.Func([], [IDL.Record({ amount: IDL.Nat })], []),
    wallet_call: IDL.Func(
      [
        IDL.Record({
          args: IDL.Vec(IDL.Nat8),
          cycles: IDL.Nat64,
          method_name: IDL.Text,
          canister: IDL.Principal,
        }),
      ],
      [WalletResultCall],
      []
    ),
    wallet_call128: IDL.Func(
      [
        IDL.Record({
          args: IDL.Vec(IDL.Nat8),
          cycles: IDL.Nat,
          method_name: IDL.Text,
          canister: IDL.Principal,
        }),
      ],
      [WalletResultCall],
      []
    ),
    wallet_create_canister: IDL.Func(
      [CreateCanisterArgs],
      [WalletResultCreate],
      []
    ),
    wallet_create_canister128: IDL.Func(
      [CreateCanisterArgs128],
      [WalletResultCreate],
      []
    ),
    wallet_create_wallet: IDL.Func(
      [CreateCanisterArgs],
      [WalletResultCreate],
      []
    ),
    wallet_create_wallet128: IDL.Func(
      [CreateCanisterArgs128],
      [WalletResultCreate],
      []
    ),
    wallet_receive: IDL.Func([IDL.Opt(ReceiveOptions)], [], []),
    wallet_send: IDL.Func(
      [IDL.Record({ canister: IDL.Principal, amount: IDL.Nat64 })],
      [WalletResult],
      []
    ),
    wallet_send128: IDL.Func(
      [IDL.Record({ canister: IDL.Principal, amount: IDL.Nat })],
      [WalletResult],
      []
    ),
    wallet_store_wallet_wasm: IDL.Func(
      [IDL.Record({ wasm_module: IDL.Vec(IDL.Nat8) })],
      [],
      []
    ),
  });
};
export const init = ({ IDL }) => {
  return [];
};
