#!/bin/sh
set -e

npm run build

# Delete the WASM to make sure we're taking the new bytes in.
cargo build --manifest-path $(dirname $0)/Cargo.toml --target wasm32-unknown-unknown --release

CURRENT_DIR=`pwd`
cd $(dirname $0)/
cargo install ic-cdk-optimizer --root target || exit 1
cd $CURRENT_DIR

"$(dirname $0)/target/bin/ic-cdk-optimizer" \
    "$(dirname $0)/target/wasm32-unknown-unknown/release/wallet.wasm" \
    -o "$(dirname $0)/target/wasm32-unknown-unknown/release/wallet-$1.wasm"
