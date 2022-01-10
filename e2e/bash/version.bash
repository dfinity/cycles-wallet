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

@test "reports the wallet API version" {
    WALLET_ID=$(dfx identity get-wallet)
    assert_command dfx canister --no-wallet call "${WALLET_ID}" wallet_api_version "()"
    assert_eq '("0.2.0")'
}
