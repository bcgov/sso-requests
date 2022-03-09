SHELL := /usr/bin/env bash

.PHONY: lambda-all
lambda-all:
	yarn install
	yarn --cwd ./shared install
	@cd app; make lambda
	@cd db; make lambda
	@cd actions; make lambda
