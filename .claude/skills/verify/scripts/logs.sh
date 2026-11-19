#!/usr/bin/env bash
# Show the api's recent logs (startup, migrations, seed, request errors).
# Usage: VERIFY_RUN=<id> scripts/logs.sh [lines]
source "$(dirname "$0")/lib.sh"
require_run
set_run_paths
dc logs --no-color --tail "${1:-80}" api
