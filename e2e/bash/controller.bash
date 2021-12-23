#!/usr/bin/env bats

# shellcheck source=/dev/null
source "$BATS_SUPPORT/load.bash"

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
    # invokes:
    #  - wallet_create_canister

    assert_command dfx identity new alice
    assert_command dfx identity use alice

    ALICE_WALLET=$(dfx --identity alice identity get-wallet)
    ALICE_ID=$(dfx --identity alice identity get-principal)

    dfx --identity alice canister create --all

    assert_command dfx --identity alice canister status e2e_project
    assert_match "Controllers: ($ALICE_WALLET $ALICE_ID|$ALICE_ID $ALICE_WALLET)"
    assert_match "Module hash: None"

    assert_command dfx --identity alice canister info e2e_project
    assert_match "Controllers: ($ALICE_WALLET $ALICE_ID|$ALICE_ID $ALICE_WALLET)"
    assert_match "Module hash: None"

    dfx --identity alice canister status e2e_project

}

@test "canister installation sets controller to the wallet" {
    # invokes:
    #  - wallet_create_canister

    assert_command dfx identity new alice
    assert_command dfx identity use alice

    ALICE_WALLET=$(dfx --identity alice identity get-wallet)
    ALICE_ID=$(dfx --identity alice identity get-principal)

    dfx --identity alice canister create --all
    dfx --identity alice build
    dfx --identity alice canister install --all

    assert_command dfx --identity alice canister status e2e_project
    assert_match "Controllers: ($ALICE_WALLET $ALICE_ID|$ALICE_ID $ALICE_WALLET)"
    assert_match "Module hash: 0x"

    assert_command dfx --identity alice canister info e2e_project
    assert_match "Controllers: ($ALICE_WALLET $ALICE_ID|$ALICE_ID $ALICE_WALLET)"
    assert_match "Module hash: 0x"
}

@test "update-settings sets controller" {
    # invokes:
    #  - wallet_create_canister

    assert_command dfx identity new alice
    assert_command dfx identity new bob

    assert_command dfx identity use alice

    ALICE_WALLET=$(dfx --identity alice identity get-wallet)
    ALICE_ID=$(dfx --identity alice identity get-principal)
    BOB_WALLET=$(dfx --identity bob identity get-wallet)
    # shellcheck disable=SC2034
    BOB_ID=$(dfx --identity bob identity get-principal)

    dfx deploy e2e_project

    assert_command dfx --identity alice canister status e2e_project
    assert_match "Controllers: ($ALICE_WALLET $ALICE_ID|$ALICE_ID $ALICE_WALLET)"

    # Set controller using canister name and identity name
    # Surprise: This doesn't actually call update_settings in the wallet
    # canister.  It calls wallet_call on the wallet canister, which
    # forwards to update_settings on the management canister.
    assert_command dfx canister update-settings e2e_project --controller "${BOB_WALLET}"
    assert_match "Set controller of \"e2e_project\" to: ${BOB_WALLET}"

    assert_command dfx --identity bob canister status e2e_project
    assert_match "Controllers: $BOB_WALLET"

    # Bob is controller, Alice cannot reinstall
    echo yes | assert_command_fail dfx canister install e2e_project -m reinstall

    # Bob can reinstall
    echo yes | assert_command dfx --identity bob canister install e2e_project -m reinstall
}

@test "create wallet with single controller through wallet_create_wallet" {
    # invokes:
    #  - wallet_create_wallet
    #  - update_settings_call
    #  - update_settings_call (with controller)

    # curious: the cycles wallet has a wallet_create_wallet method, published
    # in its .did file.  dfx doesn't call it.  Maybe other users of the agent call it, though.
    # The sdk repo has one call to the method in an e2e ref test.  This is a copy of that test,
    # there called "wallet create wallet".
    WALLET_ID=$(dfx identity get-wallet)
    CREATE_RES=$(dfx canister --no-wallet call "${WALLET_ID}" wallet_create_wallet "(record { cycles = (2000000000000:nat64); settings = record {controller = opt principal \"$(dfx identity get-principal)\";};})")
    CHILD_ID=$(echo "${CREATE_RES}" | tr '\n' ' ' |  cut -d'"' -f 2)
    assert_command dfx canister --no-wallet call "${CHILD_ID}" wallet_balance '()'
}

@test "create wallet with multiple controllers through wallet_create_wallet" {
    # invokes:
    #  - wallet_create_wallet
    #  - update_settings_call
    #  - update_settings_call (with controllers)

    assert_command dfx identity new alice
    assert_command dfx identity new bob

    WALLET_ID=$(dfx identity get-wallet)
    CREATE_RES=$(dfx canister --no-wallet call "${WALLET_ID}" wallet_create_wallet "(record { cycles = (2000000000000:nat64); settings = record {controllers = opt vec { principal \"$(dfx identity get-principal)\"; principal \"$(dfx --identity alice identity get-principal)\";};};})")
    CHILD_ID=$(echo "${CREATE_RES}" | tr '\n' ' ' |  cut -d'"' -f 2)

    assert_command dfx canister --no-wallet call "${CHILD_ID}" wallet_balance '()'
    assert_command dfx --identity alice canister --no-wallet call "${CHILD_ID}" wallet_balance '()'
    assert_command_fail dfx --identity bob canister --no-wallet call "${CHILD_ID}" wallet_balance '()'

    assert_command dfx canister --no-wallet call "${CHILD_ID}" get_custodians '()'
    assert_eq '(vec {})'
    assert_command dfx canister --no-wallet call "${CHILD_ID}" get_controllers '()'
    assert_match 'principal "'"$(dfx identity get-principal)"'"';
    assert_match 'principal "'"$(dfx --identity alice identity get-principal)"'"';
}

@test "create wallet with multiple controllers, other than caller, through wallet_create_wallet" {
    # invokes:
    #  - wallet_create_wallet
    #  - update_settings_call
    #  - update_settings_call (with controllers)

    assert_command dfx identity new alice
    assert_command dfx identity new bob

    WALLET_ID=$(dfx identity get-wallet)
    CREATE_RES=$(dfx canister --no-wallet call "${WALLET_ID}" wallet_create_wallet "(record { cycles = (2000000000000:nat64); settings = record {controllers = opt vec { principal \"$(dfx --identity alice identity get-principal)\"; principal \"$(dfx --identity bob identity get-principal)\";};};})")
    CHILD_ID=$(echo "${CREATE_RES}" | tr '\n' ' ' |  cut -d'"' -f 2)

    assert_command_fail dfx canister --no-wallet call "${CHILD_ID}" wallet_balance '()'
    assert_command dfx --identity alice canister --no-wallet call "${CHILD_ID}" wallet_balance '()'
    assert_command dfx --identity bob canister --no-wallet call "${CHILD_ID}" wallet_balance '()'

    assert_command_fail dfx canister --no-wallet call "${CHILD_ID}" get_custodians '()'
    assert_command dfx --identity bob canister --no-wallet call "${CHILD_ID}" get_custodians '()'
    assert_eq '(vec {})'

    assert_command_fail dfx canister --no-wallet call "${CHILD_ID}" get_controllers '()'
    assert_command dfx --identity alice canister --no-wallet call "${CHILD_ID}" get_controllers '()'
    assert_not_match "$(dfx identity get-principal)"
    assert_match 'principal "'"$(dfx --identity bob identity get-principal)"'"';
    assert_match 'principal "'"$(dfx --identity alice identity get-principal)"'"';
}

