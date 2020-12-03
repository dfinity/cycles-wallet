#!/bin/sh

# The roles here are:
#   Both Alice and Bob have their own wallet
#   Charlie is a custodian of Alice (but Alice is the owner of her own wallet).

set -e

# npm install

dfx start --background --clean

dfx identity new id_alice || true
dfx identity new id_bob || true
dfx identity new id_charlie || true

dfx --identity id_alice canister create alice
dfx --identity id_bob canister create bob
dfx --identity default canister create wallet
# dfx --identity default canister create wallet_ui

dfx build alice
dfx build bob
dfx build wallet

dfx --identity id_alice canister install alice
dfx --identity id_bob canister install bob
dfx --identity default canister install wallet
# dfx --identity default canister install wallet_ui

echo
echo == Initial cycle balances for Alice and Bob.
echo

echo Alice = $(dfx canister call alice "wallet::balance")
echo Bob = $(dfx canister call bob "wallet::balance")

echo
echo == Transfer 1000000000000 cycles from Alice to Bob.
echo

eval dfx --identity id_alice canister call alice "wallet::send" "'(record { canister = principal \"$(dfx canister id bob)\"; amount = 1000000000000 })'"

echo
echo == Final cycle balances for Alice and Bob.
echo

echo Alice = $(dfx canister call alice "wallet::balance")
echo Bob = $(dfx canister call bob "wallet::balance")

echo
echo == Setting custodian of Alices wallet to Charlie
echo
dfx --identity id_alice canister call alice authorize "(principal \"$(dfx --identity id_charlie identity get-principal)\")"

echo
echo == Upgrading...
echo
dfx --identity id_alice canister install alice --mode=upgrade

echo
echo == Using Charlie to send cycles...
echo
eval dfx --identity id_charlie canister call alice "wallet::send" "'(record { canister = principal \"$(dfx canister id bob)\"; amount = 1000000000000 })'"

echo Alice = $(dfx canister call alice "wallet::balance")
echo Alice^ = $(dfx --identity id_charlie canister call alice "wallet::balance")
echo Bob = $(dfx canister call bob "wallet::balance")

dfx stop
