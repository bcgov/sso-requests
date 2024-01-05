#!make

SHELL := /usr/bin/env bash

.PHONY: install_all
install_all:
	yarn install
	yarn --cwd ./shared install
	@cd app; make install
	@cd db; make install
	@cd css-api; make install
	@cd siteminder-tests-scheduler; make install

.PHONY: build_all
build_all:
	yarn install
	yarn --cwd ./shared install
	@cd app; make build
	@cd db; make build
	@cd css-api; make build
	@cd siteminder-tests-scheduler; make build
