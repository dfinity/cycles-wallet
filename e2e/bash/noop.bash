#!/usr/bin/env bats

# shellcheck disable=SC1090
source "$BATS_SUPPORT"/load.bash

@test "always passes" {
  echo passes
}
