# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- wallet_api_version() method
- CanisterSettings field: controllers
    - If present, the controller field will be ignored by this canister, and will be
passed through as None to the IC.
- certified assets with http_request interface

### Changed

- The frontend now formats cycle balances in a human readable format, for example 5 KC = 5000 cycles, 10 TC = 10 trillion cycles 

## 0.1.0 - 2021-06-06

dfinity/wallet-rs@e902708

module hash: 1404b28b1c66491689b59e184a9de3c2be0dbdd75d952f29113b516742b7f898

### Fixed

- The last controller may no longer be removed as a controller.

### Changed

- Differentiate between controllers and custodians.
- deauthorize() will now only deauthorize custodians.

## 0.1.0 - 2021-05-17

https://github.com/dfinity/wallet-rs/commit/06bb256ca0738640be51cf84caaced7ea02ca29d
module hash: a609400f2576d1d6df72ce868b359fd08e1d68e58454ef17db2361d2f1c242a1

### Changed

- Updated to use the Internet Identity Service.

## 0.1.0 - 2021-04-30

dfinity/wallet-rs@c3cbfc501564da89e669a2d9de810d32240baf5f
module hash: 3d5b221387875574a9fd75b3165403cf1b301650a602310e9e4229d2f6766dcc

### Fixed

- Return correct content type and encoding for non-gz files
- Updated frontend for canister creation settings

## 0.1.0 - 2021-04-29

module hash: ca5fa9c4c40194538619928415875a7d757e0b838b3eab545245505d71dd04fe

update to spec 0.17.0

### Changed

- wallet_create_canister create argument with canister settings

