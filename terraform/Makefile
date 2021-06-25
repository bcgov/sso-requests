SHELL := /usr/bin/env bash

.PHONY: lambda
lambda:
	cd lambda; yarn tsc
	mkdir bundle
	cp lambda/package.json bundle
	cp lambda/built/main.js bundle
	cd bundle; yarn --production
	rm bundle/yarn.lock bundle/package.json
	cd bundle; zip -r ../bundle.zip main.js node_modules
	rm -rf bundle
