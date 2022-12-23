# Locally

- Copy the token from `/systems-manager/parameters/octk/tfc/team-token`
- Create `.terraformrc` and configure tfc team token

  ```json
  credentials "app.terraform.io" {
   token = "<TFC_TEAM_TOKEN>"
  }
  ```

- Save path of `.terraformrc` in an env var - `export TF_CLI_CONFIG_FILE=<PATH_TO_TERRAFORMRC>`
