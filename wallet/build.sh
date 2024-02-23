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

cargo rustc --target wasm32-unknown-unknown --release -- -Ctarget-cpu=mvp

cargo install ic-wasm --root target --locked
STATUS=$?

if [ "$STATUS" -eq "0" ]; then
  target/bin/ic-wasm \
      target/wasm32-unknown-unknown/release/wallet.wasm \
      -o target/wasm32-unknown-unknown/release/wallet-opt.wasm \
      shrink

  true
else
  echo Could not install ic-wasm.
  false
fi
