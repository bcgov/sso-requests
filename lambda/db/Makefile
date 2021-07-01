SHELL := /usr/bin/env bash

.PHONY: lambda
lambda:
	rm -rf build
	yarn tsc
	mkdir -p bundle
	cp package.json bundle
	cp -r build/* bundle
	cd bundle; yarn --production
	rm bundle/yarn.lock bundle/package.json
	rm ../../../terraform/lambda-db.zip
	cd bundle; zip -r ../../../terraform/lambda-db.zip *
	rm -rf bundle
