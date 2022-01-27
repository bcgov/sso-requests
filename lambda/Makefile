SHELL := /usr/bin/env bash

.PHONY: lambda-all
lambda-all:
	@cd app; make lambda
	@cd db; make lambda
	@cd actions; make lambda
	yarn install
	yarn --cwd ./shared install
