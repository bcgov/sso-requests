SHELL := /usr/bin/env bash

.PHONY: lambda
lambda:
	cd lambda; yarn tsc
	cd lambda/built; zip ../../exports.zip exports.js
