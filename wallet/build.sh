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

# Disable modern wasm features so the wallet binary will run on dfx 0.9.2's bundled replica
cargo rustc -p wallet --target wasm32-unknown-unknown --release -- -Ctarget-cpu=mvp -Ctarget-feature=-sign-ext

cargo install ic-wasm --root target --locked
STATUS=$?

if [ "$STATUS" -eq "0" ]; then
  target/bin/ic-wasm \
      target/wasm32-unknown-unknown/release/wallet.wasm \
      -o target/wasm32-unknown-unknown/release/wallet-opt.wasm \
      shrink
      gzip -nk target/wasm32-unknown-unknown/release/wallet-opt.wasm

  true
else
  echo Could not install ic-wasm.
  false
fi
