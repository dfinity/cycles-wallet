#!/bin/sh

# The roles here are:
#   Both Alice and Bob have their own wallet
#   Charlie is a custodian of Alice (but Alice is the owner of her own wallet).

set -e

npm install

dfx start --background --clean

dfx identity new id_alice || true
dfx identity new id_bob || true
dfx identity new id_charlie || true

dfx --identity id_alice canister --no-wallet create alice --with-cycles=5000000000000
dfx --identity id_bob canister --no-wallet create bob --with-cycles=2000000000000
dfx --identity default canister --no-wallet create wallet --with-cycles=3000000000000

alice_wallet="$(dfx canister id alice)"
bob_wallet="$(dfx canister id bob)"
default_wallet="$(dfx canister id wallet)"

dfx build

dfx --identity id_alice canister --no-wallet install alice
dfx --identity id_bob canister --no-wallet install bob
dfx --identity default canister --no-wallet install wallet

dfx --identity id_alice identity set-wallet "$alice_wallet"
dfx --identity id_bob identity set-wallet "$bob_wallet"
dfx --identity default identity set-wallet "$default_wallet"

echo
echo '== Initial cycle balances for Alice and Bob.'
echo

echo "Alice = $(dfx --identity id_alice canister call alice wallet_balance)"
echo "Bob = $(dfx --identity id_bob canister call bob wallet_balance)"

echo
echo '== Create a new canister with Alice as controller using 1000000000001 cycles.'
echo

CREATE_RES=$(dfx --identity id_alice canister call alice wallet_create_canister "(record { cycles = 1000000000001; settings = record {null; null; null;}; })")
echo "New canister id = $(echo "${CREATE_RES}" | tr '\n' ' ' |  cut -d'"' -f 2)"

echo
echo '== Transfer 1000000000000 cycles from Alice to Bob.'
echo

eval dfx --identity id_alice canister call alice wallet_send "'(record { canister = principal \"$(dfx canister id bob)\"; amount = 1000000000000 })'"

echo
echo '== Final cycle balances for Alice and Bob.'
echo

echo "Alice = $(dfx --identity id_alice canister call alice wallet_balance)"
echo "Bob = $(dfx --identity id_bob canister call bob wallet_balance)"

echo
echo '== Setting custodian of Alices wallet to Charlie'
echo
dfx --identity id_alice canister call alice authorize "(principal \"$(dfx --identity id_charlie identity get-principal)\")"

echo
echo '== Upgrading...'
echo
dfx --identity id_alice canister install alice --mode=upgrade

echo
echo '== Using Charlie to send cycles...'
echo
eval dfx --identity id_charlie canister --no-wallet call alice wallet_send "'(record { canister = principal \"$(dfx canister id bob)\"; amount = 1000000000000 })'"

echo "Alice = $(dfx --identity id_alice canister call alice wallet_balance)"
echo "Alice^ = $(dfx --identity id_charlie canister --no-wallet call alice wallet_balance)"
echo "Bob = $(dfx --identity id_bob canister call bob wallet_balance)"

dfx stop
