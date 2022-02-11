SHELL := /usr/bin/env bash

TARGET := ../../../terraform/lambda-actions.zip

.PHONY: lambda
lambda:
	@rm -rf build
	@yarn install
	@yarn tsc
	@rm -rf bundle
	@mkdir -p bundle
	@cp package.json bundle
	@cp -r build/* bundle
	@cd bundle; yarn --production > /dev/null 2>&1
	@rm bundle/yarn.lock bundle/package.json
	@rm -f $(TARGET)
	@yarn copy-templates # copy html templates as typescript does not import them
	@cd bundle; zip -rq $(TARGET) *
	@rm -rf bundle
