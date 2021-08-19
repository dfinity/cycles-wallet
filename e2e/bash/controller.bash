#!/usr/bin/env bats

# shellcheck disable=SC1090
source "$BATS_SUPPORT"/load.bash

load util/assertions

setup() {
    # We want to work from a temporary directory, different for every test.
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


@test "canister creation sets controller to the wallet" {
    assert_command dfx identity new alice
    assert_command dfx identity use alice

    ALICE_WALLET=$(dfx --identity alice identity get-wallet)

    dfx --identity alice canister create --all

    assert_command dfx --identity alice canister status e2e_project
    assert_match "Controller: $ALICE_WALLET"

    assert_command dfx --identity alice canister info e2e_project
    assert_match "Controller: $ALICE_WALLET"
}