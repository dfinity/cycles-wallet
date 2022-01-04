#!/usr/bin/env bats

# shellcheck source=/dev/null
source "$BATS_SUPPORT/load.bash"

load util/assertions

setup() {
    # We want to work from a temporary directory, different for every test.
    x=$(mktemp -d -t dfx-usage-env-home-XXXXXXXX)
    cd "$x" || exit
    export DFX_CONFIG_ROOT=$x
    export DFX_VERSION=0.8.4

    dfx new --no-frontend e2e_project
    cd e2e_project || exit 1
    dfx start --background
}

teardown() {
    dfx stop
    rm -rf "$DFX_CONFIG_ROOT"
}

@test "upgrading to new wallet version correctly migrates data" {
    (
        unset -v DFX_WALLET_WASM
        assert_command dfx deploy --with-cycles 1000000000 e2e_project
        WALLET=$(dfx identity get-wallet)
        CANISTER=$(dfx canister id e2e_project)
        assert_command_fail dfx canister --no-wallet call "$WALLET" get_managed_canister_events "(record { canister = principal \"$CANISTER\" })"
        assert_command dfx canister --no-wallet call "$WALLET" get_events '(null)'
        # CanisterCreated = 1205528161; cycles = 2190693645; canister = 2631180839
        assert_match "1_205_528_161 = record \\{[[:space:]]+2_190_693_645 = 1_000_000_000 : nat64;[[:space:]]+2_631_180_839 = principal \"$CANISTER\""
    )
    # ^ reset DFX_WALLET_WASM
    assert_command [ -n "$DFX_WALLET_WASM" ]
    assert_command dfx canister info "$(dfx identity get-wallet)"
    assert_match "Module hash: 0x([0-9a-f]+)"
    HASH=${BASH_REMATCH[1]}
    assert_command [ -n "$HASH" ]
    assert_command dfx wallet upgrade
    assert_command dfx canister info "$(dfx identity get-wallet)"
    assert_not_match "$HASH"
    WALLET=$(dfx identity get-wallet)
    CANISTER=$(dfx canister id e2e_project)
    assert_command dfx canister --no-wallet call "$WALLET" get_events '(null)'
    # CanisterCreated = 1205528161; cycles = 2190693645; canister = 2631180839
    assert_match "1_205_528_161 = record \\{[[:space:]]+2_190_693_645 = 1_000_000_000 : nat64;[[:space:]]+2_631_180_839 = principal \"$CANISTER\""
    assert_command dfx canister --no-wallet call "$WALLET" get_managed_canister_events "(record { canister = principal \"$CANISTER\" })"
    # Created = 3736853960; cycles = 2190693645
    assert_match "3_736_853_960 = record \\{[[:space:]]+2_190_693_645 = 1_000_000_000 : nat64"
}
