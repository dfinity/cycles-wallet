#!/bin/sh
set -e

npm run build

cargo build --manifest-path $(dirname $0)/Cargo.toml --target wasm32-unknown-unknown --release

CURRENT_DIR=`pwd`
cd $(dirname $0)/
cargo install ic-cdk-optimizer --root target || exit 1
STATUS=$?
cd $CURRENT_DIR

if [ "$STATUS" -eq "0" ]; then
  $(dirname $0)/target/bin/ic-cdk-optimizer \
      $(dirname $0)/target/wasm32-unknown-unknown/release/wallet.wasm \
      -o $(dirname $0)/target/wasm32-unknown-unknown/release/wallet-opt.wasm

  true
else
  false
fi
