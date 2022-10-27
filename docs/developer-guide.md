# Developer Guidelines

## Setting up the local development environment

- [`asdf`](https://asdf-vm.com/#/core-manage-asdf) is a tool to manage the required packages with specific versions.
- All the packages are defined in `tool-versions`

### Installation

1. If running ubuntu, make sure that you have all the following packages installed.
   - `sudo apt-get install libsqlite3-dev bzip2`
   - `sudo apt-get install icu-devtools`
   - `sudo apt-get install uuid-dev`
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
1. Run `pip install -r requirements.txt` to install python packages
   - _**Note:** If running into as asdf error, try running `asdf reshim`_
1. Run `pre-commit install`
1. Run `gitlint install-hook`

### Setup

- Copy environment variables
  ```sh
    make setup_env
  ```

_**Note:** The defaults will get you up and running, but actual credentials are required for full functionality._

- You could run the apps locally on your host machine using npm commands or in your docker environment using docker compose

### Run Locally

- Install dependencies

  ```sh
   make app_install
   make server_install
  ```

  _**Note:** Installing all dependencies the first time will take a while._

- Start the local `postgres` server (`pg_ctl start` if you installed it with `asdf`)
- Generate initial database schemas, fields, functions and related objects.

  ```sh
  make local_db
  ```

_**Note:** If the script has logged `migration done` but won't close, you can exit with `ctrl + c`._

- Start the server

  ```sh
  make server
  ```

- In another terminal, start the app

  ```sh
  make app
  ```

### Run in Docker Containers

#### Requirements

- Docker (preferebly docker engine and CLI)

#### Steps

- Run `make setup_env` from the root directory to generate,

  - `.env` file under `./app` and `./localserver` folders

- To build and start the containers (postgres, next app and backend app)
  ```bash
  docker-compose up -d
  ```
- To stop the containers
  ```bash
  docker-compose down
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
  make server_test
```

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
