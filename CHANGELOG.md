# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Now queries XDR to ICP conversion rate from Cycles Minting Canister (CMC). The interface can be found at `nns-dapp/frontend/ts/src/canisters/cyclesMinting/canister.did`.

  - The CycleSlider UI feature shows this conversion when allocating cycles to canisters.

- Managed canisters are now tracked, and the events that pertain to them are tracked under them.
  - Added `list_managed_canisters`, `get_managed_canister_events`, and `set_short_name` functions.

- Each function that deals with a 64-bit cycle count has been paired with a 128-bit equivalent.
  - The canister now holds 128-bit data internally and the 128-bit functions should be preferred going forward
  - `get_events` and `get_managed_canister_events` will trap if any events would be returned with cycle counts that overflow a `nat64`

### Changed

- `wallet_receive` now takes an optional memo parameter, for recording information about a particular transaction.

## [0.2.1] - 2021-12-03

### Changed

- When `wallet_create_wallet` is not given any controllers to use, now it will
  set the caller as a controller in addition to itself (previously only set self).

## [0.2.0] - 2021-09-03

### Added

- Added wallet_api_version() method.
- Added 'controllers' field to CanisterSettings field.
  - Either the controller field or the controllers field may be present, but not both.
- Support for certified assets and http_request() interface.

### Changed

- The frontend now formats cycle balances in a human readable format, for example 5 KC = 5000 cycles, 10 TC = 10 trillion cycles.

## [0.1.0] - 2021-06-06

Module hash: 1404b28b1c66491689b59e184a9de3c2be0dbdd75d952f29113b516742b7f898

### Fixed

- It is no longer possible to remove the last controller.

### Changed

- Differentiate between controllers and custodians in error output.
- The deauthorize() method will now only deauthorize custodians, not controllers.

## [0.1.0] - 2021-05-17

Module hash: a609400f2576d1d6df72ce868b359fd08e1d68e58454ef17db2361d2f1c242a1

### Changed

- Updated frontend to use the Internet Identity Service.

## [0.1.0] - 2021-04-30

Module hash: 3d5b221387875574a9fd75b3165403cf1b301650a602310e9e4229d2f6766dcc

This is the oldest version of this module found on the IC. It was released with dfx 0.7.0-beta.5.
It conforms to version 0.17.0 of the public interface.
