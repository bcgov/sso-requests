#!make

SHELL := /usr/bin/env bash

.PHONY: install
install:
	@yarn install

.PHONY: uninstall
uninstall:
	@rm -rf node_modules
	@rm -f yarn.lock

.PHONY: build
build: install
build:
	@rm -rf dist
	@yarn build
