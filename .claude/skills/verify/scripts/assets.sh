#!/usr/bin/env bash
# List the files the api has written to its uploads directory, and log it.
# Usage: VERIFY_RUN=<id> scripts/assets.sh
source "$(dirname "$0")/lib.sh"
require_run
set_run_paths

out="$(dc exec -T api ls -l /app/assets)"
printf '\n## %s files in /app/assets\n\n```\n%s\n```\n' "$(date +%H:%M:%S)" "$out" >> "$TRANSCRIPT"
echo "$out"
