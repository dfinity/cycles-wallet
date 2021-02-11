#!/bin/sh
set -e

[ -x "$(which npm)" ] || {
  echo "You need npm installed to build the frontend."
  echo "This is an error."
  exit 1
}

# Build frontend before wallet.
npm install
npm run build || true
# once again with determination, because the last build might have failed
npm run build

WALLET_DIR="$(dirname "$0")"

cargo build --manifest-path "$WALLET_DIR/Cargo.toml" --target wasm32-unknown-unknown --release

CURRENT_DIR="$(pwd)"
cd "$WALLET_DIR/"
cargo install ic-cdk-optimizer --root target
STATUS=$?
cd "$CURRENT_DIR"

if [ "$STATUS" -eq "0" ]; then
  "$WALLET_DIR"/target/bin/ic-cdk-optimizer \
      "$WALLET_DIR"/target/wasm32-unknown-unknown/release/wallet.wasm \
      -o "$WALLET_DIR"/target/wasm32-unknown-unknown/release/wallet-opt.wasm

  true
else
  echo Could not install ic-cdk-optimizer.
  false
fi
