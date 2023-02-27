SHELL := /usr/bin/env bash

.PHONY: app_install
app_install:
	yarn --cwd ./app install

.PHONY: setup_env
setup_env:
	@cd app; cp .env.example .env
	@cd localserver; cp .env.example .env

.PHONY: app_test
app_test:
	yarn --cwd ./app test --collectCoverage

.PHONY: server_test
server_test:
	yarn --cwd ./lambda test

.PHONY: app
app:
	yarn --cwd ./app dev

.PHONY: server_install
server_install:
	yarn install
	@cd lambda; make install_all
	yarn --cwd ./localserver install

.PHONY: server
server:
	yarn --cwd ./localserver dev

.PHONY: local_db
local_db:
	pushd .bin && bash ./db-setup.sh && bash ./db-setup.sh ssorequests_test && popd
	yarn --cwd ./localserver migrate-db

.PHONY: schema
schema:
	bash ./.bin/db-schema.sh
