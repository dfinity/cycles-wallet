#!/usr/bin/env bats

# shellcheck source=/dev/null
source "$BATS_SUPPORT/load.bash"
load util/assertions

setup() {
    x=$(mktemp -d -t dfx-usage-env-home-XXXXXXXX)
    cd "$x" || exit
    export DFX_CONFIG_ROOT=$x

    dfx new --no-frontend e2e_project
    cd e2e_project || exit 1
    dfx start --background
}

teardown() {
    dfx stop
    rm -rf "$DFX_CONFIG_ROOT"
}

@test "canister events are recorded correctly" {
    WALLET=$(dfx identity get-wallet)
    assert_command dfx deploy e2e_project
    CANISTER=$(dfx canister id e2e_project)
    # guaranteed to fail, but still reports the event
    assert_command dfx canister --no-wallet call "$WALLET" wallet_send "(record { canister = principal \"$CANISTER\"; amount = 1000000000:nat64 })"
    # 4449444c0001710d6379636c65735f77616c6c6574 = ("cycles_wallet")
    assert_command dfx canister --no-wallet call "$WALLET" wallet_call "(record { canister = principal \"$CANISTER\"; cycles = 0:nat64; method_name = \"greet\"; args = vec { 0x44;0x49;0x44;0x4c;0x00;0x01;0x71;0x0d;0x63;0x79;0x63;0x6c;0x65;0x73;0x5f;0x77;0x61;0x6c;0x6c;0x65;0x74; }:blob})"
    assert_command dfx canister --no-wallet call "$WALLET" list_managed_canisters '(record {})'
    assert_match "23_515 = principal \"$CANISTER\";"
    assert_command dfx canister --no-wallet call "$WALLET" get_managed_canister_events "(record { canister = principal \"$CANISTER\" })"
    # CyclesSent=2171739429; Called=3950823581; Cretaed=3736853960
    assert_match '3_736_853_960.*2_171_739_429.*3_950_823_581'
}
