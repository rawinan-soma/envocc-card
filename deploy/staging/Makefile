# The staging server's deploy, run from the laptop. From the repository root:
#
#   make -C deploy/staging env HOST=<ssh host> FILE=docker.env   # once: the server's docker.env
#   make -C deploy/staging deploy HOST=<ssh host>                # every time: build … check
#   make -C deploy/staging rollback HOST=<ssh host> TAG=<sha>
#
# Every target deploys a commit, never the working tree: TAG defaults to the
# tip of BRANCH (main). HOST has no default, so no command reaches a server it
# did not name. `make -n <target>` prints what it would run.

SHELL := /bin/bash

BRANCH   ?= main
TAG      ?= $(shell git rev-parse --short $(BRANCH))
IMAGE    := rawinan/envocc-card-api
PLATFORM ?= linux/amd64
ROOT     := $(shell git rev-parse --show-toplevel)

# The api's port on the server (docker-compose.yaml) and its global prefix.
PORT   := 3333
PREFIX := envocc-card/api/v2

# Expanded here, run on the server, where `~` is the server's home. The server
# never holds the repository: ~/envocc-staging has the two compose files,
# prisma/data (the seed's input), assets/ (uploads), docker.env and release.env.
# Every file is named by absolute path, so $(DC) can sit on the right of a pipe.
D  := ~/envocc-staging
DC := docker compose --project-name envocc-staging --env-file $(D)/docker.env --env-file $(D)/release.env -f $(D)/docker-compose.yaml -f $(D)/compose.staging.yml

.DEFAULT_GOAL := help

# Every target but help and build talks to the server, so it must be named on
# the command line (a `make rollback` passes it on to its sub-make).
ifneq ($(filter-out help build,$(or $(MAKECMDGOALS),help)),)
ifneq ($(origin HOST),command line)
$(error HOST is required: make $(MAKECMDGOALS) HOST=<ssh host>)
endif
endif
.PHONY: help env build sync run check deploy rollback ps logs dc down reset

help:
	@echo 'Once:       env FILE=<local env file> [FORCE=1]'
	@echo 'Deploy:     deploy           (build, sync, run, check)'
	@echo 'Roll back:  rollback TAG=<sha>'
	@echo 'Steps:      build  sync  run  check'
	@echo 'Operate:    ps  logs  dc ARGS="<compose args>"'
	@echo 'Stop:       down    reset (deletes the database)'
	@echo 'Every target but build needs HOST=<ssh host>.'
	@echo 'Now:        BRANCH=$(BRANCH) TAG=$(TAG)'

# Copies a local env file to the server as docker.env, readable only by its
# owner. Refuses to replace an existing one; FORCE=1 replaces it. A relative
# FILE is from the repository root, since `make -C` runs from deploy/staging.
ENV_FILE = $(if $(filter /%,$(FILE)),$(FILE),$(ROOT)/$(FILE))

env:
	@[ -n "$(FILE)" ] && [ -f "$(ENV_FILE)" ] || { echo 'Usage: make env FILE=<local env file> (not found: $(ENV_FILE))' >&2; exit 1; }
	@[ -n "$(FORCE)" ] || ! ssh $(HOST) 'test -f $(D)/docker.env' || { echo '$(D)/docker.env exists on $(HOST): add FORCE=1 to replace it.' >&2; exit 1; }
	ssh $(HOST) 'mkdir -p $(D) && umask 077 && cat > $(D)/docker.env' < $(ENV_FILE)

# The committed tree at TAG, for the server's architecture; untracked files
# (.env, docker.env, dist) cannot reach the image. Also tagged `stagging`, the
# tag docker-compose.yaml falls back to.
build:
	@[ "$$(git -C $(ROOT) branch --show-current)" != $(BRANCH) ] || git -C $(ROOT) diff --quiet HEAD || echo 'note: uncommitted changes are not deployed'
	git -C $(ROOT) archive --format=tar $(TAG) | \
	  docker buildx build --platform $(PLATFORM) \
	    -t $(IMAGE):$(TAG) -t $(IMAGE):stagging --push -

# The compose files and seed data at TAG, so a rollback gets its own too.
sync:
	@ssh $(HOST) 'test -f $(D)/docker.env' || { echo 'No docker.env on $(HOST): run `make env` first.' >&2; exit 1; }
	@docker buildx imagetools inspect $(IMAGE):$(TAG) >/dev/null || { echo '$(IMAGE):$(TAG) is not on Docker Hub: run `make build TAG=$(TAG)`.' >&2; exit 1; }
	git -C $(ROOT) archive --format=tar $(TAG) docker-compose.yaml prisma/data deploy/staging/compose.staging.yml | \
	  ssh $(HOST) 'mkdir -p $(D)/assets && rm -rf $(D)/prisma/data && tar -x -C $(D) && mv $(D)/deploy/staging/compose.staging.yml $(D)/ && rm -rf $(D)/deploy'
	ssh $(HOST) "docker network inspect shared-web-network >/dev/null 2>&1 || docker network create shared-web-network"
	ssh $(HOST) "echo API_TAG=$(TAG) > $(D)/release.env && $(DC) config --quiet && echo config ok"

# Safe to repeat: the database keeps its volume, migrations and the seed
# (upserts) re-run at the api's start, and only what changed restarts.
run: sync
	ssh -t $(HOST) "$(DC) pull api cloudflared && $(DC) up -d --wait database-docker redis && $(DC) up -d --remove-orphans && $(DC) ps"

# The api builds, migrates and seeds before it listens, so this waits up to
# three minutes for it to answer on the server, and stops waiting as soon as it
# is not running (exited, or restarting after a crash) to show why. Then the
# tunnel, if docker.env names its PUBLIC_URL, and what is published.
check:
	@for i in $$(seq 36); do \
	  if ssh $(HOST) 'curl -fs -o /dev/null http://127.0.0.1:$(PORT)/$(PREFIX)/'; then \
	    echo "ok    http://127.0.0.1:$(PORT)/$(PREFIX)/ answers on $(HOST)"; break; fi; \
	  if [ -z "$$(ssh $(HOST) "$(DC) ps -q --status running api")" ]; then \
	    echo "FAIL  the api exited:"; ssh $(HOST) "$(DC) logs --tail 40 api"; exit 1; fi; \
	  [ $$i -lt 36 ] || { echo "FAIL  the api did not answer in 3 minutes; see: make logs HOST=$(HOST)"; exit 1; }; \
	  echo "...   waiting for the api ($$((i * 5))s)"; sleep 5; \
	done; \
	fail=0; \
	url=$$(ssh $(HOST) "grep '^PUBLIC_URL=' $(D)/docker.env | cut -d= -f2-"); \
	if [ -z "$$url" ]; \
	  then echo "skip  the tunnel: no PUBLIC_URL in docker.env"; \
	elif curl -fs -o /dev/null "$$url/$(PREFIX)/"; \
	  then echo "ok    $$url/$(PREFIX)/ through the tunnel"; \
	  else echo "FAIL  $$url/$(PREFIX)/ through the tunnel; see: make logs HOST=$(HOST)"; fail=1; fi; \
	published=$$(ssh $(HOST) "$(DC) ps --format '{{.Ports}}'" | grep -o '[^ ,]*->' | grep -v '^127\.0\.0\.1:'); \
	if [ -z "$$published" ]; \
	  then echo "ok    nothing published beyond loopback"; \
	  else echo "FAIL  published beyond loopback: $$published"; fail=1; fi; \
	echo "running: $$(ssh $(HOST) 'cat $(D)/release.env')"; \
	exit $$fail

deploy: build run
	$(MAKE) check

# An older commit whose image is already on Docker Hub.
rollback:
	@[ "$(origin TAG)" = "command line" ] || { echo 'Usage: make rollback TAG=<sha>' >&2; exit 1; }
	$(MAKE) run check TAG=$(TAG)

ps:
	ssh $(HOST) "$(DC) ps"

logs:
	ssh $(HOST) "$(DC) logs --tail 50 cloudflared"
	ssh $(HOST) "$(DC) logs --tail 100 api"

dc:
	ssh -t $(HOST) "$(DC) $(ARGS)"

down:
	ssh $(HOST) "$(DC) down"

# What the old makefile did on every deploy: drops the database volume. The
# next `make run` migrates and seeds a fresh one.
reset:
	@read -rp 'Type "reset staging" to delete the staging database: ' a; [ "$$a" = 'reset staging' ] || { echo 'Not reset.'; exit 1; }
	ssh $(HOST) "$(DC) down --volumes"
