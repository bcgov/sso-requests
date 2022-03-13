SHELL := /usr/bin/env bash

.PHONY: app_install
app_install:
	yarn --cwd ./app install

.PHONY: setup_env
setup_env:
	@cd app; cp .env.example .env
	@cd localserver; cp nodemon.example.json nodemon.json

.PHONY: app_test
app_test:
	yarn --cwd ./app test

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
	pushd db && bash ./setup.sh && bash ./setup.sh ssorequests_test && popd
	yarn --cwd ./localserver migrate-db
