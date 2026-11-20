#!/usr/bin/env bash
# Read-only: is this run's instance worth driving?
# Usage: VERIFY_RUN=<id> scripts/doctor.sh
source "$(dirname "$0")/lib.sh"
require_run
set_run_paths

fail=0
ok()  { echo "ok    $*"; }
bad() { echo "FAIL  $*"; fail=1; }

for svc in db redis api; do
  if [ -n "$(dc ps -q --status running "$svc" 2>/dev/null)" ]; then ok "$svc running in $PROJECT"
  else bad "$svc not running in $PROJECT (start with scripts/up.sh)"; fi
done

url="$(base_url || true)"
if [ -z "$url" ]; then
  bad "no published port for $PROJECT api"
else
  ok "api published at $url (owned by $PROJECT)"
  body="$(curl -s "$url/" || true)"
  [ "$body" = "Hello World!" ] && ok "GET / answers Hello World!" || bad "GET / answered: ${body:-nothing}"
  orgs="$(curl -s "$url/public/organizations/1" || true)"
  case "$orgs" in *'"ministry_id":1'*) ok "GET public/organizations/1 answers organization 1" ;; *) bad "GET public/organizations/1 -> ${orgs:0:120}" ;; esac
fi

seeded="$(dc exec -T db psql -U verify -d envocc -tAc \
  'select (select count(*) from organizations)::text || chr(32) || (select count(*) from request_statuses)' 2>/dev/null || true)"
case "$seeded" in
  "116 17") ok "seed complete (116 organizations, 17 request statuses)" ;;
  *) bad "seed incomplete: organizations, request_statuses = ${seeded:-unreadable} (want 116 17)" ;;
esac

img_head="$(docker image inspect -f '{{ index .Config.Labels "envocc-verify.head" }}' "$IMAGE" 2>/dev/null || true)"
cur_head="$(git -C "$REPO_ROOT" rev-parse --short HEAD)"
if [ "$img_head" = "$cur_head" ]; then ok "image built from HEAD $cur_head"
else bad "image built from ${img_head:-?}, checkout is at $cur_head: rebuild (down.sh then up.sh)"; fi
echo "note  the image holds the working tree as of up.sh; edits since then are not in it"

[ -d "$EVIDENCE_DIR" ] && ok "evidence dir $EVIDENCE_DIR" || bad "no evidence dir $EVIDENCE_DIR"
exit $fail
