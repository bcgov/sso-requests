#!/bin/bash

set -e

echo "Running DB migrations"
make migrations

mkdir -p /app/.next

chmod -R 777 /app/.next

echo "Building CSS app..."
make app_build

echo "Starting CSS app..."
make app_start
