#!/bin/bash

if [ "$#" -lt 1 ]; then
    exit 1
fi

declare -a targets=("actions" "app" "db" "scheduler" "shared")

for t in "${targets[@]}"; do
    yarn --cwd "./$t" remove "$1"
done
