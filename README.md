# DFINITY cycles wallet

[![Build Status](https://github.com/dfinity/cycles-wallet/workflows/build/badge.svg)](https://github.com/dfinity-lab/wallet-canister/actions?query=workflow%3Abuild)

ICP tokens can be converted into **cycles** to power canister operations. Cycles reflect the operational cost of communication, computation, and storage that dapps consume.

Unlike ICP tokens, cycles are only associated with canisters and not with user or developer principals. Because only canisters require cycles to perform operations and pay for the resources they use, users and developers manage the distribution and ownership of cycles through a special type of canister called a **cycles wallet**. The cycles wallet holds the cycles required to perform operations such as creating new canisters. These operations are executed using the canister principal of the cycles wallet instead of your user principal.

## Prerequisites 

- [x] Install the [IC SDK](https://internetcomputer.org/docs/current/developer-docs/setup/install/).

- [x] Download and install [Node.js](https://nodejs.org/en/download/current), version 16.x.x and older. Running a version newer than 16.x.x may result in an error. 

## Deploying the cycles wallet

The cycles wallet can be installed and deployed using the following steps:

- #### Step 1: Install dependencies:

```
npm ci
```

- #### Step 2: Start the local replica:

```
dfx start --background --clean
```

- #### Step 3: Deploy to local replica:

```
dfx deploy
```

Once deployed, you can obtain the canister ID with the command:

```
dfx canister id wallet
```

## Resources

- [Cycles wallet developer documentation]
