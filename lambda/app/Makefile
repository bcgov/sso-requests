SHELL := /usr/bin/env bash

TARGET := ../../../terraform/lambda-app.zip

.PHONY: lambda
lambda:
	@rm -rf build
	@rm -rf ./src/schemas
	@rm -rf ./src/interfaces
	@mkdir ./src/schemas
	@mkdir ./src/interfaces
	@cp ../../app/schemas/providers.ts ./src/schemas/providers.ts
	@cp ../../app/schemas/requester-info.ts ./src/schemas/requester-info.ts
	@cp ../../app/schemas/terms-and-conditions.ts ./src/schemas/terms-and-conditions.ts
	@cp -r ../../app/interfaces ./src/
	@yarn tsc
	@mkdir -p bundle
	@cp package.json bundle
	@cp -r build/* bundle
	@cd bundle; yarn --production > /dev/null 2>&1
	@rm bundle/yarn.lock bundle/package.json
	@rm -f $(TARGET)
	@cd bundle; zip -rq $(TARGET) *
	@rm -rf bundle
