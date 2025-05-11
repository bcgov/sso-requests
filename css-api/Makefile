#!make

SHELL := /usr/bin/env bash
TARGET := ../../../terraform/lambda-css-api.zip

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
	@yarn copy-templates
	@cd dist; rm -f $(TARGET); zip -rq $(TARGET) *
build: swagger

.PHONY: swagger
swagger:
	@rm -rf swagger-ui-dist
	@yarn swagger-autogen
	@cp -r node_modules/swagger-ui-dist .
	@cp src/swagger-* swagger-ui-dist/
	@rm -rf ../../terraform/swagger-ui-dist
	@mv swagger-ui-dist ../../terraform/
