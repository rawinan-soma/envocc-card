---
name: verify
description: Launch a disposable EnvOcc Card API stack (NestJS + Postgres + Redis in Docker), drive it over HTTP as admins and users the way the frontend does, and capture proof (transcript, SQL, uploaded files). Use to prove an API change works in the running app, not just in jest, e.g. card request statuses, document upload, admin user routes, auth.
---

# Verify EnvOcc Card

The product surface is an HTTP API (`/envocc-card/api/v2/...`) used by a separate frontend. No UI lives in this repo, so you drive the API with `curl` through `scripts/api.sh`, one cookie jar per actor, exactly as the browser does: log in, keep the `Authentication_*` cookies, call routes.

Every run gets its own Docker Compose project `envocc-verify-<run>` with a fresh Postgres, Redis and uploads volume, and an image built from **this checkout's working tree** (uncommitted edits included, `.gitignore`d files excluded). Runs never touch the dev stack in `docker-compose.yaml` and never share data, so parallel runs are safe. Never drive a stack you did not start in this run.

All paths below are from the repo root. `S=.claude/skills/verify/scripts`.

## Launch

```bash
S=.claude/skills/verify/scripts
$S/up.sh                     # or VERIFY_RUN=<id> $S/up.sh to pick the id
```

It builds the image (`Dockerfile.verify`), starts `db` and `redis` and waits for them to be healthy, then starts `api`, which runs `prisma generate`, `build`, `migrate deploy`, `seed`, `start:prod`, the same steps as production. Ready is the `READY` line. The script waits until `GET /` answers 200, which happens only after migrations and the seed finish. The first build takes about 2 minutes, and later builds reuse the `bun install` layer while `bun.lock` stays the same. It prints:

```
READY
export VERIFY_RUN=0119-120301-1234
BASE_URL=http://127.0.0.1:<port>/envocc-card/api/v2
EVIDENCE=/home/<you>/.local/state/envocc-verify/<run>
```

Each Bash call is a new shell. Prefix every later command with `VERIFY_RUN=<id>`, or `export` it in the same call.

The image is a snapshot. Code edited after `up.sh` is not in it, so run `down.sh` then `up.sh` again.

## Doctor

Run this first, and again whenever anything looks off. It only reads:

```bash
VERIFY_RUN=<id> $S/doctor.sh      # exit 0 = worth driving
```

It checks that `db`, `redis` and `api` are running in this project, that the port belongs to this project, that `GET /` returns `Hello World!`, and that the seed finished (116 organizations, 17 request statuses). It also checks that the image was built from the current `HEAD`. Startup errors are in `VERIFY_RUN=<id> $S/logs.sh [lines]`.

## Drive

```bash
VERIFY_RUN=<id> $S/api.sh <actor> <METHOD> <path> [curl args...]
```

- `actor` is any name, such as `admin`, `moph`, `user` or `anon`. Each actor has its own cookie jar under the evidence dir, so log an actor in once and later calls as that actor stay authenticated.
- `path` is relative to the global prefix: `users/me`, `admins/users?page=1&status=ongoing`.
- JSON: `-H 'Content-Type: application/json' -d '{...}'`. Uploads: `-F govCard=@.claude/skills/verify/fixtures/govcard.pdf`.
- The body goes to stdout and `HTTP <code>` to stderr. The exit code is 0 for 2xx/3xx and 1 otherwise. A 4xx you expected is a pass. Check the code yourself and don't use `|| exit`.

Start from an empty database. The seed has no users and no admin whose password you know, so the first step of most journeys is the real registration path. Copy-paste bodies are in [features/accounts.md](features/accounts.md). Other side-effect checks:

```bash
VERIFY_RUN=<id> $S/db.sh 'select * from requests where "userId"=1 order by id'   # read-only SQL
VERIFY_RUN=<id> $S/assets.sh                                                     # files under /app/assets
```

Seed facts that journeys rely on:

| Org id | Code | Level | Notes |
|---|---|---|---|
| 1 | 15000 | MINISTRY | MOPH: register an admin here for Ministry-admin and MOPH-admin routes |
| 2 | 21000 | MINISTRY | a Ministry admin who is not MOPH |
| 4 | 21003 | DEPARTMENT | under org 1. The default org for users and admins in the recipes |

Position `201` (นายแพทย์) and position level `2` (ชำนาญการ) exist. Address province ids are real (`10` = Bangkok), and amphure, district and zip code are free numbers.

## Evidence

Everything goes to `~/.local/state/envocc-verify/<run>/`, which is outside the repo and is kept after cleanup:

- `transcript.md`: every `api.sh`, `db.sh` and `assets.sh` call with its method, path, actor, status, the curl args (passwords masked) and the body.
- `instance.env`: run id, base URL, git `HEAD` and the number of dirty paths the image was built from.
- `build.log`: the image build. `api.log` is the full api log, saved by `down.sh`.

Proof standards:

- Drive the real user path: register → log in → call the route. Don't insert rows or call test-only code to reach a state. If a state can only be reached through admin routes, use those routes as an admin.
- Show the action and the resulting state: the call, then a second read (`GET users/me/requests/latest`, an admin list, `db.sh`).
- Check side effects next to the response: status-history rows in `requests`, file rows (`gov_card_files`, `photos`, `exp_files`, ...) and the files in `assets.sh`. A deleted file has to be gone from both.
- Check the refusals too: the 403/400 for the wrong status, the wrong org or the wrong admin level.
- Mail is not wired up (no `SMTP_*` env). A password-reset request queues a job that then fails to send. Prove the token row and the queued job, never delivery.

Quote the transcript lines that prove the claim when you report, and give the evidence dir path.

## Cleanup

```bash
VERIFY_RUN=<id> $S/down.sh
```

It saves `api.log` and then removes only this project's containers, volumes and image, and the cookie jars. It fails if a container is left. It never removes the evidence dir. Run it after every failed attempt too. To find runs left behind: `docker ps -a --filter label=com.docker.compose.project --format '{{.Label "com.docker.compose.project"}}' | grep envocc-verify- | sort -u`.

## Helpers

| Script | Use |
|---|---|
| `scripts/up.sh` | build + start + wait for ready, prints `VERIFY_RUN` |
| `scripts/doctor.sh` | read-only health check |
| `scripts/api.sh` | one HTTP call as one actor, logged |
| `scripts/db.sh` | one read-only SQL query, logged |
| `scripts/assets.sh` | list uploaded files, logged |
| `scripts/logs.sh` | tail of the api log |
| `scripts/down.sh` | teardown that keeps the evidence |

`fixtures/govcard.pdf` and `fixtures/photo.png` are minimal valid upload files.

## Where this differs from production

- `Dockerfile.verify` uses `oven/bun:1.3.0` (the version in `mise.toml`) and `bun.lock`. The repo `Dockerfile` (`oven/bun:1.1.29`, Debian 11) fails at `apt-get install` because the Debian 11 security mirror returns 404, and it installs without a lockfile.
- Env values are dummies from `compose.verify.yml`. There is no SMTP, no ngrok or cloudflared, and nothing is published beyond loopback.

## Feature map

Per-feature recipes are in [features/README.md](features/README.md). A proof that drives one entry point is incomplete when the map lists others.
