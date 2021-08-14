#!make

SHELL := /usr/bin/env bash

TARGET := ../terraform/migration.zip

.PHONY: lambda
lambda:
	@rm -rf build
	@yarn tsc
	@mkdir -p bundle
	@cp package.json bundle
	@cp -r build/* bundle
	@cd bundle; yarn --production > /dev/null 2>&1
	@rm bundle/yarn.lock bundle/package.json
	@rm -f $(TARGET)
	@cd bundle; zip -rq $(TARGET) *
	@rm -rf bundle
