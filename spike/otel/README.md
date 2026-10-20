# Bun + OpenTelemetry spike (ticket #21) — throwaway

Findings: https://github.com/rawinan-soma/envocc-card/issues/21

Needs Postgres + Redis and a `.env` (`DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT`,
`SERVER_PORT=3901`, `ENDPOINT_PREFIX=api`, …), a migrated + seeded DB, and a user
with email `spike@example.test`. Then `bun run build` and:

```sh
# auto-instrumentations only, SDK loaded by preload
spike/otel/run.sh preload-auto --preload ./dist/src/otel/preload.js dist/src/main.js
# + @prisma/instrumentation + BullMQ telemetry, SDK loaded programmatically
OTEL_SPIKE_MODE=programmatic OTEL_SPIKE_PRISMA=1 OTEL_SPIKE_BULLMQ_TELEMETRY=1 \
  spike/otel/run.sh prog-full dist/src/main.js
# SDK started after @nestjs/core/express are loaded
OTEL_SPIKE_PRISMA=1 OTEL_SPIKE_BULLMQ_TELEMETRY=1 spike/otel/run.sh late spike/otel/late.js

python3 spike/otel/tree.py spike/otel/out/prog-full.jsonl POST   # span tree
```

`OTEL_SPIKE_DIAG=1` turns on OTel diag logging (shows which modules got patched).
