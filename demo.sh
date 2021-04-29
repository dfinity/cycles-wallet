#!/bin/sh

# The roles here are:
#   Both Alice and Bob have their own wallet
#   Charlie is a custodian of Alice (but Alice is the owner of her own wallet).

set -e

#npm install

/Users/prithvishahi/dev/sdk/target/debug/dfx start --background --clean

/Users/prithvishahi/dev/sdk/target/debug/dfx identity new id_alice || true
/Users/prithvishahi/dev/sdk/target/debug/dfx identity new id_bob || true
/Users/prithvishahi/dev/sdk/target/debug/dfx identity new id_charlie || true

/Users/prithvishahi/dev/sdk/target/debug/dfx --identity id_alice canister create alice --with-cycles=5000000000000
/Users/prithvishahi/dev/sdk/target/debug/dfx --identity id_bob canister create bob --with-cycles=2000000000000
/Users/prithvishahi/dev/sdk/target/debug/dfx --identity default canister create wallet --with-cycles=3000000000000

/Users/prithvishahi/dev/sdk/target/debug/dfx build

/Users/prithvishahi/dev/sdk/target/debug/dfx --identity id_alice canister install alice
/Users/prithvishahi/dev/sdk/target/debug/dfx --identity id_bob canister install bob
/Users/prithvishahi/dev/sdk/target/debug/dfx --identity default canister install wallet

echo
echo == Initial cycle balances for Alice and Bob.
echo

echo Alice = $(/Users/prithvishahi/dev/sdk/target/debug/dfx --identity id_alice canister call alice wallet_balance)
echo Bob = $(/Users/prithvishahi/dev/sdk/target/debug/dfx --identity id_bob canister call bob wallet_balance)

echo
echo == Create a new canister with Alice as controller using 1000000000001 cycles.
echo

CREATE_RES=$(/Users/prithvishahi/dev/sdk/target/debug/dfx --identity id_alice canister call alice wallet_create_canister "(record { cycles = 1000000000001; settings = record {null; null; null;}; })")
echo New canister id = $(echo "${CREATE_RES}" | tr '\n' ' ' |  cut -d'"' -f 2)

echo
echo == Transfer 1000000000000 cycles from Alice to Bob.
echo

eval /Users/prithvishahi/dev/sdk/target/debug/dfx --identity id_alice canister call alice wallet_send "'(record { canister = principal \"$(/Users/prithvishahi/dev/sdk/target/debug/dfx canister id bob)\"; amount = 1000000000000 })'"

echo
echo == Final cycle balances for Alice and Bob.
echo

echo Alice = $(/Users/prithvishahi/dev/sdk/target/debug/dfx --identity id_alice canister call alice wallet_balance)
echo Bob = $(/Users/prithvishahi/dev/sdk/target/debug/dfx --identity id_bob canister call bob wallet_balance)

echo
echo == Setting custodian of Alices wallet to Charlie
echo
/Users/prithvishahi/dev/sdk/target/debug/dfx --identity id_alice canister call alice authorize "(principal \"$(/Users/prithvishahi/dev/sdk/target/debug/dfx --identity id_charlie identity get-principal)\")"

echo
echo == Upgrading...
echo
/Users/prithvishahi/dev/sdk/target/debug/dfx --identity id_alice canister install alice --mode=upgrade

echo
echo == Using Charlie to send cycles...
echo
eval /Users/prithvishahi/dev/sdk/target/debug/dfx --identity id_charlie canister --no-wallet call alice wallet_send "'(record { canister = principal \"$(/Users/prithvishahi/dev/sdk/target/debug/dfx canister id bob)\"; amount = 1000000000000 })'"

echo Alice = $(/Users/prithvishahi/dev/sdk/target/debug/dfx --identity id_alice canister call alice wallet_balance)
echo Alice^ = $(/Users/prithvishahi/dev/sdk/target/debug/dfx --identity id_charlie canister --no-wallet call alice wallet_balance)
echo Bob = $(/Users/prithvishahi/dev/sdk/target/debug/dfx --identity id_bob canister call bob wallet_balance)

/Users/prithvishahi/dev/sdk/target/debug/dfx stop
