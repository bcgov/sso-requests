SHELL := /usr/bin/env bash

.PHONY: lambda
lambda:
	yarn tsc
	mkdir bundle
	cp package.json bundle
	cp built/main.js bundle
	cd bundle; yarn --production
	rm bundle/yarn.lock bundle/package.json
	cd bundle; zip -r ../../terraform/bundle.zip main.js node_modules
	rm -rf bundle
