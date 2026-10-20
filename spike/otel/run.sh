#!/bin/bash
# usage: run.sh <label> <bun args...>   (env vars pass through)
S=$(cd "$(dirname "$0")" && pwd)/out; mkdir -p $S; label=$1; shift
out=$S/$label.jsonl; log=$S/$label.log; rm -f $out
cd "$(dirname "$0")/../.."
OTEL_SPIKE_OUT=$out bun "$@" > $log 2>&1 &
pid=$!
for i in $(seq 1 60); do curl -s -o /dev/null localhost:3901 && break; sleep 0.5; done
curl -s -XPOST localhost:3901/api/users/auth/request-password-reset -H 'content-type: application/json' -d '{"email":"spike@example.test"}'; echo
sleep 4
kill $pid; wait $pid 2>/dev/null
echo "== $label: $(wc -l < $out 2>/dev/null) spans"
