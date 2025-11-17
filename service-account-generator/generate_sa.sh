#!/bin/bash
set -e

usage() {
    cat <<EOF
Creates a service account for the dev and prod environments of the project in b29129
namespace licence plate arg.

Usages:
    $0
EOF
}



licence_plate="b29129"

# create service account in prod
oc -n "$licence_plate"-prod create sa sso-action-deployer-"$licence_plate"



create_role_and_binding() {
  if [ "$#" -lt 2 ]; then exit 1; fi
  licence_plate=$1
  env=$2
  namespace="$licence_plate-$env"

  oc process -f ./templates/role-gold.yaml -p NAMESPACE="$namespace" | oc -n "$namespace" apply -f -

  oc -n "$namespace" create rolebinding sso-action-deployer-role-binding-"$namespace"   \
  --role=sso-action-deployer-"$namespace" \
  --serviceaccount="$licence_plate"-prod:sso-action-deployer-"$licence_plate"
}

# for dev and prod create the role and role binding
create_role_and_binding "$licence_plate" "prod"

# create_role_and_binding "$licence_plate" "test"

create_role_and_binding "$licence_plate" "dev"
