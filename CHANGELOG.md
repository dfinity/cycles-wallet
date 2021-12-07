# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

This is the oldest version of this module found on the IC.  It was released with dfx 0.7.0-beta.5.
It conforms to version 0.17.0 of the public interface.
