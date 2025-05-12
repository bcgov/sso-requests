SHELL := /usr/bin/env bash

.PHONY: app_install
app_install:
	yarn --cwd ./app install

.PHONY: app_build
app_build:
	yarn --cwd ./app build

.PHONY: app_start
app_start:
	yarn --cwd ./app start

.PHONY: db_install
db_install:
	yarn --cwd ./db install

.PHONY: db_compile
db_compile:
	yarn --cwd ./db compile

.PHONY: migrations
migrations:
	node ./db/dist/db/src/main.js

.PHONY: disable_telemetry
disable_telemetry:
	yarn --cwd ./app next telemetry disable

.PHONY: setup_env
setup_env:
	@cd app; cp .env.example .env
	@cd localserver; cp .env.example .env

.PHONY: app_test
app_test:
	yarn --cwd ./app/jest test --collectCoverage

.PHONY: api_test
api_test:
	yarn --cwd ./app/jest-api test-api --collectCoverage

.PHONY: app
app:
	yarn --cwd ./app dev


.PHONY: local_db
local_db:
	pushd .bin && bash ./db-setup.sh && bash ./db-setup.sh ssorequests_test && popd
	yarn --cwd ./localserver migrate-db

.PHONY: schema
schema:
	bash ./.bin/db-schema.sh
