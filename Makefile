SHELL := /usr/bin/env bash

.PHONY: app_install
app_install:
	yarn --cwd ./app install

.PHONY: app_test
app_test:
	yarn --cwd ./app test

.PHONY: app
app:
	yarn --cwd ./app dev

.PHONY: server_install
server_install:
	yarn install
	@cd lambda; make lambda-all
	yarn --cwd ./localserver install

.PHONY: server
server:
	yarn --cwd ./localserver dev

.PHONY: local_db
local_db:
	pushd db && bash ./setup.sh && popd
	yarn --cwd ./localserver migrate-db
