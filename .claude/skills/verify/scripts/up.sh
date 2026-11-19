#!/usr/bin/env bash
# Build the working tree (committed and uncommitted, minus .gitignore'd files)
# into an image, start a fresh stack, wait until the API answers.
# Usage: [VERIFY_RUN=<id>] scripts/up.sh
source "$(dirname "$0")/lib.sh"

VERIFY_RUN="${VERIFY_RUN:-$(date +%m%d-%H%M%S)-$RANDOM}"
require_run
set_run_paths

if [ -n "$(dc ps -q 2>/dev/null)" ]; then
  echo "Project $PROJECT already has containers. Drive it with VERIFY_RUN=$VERIFY_RUN, or run scripts/down.sh first." >&2
  exit 1
fi

mkdir -p "$EVIDENCE_DIR"
head="$(git -C "$REPO_ROOT" rev-parse --short HEAD)"
dirty="$(git -C "$REPO_ROOT" status --porcelain | grep -c . || true)"

echo "Building $IMAGE from $REPO_ROOT (HEAD $head, $dirty changed paths)..."
# Only files that exist: a tracked file deleted in the working tree is skipped.
(cd "$REPO_ROOT" && git ls-files -co --exclude-standard -z \
  | while IFS= read -r -d '' f; do [ -e "$f" ] && printf '%s\0' "$f"; done \
  | tar --null -T - -cf -) \
  | docker build --progress=plain -f .claude/skills/verify/Dockerfile.verify --label "envocc-verify.run=$VERIFY_RUN" --label "envocc-verify.head=$head" -t "$IMAGE" - \
  > "$EVIDENCE_DIR/build.log" 2>&1 \
  || { echo "FAIL: image build failed; last lines of $EVIDENCE_DIR/build.log:" >&2; tail -25 "$EVIDENCE_DIR/build.log" >&2; exit 1; }

echo "Starting $PROJECT..."
dc up -d --wait db redis >/dev/null
dc up -d api >/dev/null

url="$(base_url)"
echo "Waiting for $url/ (migrate + seed + start take 1-3 minutes)..."
for i in $(seq 120); do
  if [ "$(curl -s -o /dev/null -w '%{http_code}' "$url/")" = 200 ]; then
    break
  fi
  if [ -z "$(dc ps -q --status running api)" ]; then
    echo "FAIL: the api container exited during startup:" >&2
    dc logs --tail 60 api >&2
    exit 1
  fi
  [ "$i" -lt 120 ] || { echo "FAIL: no answer after 6 minutes. See: VERIFY_RUN=$VERIFY_RUN scripts/logs.sh" >&2; exit 1; }
  sleep 3
done

cat > "$EVIDENCE_DIR/instance.env" <<EOF
VERIFY_RUN=$VERIFY_RUN
PROJECT=$PROJECT
BASE_URL=$url
GIT_HEAD=$head
DIRTY_PATHS=$dirty
STARTED_AT=$(date -Iseconds)
EOF
printf '# Verification run %s\n\nHEAD %s, %s changed paths. API at %s\n' \
  "$VERIFY_RUN" "$head" "$dirty" "$url" > "$TRANSCRIPT"

echo "READY"
echo "export VERIFY_RUN=$VERIFY_RUN"
echo "BASE_URL=$url"
echo "EVIDENCE=$EVIDENCE_DIR"
