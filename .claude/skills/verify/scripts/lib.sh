# Sourced by the other scripts. Resolves one run's names and paths from
# VERIFY_RUN.
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(git -C "$SKILL_DIR" rev-parse --show-toplevel)"
COMPOSE_FILE="$SKILL_DIR/compose.verify.yml"
PREFIX_PATH="envocc-card/api/v2"

require_run() {
  if [ -z "${VERIFY_RUN:-}" ]; then
    echo "VERIFY_RUN is not set. Use the id that scripts/up.sh printed: VERIFY_RUN=<id> $0 ..." >&2
    exit 2
  fi
  case "$VERIFY_RUN" in
    *[!a-z0-9-]*) echo "VERIFY_RUN must be lowercase letters, digits and dashes: $VERIFY_RUN" >&2; exit 2 ;;
  esac
}

set_run_paths() {
  PROJECT="envocc-verify-$VERIFY_RUN"
  IMAGE="envocc-verify-api:$VERIFY_RUN"
  EVIDENCE_DIR="${VERIFY_EVIDENCE_ROOT:-$HOME/.local/state/envocc-verify}/$VERIFY_RUN"
  TRANSCRIPT="$EVIDENCE_DIR/transcript.md"
}

dc() {
  VERIFY_IMAGE="$IMAGE" docker compose --progress quiet --project-name "$PROJECT" -f "$COMPOSE_FILE" "$@"
}

base_url() {
  local hostport
  hostport="$(dc port api 3000 2>/dev/null || true)"
  [ -n "$hostport" ] || return 1
  echo "http://$hostport/$PREFIX_PATH"
}
