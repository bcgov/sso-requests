# Developer Guidelines

The guidelines assume the usage of a Ubuntu workstation.

## Setting up the local development asdf environment

- [`asdf`](https://asdf-vm.com/#/core-manage-asdf) is a tool to manage the required packages with specific versions.
- All the packages are defined in `tool-versions` in the root directory of the repository.

### Installation

1. If running ubuntu, make sure that you have all the following packages installed.

   - `sudo apt-get install libsqlite3-dev bzip2`
   - `sudo apt-get install icu-devtools`
   - `sudo apt-get install uuid-dev`
   - `sudo apt install git curl`
   - `sudo apt install libreadline-dev`
   - `sudo apt install pre-commit`
   - `sudo apt install gitlint`

1. Navigate to the root directory of the repository.
1. Install `asdf` according to the `asdf` installation guide.
   - https://asdf-vm.com/#/core-manage-asdf?id=install
1. Install `asdf` packages defined in `.tool-versions`.

   ```sh
      cat .tool-versions | cut -f 1 -d ' ' | xargs -n 1 asdf plugin-add || true
      asdf plugin-update --all
      asdf install
      asdf reshim
   ```

1. Confirm the libraries have been properly installed by running `asdf current`. The output will tell you if any packages failed to download.
1. Postgres in particular has issues installing on Ubuntu systems. There are some instalation instructions here [asdf-postgres](https://github.com/smashedtoatoms/asdf-postgres). Postgres needs to be manually started with `pg_ctl start` and stopped with `pg_ctl stop` before and after running the app.
1. Run `pip install -r requirements.txt` to install python packages
   - _**Note:** If running into as asdf error, try running `asdf reshim`_
1. Run `pre-commit install`
1. Run `gitlint install-hook`

## Evironment Setup

- Copy environment variables

  ```sh
    make setup_env
  ```

_**Note:** The defaults will get you up and running, but actual credentials are required for full functionality._

These secrets and configuration variables can be requested from other team developers or found in the dev test and prod sandbox environments. `(dev., test.,'')sandbox.loginproxy.gov.bc.ca`.

## Local vs Docker setup

You could run the apps locally on your host machine using npm commands or in your docker environment using docker compose

### Run Locally

- Install dependencies

  ```sh
   make app_install
  ```

  _**Note:** Installing all dependencies the first time will take a while._

- Start the local `postgres` server (`pg_ctl start` if you installed it with `asdf`)
- Generate initial database schemas, fields, functions and related objects.

  ```sh
  make local_db
  ```

- Generate initial test database schemas

  ```sh
  make local_test_db
  ```

_**Note:** If the script has logged `migration done` but won't close, you can exit with `ctrl + c`._

- Start the app

  ```sh
  make app
  ```

### Run in Docker Containers

#### Requirements

- Docker (preferebly docker engine and CLI)

#### Install Docker

- Details here: https://docs.docker.com/engine/install/ubuntu/
- Install Docker Compose: `sudo apt install docker-compose`
- After the install: Add your current user to the docker group.
  `sudo usermod -aG docker $USER`
- Logout/Login to activate

#### For Visual Code

- Install Microsoft Docker Plugin in VC
- Connect to DockerHub with your password and valid access token (https://hub.docker.com/settings/security)
- In VC terminal run to test:
  `docker run hello-world`

#### Steps

- Run `make setup_env` from the root directory to generate,

  - `.env` file under `./app` folder

- To build and start the containers (postgres, next app and backend app)

  ```bash
  docker-compose up -d
  ```

- To stop the containers

  ```bash
  docker-compose down
  ```

Add the `--volume` flag to the previous command to clean up volumes after completion.

#### MACs only Docker Compose for Local Development Environment

- Since `amd64` based keycloak images cannot run on Macbooks anymore, below steps are required to setup keycloak
- Build base keycloak docker image using `https://github.com/keycloak/keycloak-containers/blob/18.0.2/server/Dockerfile`
- Use `https://github.com/bcgov/sso-keycloak/blob/dev/docker/keycloak/Dockerfile-7.6` for reference to build sso-keycloak:latest
- Update `./docker-compose.yaml` using below service configuration

```
  dev-keycloak:
    container_name: dev-keycloak
    image: sso-keycloak:26.0.6
    command: ['-Djboss.socket.binding.port-offset=1000']
    depends_on:
      - sso-db
    ports:
      - 9080:9080
    environment:
      DB_VENDOR: POSTGRES
      DB_PORT: 5432
      DB_USER: keycloak
      DB_PASSWORD: keycloak
      DB_ADDR: sso-db:5432
      DB_DATABASE: keycloak
      KEYCLOAK_USER: admin
      KEYCLOAK_PASSWORD: admin
      KEYCLOAK_LOGLEVEL: INFO
      ROOT_LOGLEVEL: INFO
    networks:
      - css-net
```

## Code style and Linting

We use pre-commit to run local linting when committing changes. To install this as a hook, run

```sh
 pre-commit install
```

## Testing

To run tests for the front-end application, run

```sh
  make app_test
```

For the backend application, run:

```sh
  make api_test
```

### Cypress tests

We now have a cypress test suite built out. These can be run against a local version of the app using the docker instances.

#### Step 0) Requirements

- nodejs version 20
- docker-compose 2.24.6

#### Step 1) Run app locally

Using `docker-compose`, run the app locally.

```
docker-compose build
docker-compose up
```

Confirm the containers are up using `docker ps`, there should be six containers running. Confirm the standard realm has been created in the keycloak containers. Local username and password are created by the docker-compose file.

#### Step 2) Configure cypres environment

Pull a copy of the [sso-requests-e2e](https://github.com/bcgov/sso-requests-e2e/) repo. The environment will need to be changed to run against the local CSS app. In the file `/testing/cypress.env.json` set `{"host": "http://localhost:3000", "smoketest": true, "localtest": true}`.

#### Step 3) Configure the initial test data

Currently there are two pieces of seed data needed in the test environment for the tests to run. Any time the local database volumes are purged they will need to be recreated. There is a WIP to automate this using cypress, the documentation will be updated when this is possible.

There is a WIP to do this using cypress, however until that change is merged we need to create a team and integration manually.

Log into the local css app with the default account from the `cypress.config.ts` file.

The team name is: "Roland and Training Account" and and admin with email "pathfinder.ssotraining2@gov.bc.ca" is added to that team.

The integration that must be created is: "Test Automation do not delete".

- Connect it to the "Roland and Training Account" team.
- It needs three IDPs "Idir", "Idir - MFA", and "Basic or Business BCeID".
- It is integrated with dev, test, and prod.
- The redirect urls are `*`, `*`, `any-valid-url.com`.

#### Step 4) Run the tests.

To delete old data run:

```
npm run delete:local
npm run deleteteams:local
```

These many not complete successfully, but that will not block the actual tests.

To run all the integration tests, use the command:

`npm run integrations:local`

## Committing

Our repository uses commit linting. If pre-commit is installed it will tell you if your commit message is valid.
In general, commits should have the format `<type>:name` followed by a descriptive lower-case message, e.g:

`git commit -m "feat: button" -m "add a button to the landing page"`.

## Team Conventions

### Frontend

1. When adding functions to call out to APIs (including our backend), those should be included in `app/services`. To prevent
   application errors when using these services, we add error handling in the service function, and return and array
   `[data, error]` where `data` wil be null if there was an error, and `error` will be null if the request succeeded. e.g:

```javascript
export const getTeamMembers = async (id?: number) => {
  try {
    const result = await instance.get(`teams/${id}/members`).then((res) => res.data);
    return [result, null];
  } catch (err) {
    return handleAxiosError(err);
  }
};
```

2. To help with organization when adding new react components, we have broken them into the following folders:

   - `app/page-partials/<page-name>`: Include a component here if it is specific to a page and won't be reused
   - `html-components`: Include a component here if it is a styled html component, e.g `table` or `button`
   - `form-components`: Components specific to the form flow should be included here`
   - `components`: Include other components here

### Backend

1. Most error handling can be done at the route level with `try` and `catch`, see `lambda/app/src/routes.ts`.
   Controllers will then be caught. More custom error-handling in controller or helper functions should only
   be added if the specific function failing should still return a 200 status.

## Public ACM certificates

The AWS API Gateway is served on custom domains with free public AWS certificates; the main point here is to validate the ownership of the domains via AWS ACM to issue the valid certificate. The steps to attach the validated certificate to the API Gateway servies are:

1. `Request a certificate`: the following Terraform script creates the certificate:

   - [aws_acm_certificate](../terraform/certificates.tf)

1. `Create a CNAME record for validation`: once the certificate is created, create a `CNAME` record based on the DNS configuration in DNS panel.

   - the DNS configuration, `CNAME name` and `CNAME value`, can be found in the `AWS Certificate Manager (ACM)`.

1. Wait for the DNS lookup change applied; you can use the online DNS lookup tool to confirm the change:

   - see https://toolbox.googleapps.com/apps/dig/

1. `Domain name & API Gateway service binding`: after the `AWS Certificate Manager (ACM)` flags the status of the domain certificate as `Success`, then you can attach the domain address to the API Gateway service.

   - [aws_apigatewayv2_api_mapping](../terraform/certificates.tf)

1. `Create a CNAME record for the domain`: once the API Gateway is properly configured with the random domain endpoint created, create another `CNAME` that points to the random domain endpoint.

### References

- see https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html
- see https://aws.amazon.com/blogs/security/easier-certificate-validation-using-dns-with-aws-certificate-manager/
