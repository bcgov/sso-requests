#!make

SHELL := /usr/bin/env bash
TARGET := ../../../terraform/lambda-request-monitor.zip

.PHONY: install
install:
	@yarn install

.PHONY: build
build:
	@rm -rf build
	@yarn compile

.PHONY: start
start:
	@yarn start
