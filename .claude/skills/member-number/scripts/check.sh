#!/usr/bin/env bash
# Model-check the Member Number spec with TLC (TLA+ tools 1.8.0) in Docker.
# Usage: .claude/skills/member-number/scripts/check.sh [config...]
#   config: MemberNumber (default), MemberNumberSerial, MemberNumberReuse, or all
# Exit 0 when every config passes, 1 when any invariant is violated.
# Output per config goes to stdout and to $OUT_DIR/<config>.out.
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SPEC_DIR="$SKILL_DIR/spec"
JAR_VERSION=1.8.0
JAR_SHA256=7e53aa636dac8a3cb0533f343115c0548e03fc0ce5edc7739becf58d3d0fb84f
CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/envocc-tla"
JAR="$CACHE/tla2tools-$JAR_VERSION.jar"
JAVA_IMAGE=eclipse-temurin:21-jre
OUT_DIR="${OUT_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/envocc-member-number/$(date +%Y%m%d-%H%M%S)}"

if [ ! -f "$JAR" ]; then
  mkdir -p "$CACHE"
  curl -fsSL -o "$JAR.tmp" "https://github.com/tlaplus/tlaplus/releases/download/v$JAR_VERSION/tla2tools.jar"
  mv "$JAR.tmp" "$JAR"
fi
echo "$JAR_SHA256  $JAR" | sha256sum -c --quiet - || { echo "checksum mismatch: $JAR" >&2; exit 2; }

configs=("$@")
[ ${#configs[@]} -gt 0 ] || configs=(MemberNumber)
[ "${configs[0]}" != all ] || configs=(MemberNumberSerial MemberNumber MemberNumberReuse)

mkdir -p "$OUT_DIR"
status=0
for cfg in "${configs[@]}"; do
  [ -f "$SPEC_DIR/$cfg.cfg" ] || { echo "no config $SPEC_DIR/$cfg.cfg" >&2; exit 2; }
  work="$(mktemp -d)"
  cp "$SPEC_DIR/MemberNumber.tla" "$SPEC_DIR/$cfg.cfg" "$work/"
  echo "=== $cfg"
  set +e
  docker run --rm --user "$(id -u):$(id -g)" -v "$work:/spec" -v "$JAR:/tla2tools.jar:ro" -w /spec "$JAVA_IMAGE" \
    java -XX:+UseParallelGC -cp /tla2tools.jar tlc2.TLC -workers auto -deadlock \
    -config "$cfg.cfg" MemberNumber.tla > "$OUT_DIR/$cfg.out" 2>&1
  code=$?
  set -e
  rm -rf "$work"
  if grep -q "is violated" "$OUT_DIR/$cfg.out"; then
    grep -m1 "is violated" "$OUT_DIR/$cfg.out"
    # The step names of the counterexample; the full states are in the .out file.
    grep -E '^State [0-9]+: <' "$OUT_DIR/$cfg.out" | sed -E 's/ line [0-9]+.*>/>/' || true
    echo "last state:"
    awk '/^State [0-9]+: </{buf=""; on=1} on{buf=buf $0 "\n"} /^[0-9]+ states generated/{on=0} END{printf "%s", buf}' "$OUT_DIR/$cfg.out" \
      | grep -E '^/\\ (members|pending|target) ' || true
    echo "RESULT $cfg: VIOLATED"
    status=1
  elif [ $code -eq 0 ] && grep -q "No error has been found" "$OUT_DIR/$cfg.out"; then
    grep -E "distinct states found|depth of the complete state graph" "$OUT_DIR/$cfg.out" | tail -2
    echo "RESULT $cfg: PASS"
  else
    tail -30 "$OUT_DIR/$cfg.out"
    echo "RESULT $cfg: ERROR (TLC exit $code; the spec or config did not run)"
    status=2
  fi
done
echo "Full output: $OUT_DIR"
exit $status
