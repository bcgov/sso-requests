SHELL := /usr/bin/env bash

.PHONY: lambda
lambda:
	yarn tsc
	mkdir bundle
	cp package.json bundle
	cp built/main.js bundle
	cp built/authenticate.js bundle
	cp built/db.js bundle
	cd bundle; yarn --production
	rm bundle/yarn.lock bundle/package.json
	cd bundle; zip -r ../../../terraform/router.zip main.js node_modules authenticate.js db.js
	rm -rf bundle
