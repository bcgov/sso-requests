SHELL := /usr/bin/env bash

TARGET := ../../../terraform/lambda-app.zip

.PHONY: copy-schema
copy-schema:
	@rm -rf ./src/schemas
	@rm -rf ./src/interfaces
	@mkdir ./src/schemas
	@mkdir ./src/interfaces
	@cp -r ../../app/schemas/shared/* ./src/schemas
	@cp -r ../../app/interfaces ./src/

.PHONY: copy-helpers
copy-helpers:
	@rm -rf ./src/utils/customValidate.ts
	@cp ../../app/utils/shared/customValidate.ts ./src/utils/customValidate.ts


.PHONY: lambda
lambda: copy-schema
lambda: copy-helpers
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
	@cd bundle; zip -rq $(TARGET) *
	@pwd
	@yarn copy-templates # copy html templates as typescript does not import them
	@rm -rf bundle
