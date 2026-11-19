#!/usr/bin/env bash
# Tear down only this run's stack: containers, volumes, image. Saves the
# logs into the evidence dir first and never deletes the evidence.
# Usage: VERIFY_RUN=<id> scripts/down.sh
source "$(dirname "$0")/lib.sh"
require_run
set_run_paths

mkdir -p "$EVIDENCE_DIR"
dc logs --no-color api > "$EVIDENCE_DIR/api.log" 2>&1 || true
dc down --volumes --remove-orphans >/dev/null 2>&1 || true
docker image rm "$IMAGE" >/dev/null 2>&1 || true
rm -f "$EVIDENCE_DIR"/cookies-*.txt

left="$(docker ps -aq --filter "label=com.docker.compose.project=$PROJECT")"
[ -z "$left" ] || { echo "FAIL: containers left in $PROJECT: $left" >&2; exit 1; }
echo "Removed $PROJECT. Evidence kept in $EVIDENCE_DIR"
ls "$EVIDENCE_DIR"
