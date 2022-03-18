#!/bin/bash

if [[ -n "$1" ]]; then
 db="$1"
else
 db="ssorequests"
fi

pwd="$(dirname "$0")"
docs="$pwd/../docs"
target="$docs/schema"

_psql() {
  PGOPTIONS='--client-min-messages=warning' psql -q --set ON_ERROR_STOP=1 "$@" 2>&1
}

describe_table() {
  _psql -d "$db" <<<"\d $1" >> "$target"
  echo -e "\n\n" >> "$target"
}

echo "" > "$target"
describe_table requests
describe_table users
describe_table teams
describe_table users_teams
describe_table events
