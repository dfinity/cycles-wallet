# wallet-canister

[![Build Status](https://github.com/dfinity-lab/wallet-canister/workflows/build/badge.svg)](https://github.com/dfinity-lab/wallet-canister/actions?query=workflow%3Abuild)

The basic wallet canister implementation in Rust


## Demo

- Install dependencies: `npm install`
- Start replica: `dfx start --background --clean`
- Deploy to replica locally: `dfx deploy`
- Get canister ID: `dfx canister id wallet`
- Open wallet UI at `http://localhost:8000/?canisterId=<wallet_canister_id_here>`


**NB**: To Update the wallet UI without `dfx deploy`, run `npm run sideload-ui`. In order to do this, you will need to grant access to `Anonymous` for the wallet canister. To do so, run `dfx canister call $(dfx canister id wallet) add_controller '(principal "2vxsx-fae")'`.
