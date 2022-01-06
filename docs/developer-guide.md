# Developer Guidelines

## Setting up the local development environment

- [`asdf`](https://asdf-vm.com/#/core-manage-asdf) is a tool to manage the required packages with specific versions.
- All the packages are defined in `tool-versions`:
  - nodejs 12.18.3
  - yarn 1.22.4
  - python 3.8.6
  - postgres 11.4
  - terraform 0.14.4

### Installation

1. Install `asdf` according to the `asdf` installation guide.
   - https://asdf-vm.com/#/core-manage-asdf?id=install
1. Install `asdf` packages defined in `.tool-versions`.
   ```sh
      cat .tool-versions | cut -f 1 -d ' ' | xargs -n 1 asdf plugin-add || true
      asdf plugin-update --all
      asdf install
      asdf reshim
   ```

### Setup

1. Copy environment variables
   ```sh
     make setup_env
   ```

_**Note:** The defaults will get you up and running, but actual credentials are required for full functionality._

2. Install dependencies

   ```sh
    make server_install
    make app_install
   ```

   _**Note:** Installing all dependencies the first time will take a while._

3. Start the local `postgres` server (`pg_ctl start` if you installed it with `asdf`)
4. Generate initial database schemas, fields, functions and related objects.
   ```sh
    make local_db
   ```

_**Note:** If the script has logged `migration done` but won't close, you can exit with `ctrl + c`._

5. Start the server

```sh
make server
```

6. In another terminal, start the app
   ```sh
    make app
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
