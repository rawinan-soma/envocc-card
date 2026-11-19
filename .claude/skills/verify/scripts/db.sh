#!/usr/bin/env bash
# Run a read-only SQL query against this run's database and log it.
# Usage: VERIFY_RUN=<id> scripts/db.sh "<select ...>"
# Prisma names columns in camelCase: quote them, e.g. "userId".
source "$(dirname "$0")/lib.sh"
require_run
set_run_paths
[ $# -eq 1 ] || { echo 'Usage: VERIFY_RUN=<id> scripts/db.sh "<select ...>"' >&2; exit 2; }

status=0
out="$(dc exec -T db psql -U verify -d envocc -v ON_ERROR_STOP=1 -q \
  -c 'SET default_transaction_read_only = on;' -c "$1" 2>&1)" || status=$?
printf '\n## %s SQL\n\n```sql\n%s\n```\n\n```\n%s\n```\n' "$(date +%H:%M:%S)" "$1" "$out" >> "$TRANSCRIPT"
echo "$out"
exit "$status"
