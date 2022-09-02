#!make

SHELL := /usr/bin/env bash

.PHONY: install_all
install_all:
	yarn install
	yarn --cwd ./shared install
	@cd app; make install
	@cd db; make install
	@cd actions; make install
	@cd scheduler; make install
	@cd css-api; make install

.PHONY: build_all
build_all:
	yarn install
	yarn --cwd ./shared install
	@cd app; make build
	@cd db; make build
	@cd actions; make build
	@cd scheduler; make build
	@cd css-api; make build
