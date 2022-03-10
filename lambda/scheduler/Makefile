#!make

SHELL := /usr/bin/env bash

TARGET := ../../../terraform/lambda-schedular.zip

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
	@yarn build
	@cd dist; rm -f $(TARGET); zip -rq $(TARGET) *
