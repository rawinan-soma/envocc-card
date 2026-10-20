#!/usr/bin/env bash
# The observability stack's smoke check. Runs on the host the stack runs on
# (`make check HOST=…` runs it on the server, `make check-local` here):
#
#   bash check.sh <compose project>
#
# Sends one span and one metric to the Collector over OTLP, and prints one log
# line from a throwaway container the way the api does, then waits for each to
# land in Tempo, Prometheus and Loki. The span and the log line carry an email,
# a JWT and a 13-digit number, which must arrive redacted. Nothing is
# published, so every request goes from a curl container on the stack's own
# network. Needs only bash and docker.

set -uo pipefail

project=${1:?usage: check.sh <compose project>}
network=${project}_default
curl_image=curlimages/curl:8.23.0
service=observability-check

hex() { od -An -N"$1" -tx1 /dev/urandom | tr -d ' \n'; }
run=$(hex 4)
trace_id=$(hex 16)
span_id=$(hex 8)
now=$(date +%s%N)

email="check.$run@example.com"
jwt=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJvYnNlcnZhYmlsaXR5LWNoZWNrIn0.c2lnbmF0dXJlLW5vdC1jaGVja2Vk
id13=3100512345678

on_net() { docker run --rm --network "$network" "$curl_image" -fsS --max-time 10 "$@"; }

fail=0
ok() { echo "ok    $*"; }
bad() { echo "FAIL  $*"; fail=1; }

# Polls for up to a minute until the command's output contains $run.
await() {
  local out
  for _ in $(seq 30); do
    out=$("$@" 2>/dev/null) && [[ $out == *"$run"* ]] && { printf '%s' "$out"; return 0; }
    sleep 2
  done
  return 1
}

# The planted values must be gone and their masks present.
redacted() {
  local what=$1 out=$2
  if [[ $out == *"$email"* || $out == *"$jwt"* || $out == *"$id13"* ]]; then
    bad "$what arrived with an email, a JWT or a 13-digit number in clear"
  elif [[ $out == *REDACTED:email* && $out == *REDACTED:jwt* && $out == *REDACTED:id13* ]]; then
    ok "$what arrived with the email, JWT and 13-digit number redacted"
  else
    bad "$what arrived without the planted values or their masks: $out"
  fi
}

echo "run $run, trace $trace_id"

if ! docker network inspect "$network" >/dev/null 2>&1; then
  echo "FAIL  no network $network: is the stack up?"
  exit 1
fi

# --- send -------------------------------------------------------------------

resource='{"attributes":[{"key":"service.name","value":{"stringValue":"'$service'"}}]}'
attr() { printf '{"key":"%s","value":{"stringValue":"%s"}}' "$1" "$2"; }

span='{"resourceSpans":[{"resource":'$resource',"scopeSpans":[{"scope":{"name":"check"},"spans":[{
  "traceId":"'$trace_id'","spanId":"'$span_id'","name":"observability check","kind":1,
  "startTimeUnixNano":"'$now'","endTimeUnixNano":"'$((now + 1000000))'",
  "attributes":['$(attr check.run "$run")','$(attr check.email "$email")','$(attr check.jwt "$jwt")','$(attr check.id "id $id13")']}]}]}]}'

metric='{"resourceMetrics":[{"resource":'$resource',"scopeMetrics":[{"scope":{"name":"check"},"metrics":[{
  "name":"envocc_check","gauge":{"dataPoints":[{"asDouble":1,"timeUnixNano":"'$now'",
  "attributes":['$(attr run "$run")']}]}}]}]}]}'

on_net -o /dev/null -H 'Content-Type: application/json' -d "$span" http://otelcol:4318/v1/traces \
  && ok "span sent to the Collector" || bad "the Collector refused the span"
on_net -o /dev/null -H 'Content-Type: application/json' -d "$metric" http://otelcol:4318/v1/metrics \
  && ok "metric sent to the Collector" || bad "the Collector refused the metric"

# The Collector tails Docker's json-file logs of containers that opt in by
# logging their compose service label, as the api's container does. The
# container is kept until its line is in Loki, since removing it deletes the log.
line='{"level":"log","context":"ObservabilityCheck","message":"run '$run' for '$email' with '$jwt' and '$id13'","trace_id":"'$trace_id'","span_id":"'$span_id'"}'
logger=$(docker run -d --label com.docker.compose.service=$service \
  --log-opt labels=com.docker.compose.service --entrypoint sh "$curl_image" -c 'echo "$0"' "$line" 2>/dev/null) \
  && ok "log line written by a container labelled $service" || bad "could not start the logging container"
trap '[ -n "${logger:-}" ] && docker rm -f "$logger" >/dev/null' EXIT

# --- land -------------------------------------------------------------------

if out=$(await on_net "http://tempo:3200/api/traces/$trace_id"); then
  ok "span is in Tempo"; redacted "span" "$out"
else bad "span did not reach Tempo in a minute"; fi

if out=$(await on_net -G http://prometheus:9090/api/v1/query --data-urlencode "query=envocc_check{run=\"$run\"}"); then
  ok "metric is in Prometheus"
else bad "metric did not reach Prometheus in a minute"; fi

# Found by its trace_id, which is what Grafana's log → trace link relies on.
if out=$(await on_net -G http://loki:3100/loki/api/v1/query_range \
  --data-urlencode "query={service_name=\"$service\"} | trace_id=\"$trace_id\"" \
  --data-urlencode "start=$((now - 600 * 1000000000))"); then
  ok "log line is in Loki under its trace_id"; redacted "log line" "$out"
else bad "log line did not reach Loki under its trace_id in a minute"; fi

# --- exposure ---------------------------------------------------------------

published=$(docker ps --filter "label=com.docker.compose.project=$project" --format '{{.Ports}}' \
  | grep -o '[^ ,]*->' | grep -v '^127\.0\.0\.1:')
if [ -z "$published" ]; then ok "nothing published beyond loopback"
else bad "published beyond loopback: $published"; fi

exit $fail
