# Setup Production Environment to Run Load Tests for CSS API

## Create Team and Integration

- Login to `https://bcgov.github.io/sso-requests-test`
- Create a team and request a CSS API Account
- Save API Account Client id and team id (there is an option to download client configuration in json format)
- Create an Integration associated with your new team
- Save the integration client id (there is an option to download client configuration in json format)

## Deploy Keycloak

- Login in to `https://console.apps.gold.devops.gov.bc.ca/k8s/cluster/projects` and copy the token to login via `oc` from your local terminal

  ```
  cd sso-requests/loadtests/keycloak

  oc login --token=<YOUR_TOKEN> --server=https://api.gold.devops.gov.bc.ca:6443

  oc project <NAMESPACE>
  ```

- Use helm command to deploy keycloak

  ```
  export KEYCLOAK_USERNAME=

  export KEYCLOAK_PASSWORD=

  export NAMESPACE=

  cd sso-requests/loadtests/keycloak

  helm repo add sso-charts https://bcgov.github.io/sso-helm-charts

  helm repo update

  helm upgrade --install sso-keycloak sso-charts/sso-keycloak -n $NAMESPACE --version v1.14.2 -f values.yml --set admin.username=$KEYCLOAK_USERNAME --set admin.password=$KEYCLOAK_PASSWORD
  ```

## Initialize Keycloak

- Copy `terraform.tfvars.example` to `terraform.tfvars` and update the values. Some of them can be updated using the values saved from the previous steps

- Run below terraform commands to initialize the keycloak

  ```
  oc project $NAMESPACE

  terraform init

  terraform plan

  terraform apply --auto-approve
  ```

## Deploy AWS Resources

- Run below commands to generate artifacts

  ```
  export LOAD_TEST_KEYCLOAK_URL=

  cd sso-requests/loadtests

  sh generate-artifacts.sh $LOAD_TEST_KEYCLOAK_URL/auth/realms/standard/.well-known/openid-configuration
  ```

- Login to `https://oidc.gov.bc.ca/auth/realms/umafubc9/protocol/saml/clients/amazon-aws` and copy the credentials

  ```
  export AWS_ACCESS_KEY_ID=

  export AWS_SECRET_ACCESS_KEY=

  export AWS_SESSION_TOKEN=

  export AWS_DEFAULT_REGION=
  ```

- Navigate to `sso-requests/loadtests/lambdas` and copy `terraform.tfvars.example` to `terraform.tfvars` and update the values

- Run below terraform commands to deploy AWS resources

  ```
  oc project $NAMESPACE

  terraform init

  terraform plan

  terraform apply --auto-approve
  ```

## Run Load Tests

- Setup the environment variables

  ```
  cd sso-requests/lambda/css-api/k6-tests

  export K6_CLIENT_ID=
  export K6_CLIENT_SECRET=
  export K6_ENVIRONMENT=
  export K6_USERNAME=
  export K6_CSS_API_URL=
  export K6_KEYCLOAK_TOKEN_URL=
  ```

- Run the load tests

  ```
  k6 run -e client_id=$K6_CLIENT_ID -e client_secret=$K6_CLIENT_SECRET -e environment=$K6_ENVIRONMENT -e username=$K6_USERNAME -e css_api_url=$K6_CSS_API_URL -e keycloak_token_url=$K6_KEYCLOAK_TOKEN_URL load-tests.js --http-debug="full"
  ```

## Uninstall Keycloak and AWS Resources

- Login to openshift from your local terminal
- Remove keycloak and associated resources

  ```
  export NAMESPACE=

  helm uninstall sso-keycloak -n $NAMESPACE

  kubectl delete pvc -n $NAMESPACE -l "app.kubernetes.io/name=sso-patroni"

  kubectl delete configmap -n $NAMESPACE -l "app.kubernetes.io/name=sso-patroni"
  ```

- Remove AWS resources by running below commands

  ```
  cd sso-requests/loadtests/lambdas

  terraform destroy --auto-approve
  ```
