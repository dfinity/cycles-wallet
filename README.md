# DFINITY Cycles Wallet

[![Build Status](https://github.com/dfinity/cycles-wallet/workflows/build/badge.svg)](https://github.com/dfinity-lab/wallet-canister/actions?query=workflow%3Abuild)

The DFINITY Cycles Wallet implementation.

## Demo

- Install dependencies: `npm ci`
- Start replica: `dfx start --background --clean`
- Deploy to replica locally: `dfx deploy`
- Get canister ID: `dfx canister id wallet`
- Open wallet UI at `http://localhost:8000/?canisterId=<wallet_canister_id_here>&identityProvider=http://localhost:8000/?canisterId=<internet_identity_id>`
