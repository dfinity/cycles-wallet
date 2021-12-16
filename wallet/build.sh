#!/bin/sh
set -e

[ -x "$(which npm)" ] || {
  echo "You need npm installed to build the frontend."
  echo "This is an error."
  exit 1
}

# Build frontend before wallet.
npm install
npm run build
gzip -f dist/*.js
gzip -f dist/*.html

cargo build --target wasm32-unknown-unknown --release

cargo install ic-cdk-optimizer --root target
STATUS=$?

if [ "$STATUS" -eq "0" ]; then
  target/bin/ic-cdk-optimizer \
      target/wasm32-unknown-unknown/release/wallet.wasm \
      -o target/wasm32-unknown-unknown/release/wallet-opt.wasm

  true
else
  echo Could not install ic-cdk-optimizer.
  false
fi
