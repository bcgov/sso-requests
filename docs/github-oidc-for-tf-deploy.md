# Steps to migrate from terraform cloud to github oidc for terraform deployments

## AWS

- Login to `https://login.nimbus.cloud.gov.bc.ca/`
- Copy the account number

### Role

- Create a role of type Web Identity
- Select `token.actions.githubusercontent.com` identity provider
- Enter `repo:bcgov/sso-requests:ref:refs/heads/<branch>` under audience
- Enter `bcgov` under GitHub org and click next
- Add required policies and click next
- Click create role
- Edit the role and select `Trust Relationships`
- Update the trusted entities

  ```json
  <!-- Update `account-number`, `branch` before using-->

  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Federated": "arn:aws:iam::<account-number>:oidc-provider/token.actions.githubusercontent.com"
        },
        "Action": "sts:AssumeRoleWithWebIdentity",
        "Condition": {
          "StringLike": {
            "token.actions.githubusercontent.com:sub": "repo:bcgov/sso-requests:ref:refs/heads/<branch>"
          },
          "ForAllValues:StringEquals": {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
            "token.actions.githubusercontent.com:iss": "https://token.actions.githubusercontent.com"
          }
        }
      }
    ]
  }
  ```

- Copy the role arn

### S3 bucket and DynamoDB table

- Create S3 bucket to hold the state. Use UI or below command to create one

  ```
  aws s3api create-bucket --bucket xgr00q-<env>-sso-requests --region ca-central-1 --create-bucket-configuration LocationConstraint=ca-central-1
  ```

- Create dynamodb table that stores the lock

  ```
  aws dynamodb create-table --table-name xgr00q-<env>-sso-requests-state-locking --attribute-definitions AttributeName=LockID,AttributeType=S --key-schema AttributeName=LockID,KeyType=HASH --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
  ```

## Github Action

- Navigate to you terraform project and configure your terraform backed as below,

  ```sh
  terraform {
    backend "s3" {
      bucket         = "<bucket-name>"
      key            = "<bucket-key>"
      region         = "ca-central-1"
      dynamodb_table = "<dynamo-db-table-name>"
    }
  }
  ```

- Add below step to your github workflow

  ```yaml
  - name: Configure AWS Credentials
    uses: aws-actions/configure-aws-credentials@v2
    with:
      role-to-assume: <role-arn-copied-from-aws>
      aws-region: ca-central-1
  ```

## Terraform state migration

- Copy the TFC token from parameter store
- Navigate to your terraform project and run `terraform login`
- Enter the copied token for login
- Login to AWS with the credentials obtained from `https://login.nimbus.cloud.gov.bc.ca/`
- Run `terraform init` to download all the modules
- Run `terraform state pull > terraform.tfstate` to save the state locally
- Update the terraform backend configuration which points to AWS S3 bucket
- Run `terraform init -migrate-state` and enter `yes` when prompted to copy over the state to newly created S3 bucket

## References

- https://bcgov.github.io/cloud-pathfinder/Github_OIDC/
- https://github.com/bcgov/startup-sample-project-aws-serverless-OIDC/blob/main/docs/tfc_to_s3_migration.md
