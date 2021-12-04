#!/usr/bin/env bash
set -ex

setup() {
    # We want to work from a temporary directory, different for every test.
    x=$(mktemp -d -t dfx-usage-env-home-XXXXXXXX)
    cd "$x" || exit
    export DFX_CONFIG_ROOT=$x

    dfx new --no-frontend e2e_project
    cd e2e_project || exit 1
    dfx start --background
}

setup
    # invokes:
    #  - wallet_create_canister

    dfx identity new alice
    dfx identity new bob

    dfx identity use alice

    ALICE_WALLET=$(dfx --identity alice identity get-wallet)
    ALICE_ID=$(dfx --identity alice identity get-principal)
    BOB_WALLET=$(dfx --identity bob identity get-wallet)
    BOB_ID=$(dfx --identity bob identity get-principal)

    dfx deploy e2e_project

    dfx --identity alice canister status e2e_project
    # assert_match "Controllers: ($ALICE_WALLET $ALICE_ID|$ALICE_ID $ALICE_WALLET)"

    # Set controller using canister name and identity name
    # Surprise: This doesn't actually call update_settings in the wallet
    # canister.  It calls wallet_call on the wallet canister, which
    # forwards to update_settings on the management canister.
    dfx canister update-settings e2e_project --controller "${BOB_WALLET}"
    # assert_match "Set controller of \"e2e_project\" to: ${BOB_WALLET}"

    dfx --identity bob canister status e2e_project
    # assert_match "Controllers: $BOB_WALLET"

    # Bob is controller, Alice cannot reinstall
    (echo yes | dfx canister install e2e_project -m reinstall) && exit 1

    # Bob can reinstall
    echo yes | dfx --identity bob canister install e2e_project -m reinstall
    dfx stop