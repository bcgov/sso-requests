SHELL := /usr/bin/env bash

namespace=

.PHONY: install
install:
	helm install sso-requests . -n "${namespace}" -f values.yaml -f "values-${namespace}.yaml"

.PHONY: upgrade
upgrade:
	helm upgrade --install sso-requests . -n "${namespace}" -f values.yaml -f "values-${namespace}.yaml"

.PHONY: lint
lint:
	helm upgrade --dry-run --install sso-requests -n "${namespace}" -f values.yaml -f "values-${namespace}.yaml"

.PHONY: uninstall
uninstall:
	helm uninstall sso-requests -n ${namespace}

.PHONY: force-install
force-install: uninstall
force-install: install
