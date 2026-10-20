# The observability stack (ADR 0002) on the pilot server, run from the laptop.
# From the repository root:
#
#   make -C deploy/observability env HOST=<ssh host> FILE=<local env file>   # once
#   make -C deploy/observability network HOST=<ssh host>                     # once
#   make -C deploy/observability run check HOST=<ssh host>                   # every change
#
# The env file holds GRAFANA_ADMIN_PASSWORD (and optionally GRAFANA_ADMIN_USER,
# GRAFANA_PORT, GRAFANA_ROOT_URL), read by Grafana only on its first start.
# `sync` (and so `run`) copies a commit, never the working tree: TAG defaults
# to the tip of BRANCH (main). HOST has no default,
# so no command reaches a server it did not name. `make -n <target>` prints
# what it would run.
#
# Locally, without HOST, against the working tree:
#
#   make -C deploy/observability run-local check-local down-local

SHELL := /bin/bash

BRANCH ?= main
TAG    ?= $(shell git rev-parse --short $(BRANCH))
ROOT   := $(shell git rev-parse --show-toplevel)

PROJECT := envocc-observability
# The external network the api joins to reach the Collector.
NETWORK := telemetry

# Expanded here, run on the server, where `~` is the server's home. The server
# never holds the repository: ~/envocc-observability has this directory's
# config (no Makefile) and observability.env.
D  := ~/envocc-observability
DC := docker compose --project-name $(PROJECT) --env-file $(D)/observability.env -f $(D)/compose.yml

# Locally: this directory, with a generated, git-ignored local.env.
L   := $(CURDIR)
DCL := docker compose --project-name $(PROJECT) --env-file $(L)/local.env -f $(L)/compose.yml

# What the server gets: everything here but this Makefile.
CONFIG := compose.yml otelcol.yml tempo.yml loki.yml prometheus.yml grafana check.sh

.DEFAULT_GOAL := help

# Every server target must name HOST on the command line; help and the local
# targets, which never leave this machine, need none.
LOCAL_GOALS := help run-local check-local logs-local down-local
ifneq ($(filter-out $(LOCAL_GOALS),$(or $(MAKECMDGOALS),help)),)
ifneq ($(origin HOST),command line)
$(error HOST is required: make $(MAKECMDGOALS) HOST=<ssh host>)
endif
endif
.PHONY: help env network sync run check ps logs dc down $(LOCAL_GOALS)

help:
	@echo 'Once:       env FILE=<local env file> [FORCE=1]    network'
	@echo 'Deploy:     run check        (run syncs first)'
	@echo 'Steps:      sync  run  check'
	@echo 'Operate:    ps  logs  dc ARGS="<compose args>"'
	@echo 'Stop:       down             (keeps the stored telemetry)'
	@echo 'Every target above needs HOST=<ssh host>.'
	@echo 'Locally:    run-local  check-local  logs-local  down-local'
	@echo 'Now:        BRANCH=$(BRANCH) TAG=$(TAG)'

# Copies a local env file to the server as observability.env, readable only by
# its owner. Refuses to replace an existing one; FORCE=1 replaces it. A
# relative FILE is from the repository root.
ENV_FILE = $(if $(filter /%,$(FILE)),$(FILE),$(ROOT)/$(FILE))

env:
	@[ -n "$(FILE)" ] && [ -f "$(ENV_FILE)" ] || { echo 'Usage: make env FILE=<local env file> (not found: $(ENV_FILE))' >&2; exit 1; }
	@[ -n "$(FORCE)" ] || ! ssh $(HOST) 'test -f $(D)/observability.env' || { echo '$(D)/observability.env exists on $(HOST): add FORCE=1 to replace it.' >&2; exit 1; }
	ssh $(HOST) 'mkdir -p $(D) && umask 077 && cat > $(D)/observability.env' < $(ENV_FILE)

# The network the api and the Collector share. Safe to repeat.
network:
	ssh $(HOST) "docker network inspect $(NETWORK) >/dev/null 2>&1 || docker network create $(NETWORK)"

# This directory's config at TAG, replacing what the server had.
sync:
	@ssh $(HOST) 'test -f $(D)/observability.env' || { echo 'No observability.env on $(HOST): run `make env` first.' >&2; exit 1; }
	@[ "$$(git -C $(ROOT) rev-parse $(TAG))" = "$$(git -C $(ROOT) rev-parse HEAD)" ] && git -C $(ROOT) diff --quiet HEAD -- . || echo 'note: syncing $(TAG); uncommitted or unmerged changes here are not synced'
	@ssh $(HOST) 'docker network inspect $(NETWORK) >/dev/null 2>&1' || { echo 'No $(NETWORK) network on $(HOST): run `make network` first.' >&2; exit 1; }
	git -C $(ROOT) archive --format=tar $(TAG):deploy/observability $(CONFIG) | \
	  ssh $(HOST) 'cd $(D) && rm -rf $(CONFIG) && tar -x'
	ssh $(HOST) "$(DC) config --quiet && echo config ok"

# Safe to repeat: the stores keep their volumes, and only what changed restarts.
run: sync
	ssh $(HOST) "$(DC) up -d --remove-orphans && $(DC) ps"

# A span, a log line and a metric through the Collector into Tempo, Loki and
# Prometheus, an email and a JWT that must arrive redacted, and nothing
# published beyond loopback: check.sh says which.
check:
	ssh $(HOST) "bash $(D)/check.sh $(PROJECT)"

ps:
	ssh $(HOST) "$(DC) ps"

logs:
	ssh $(HOST) "$(DC) logs --tail 50"

dc:
	ssh -t $(HOST) "$(DC) $(ARGS)"

down:
	ssh $(HOST) "$(DC) down"

# --- local ------------------------------------------------------------------

$(L)/local.env:
	umask 077 && echo "GRAFANA_ADMIN_PASSWORD=$$(od -An -N12 -tx1 /dev/urandom | tr -d ' \n')" > $@
	@echo 'Grafana: admin, password in $@'

run-local: $(L)/local.env
	docker network inspect $(NETWORK) >/dev/null 2>&1 || docker network create $(NETWORK)
	$(DCL) up -d --remove-orphans
	$(DCL) ps

check-local:
	bash $(L)/check.sh $(PROJECT)

logs-local:
	$(DCL) logs --tail 50

# -v to start from empty stores: make down-local ARGS=-v
down-local:
	$(DCL) down $(ARGS)
