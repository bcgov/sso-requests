#!/bin/bash
if [[ -n "$1" ]]; then
 db="$1"
else
 db="ssorequests"
fi

echo "SELECT 'CREATE DATABASE $db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$db')\gexec" | psql -d postgres
