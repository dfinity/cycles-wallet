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
    dfx start --background --clean
}

teardown() {
    dfx stop
    rm -rf "$DFX_CONFIG_ROOT"
}

@test "wallet_call_with_max_cycles" {
    dfx identity new alice
    dfx identity new bob
    WALLET_ALICE=$(dfx --identity alice identity get-wallet)
    WALLET_BOB=$(dfx --identity bob identity get-wallet)

    ALICE_CYCLES_BEFORE_SEND=$(dfx --identity alice wallet balance --precise | sed 's/[^0-9]//g')
    if (( ALICE_CYCLES_BEFORE_SEND < 2000000000000 )); then 
        echo "alice has unexpectedly few cycles before sending: ${ALICE_CYCLES_BEFORE_SEND}"
        exit 1
    fi
    dfx --identity alice canister call "${WALLET_ALICE}" wallet_call_with_max_cycles "(record { canister = principal \"${WALLET_BOB}\"; method_name = \"wallet_receive\"; args = blob \"\44\49\44\4c\00\00\"; })"

    # has less than 0.2T cycles afterwards
    ALICE_CYCLES_AFTER_SEND=$(dfx --identity alice wallet balance --precise | sed 's/[^0-9]//g')
    if (( ALICE_CYCLES_AFTER_SEND > 200000000000 )); then 
        echo "expected alice to have <1TC after wallet_call_with_max_cycles, actually has ${ALICE_CYCLES_AFTER_SEND}, before was ${ALICE_CYCLES_BEFORE_SEND}"
        exit 1
    fi
}
