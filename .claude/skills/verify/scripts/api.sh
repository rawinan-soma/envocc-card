#!/usr/bin/env bash
# One HTTP call as one actor, logged to the run's transcript.
# Usage: VERIFY_RUN=<id> scripts/api.sh <actor> <METHOD> <path> [curl args...]
#   actor: any name (admin, moph, user, anon...). Each actor has its own cookie
#          jar, so a login as `user` is kept for later `user` calls.
#   path:  after the global prefix, e.g. users/me or public/organizations/1
# Prints the response body on stdout and `HTTP <code>` on stderr.
# Exits 0 for 2xx/3xx, 1 otherwise.
source "$(dirname "$0")/lib.sh"
require_run
set_run_paths

[ $# -ge 3 ] || { sed -n '2,9p' "$0" >&2; exit 2; }
actor="$1" method="$2" path="${3#/}"; shift 3
url="$(base_url)" || { echo "no running api for $PROJECT" >&2; exit 1; }
jar="$EVIDENCE_DIR/cookies-$actor.txt"
body="$(mktemp)"; trap 'rm -f "$body"' EXIT

code="$(curl -sS -o "$body" -w '%{http_code}' -X "$method" \
  -b "$jar" -c "$jar" "$@" "$url/$path")"

{
  printf '\n## %s %s %s  (as %s, %s)\n\n' "$(date +%H:%M:%S)" "$method" "/$path" "$actor" "HTTP $code"
  # Log curl args without file contents; mask password values.
  [ $# -eq 0 ] || printf 'args: `%s`\n\n' "$(printf '%s ' "$@" | sed -E 's/("password"[[:space:]]*:[[:space:]]*")[^"]*/\1***/g')"
  printf '```\n%s\n```\n' "$(head -c 4000 "$body")"
} >> "$TRANSCRIPT"

cat "$body"; echo
echo "HTTP $code" >&2
[ "$code" -lt 400 ]
