# Terraform

This folder contains terraform scripts for generating a lambda function and API gateway.
Source code for the functions is under the `lambda` directory.

To compile and zip the code, run `make lambda` from the root of the lambda directory.

To create in AWS, make sure you are [authenticated](https://registry.terraform.io/providers/hashicorp/aws/latest/docs#authentication)
to your instance and run `terraform apply`.

The API gateway will accept all requests, and pass them forward to the lambda function to handling routing.
CI is not setup yet, but once terraform cloud is integrated we can move the lambda config step to CI
and should put it in an s3 bucket with version tag. See [here](https://learn.hashicorp.com/tutorials/terraform/lambda-api-gateway) for example.

## Upgrading RDS Serverless Database from v1 to v2

Follow the [aws guide](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.upgrade.html#sv1-to-sv2-apg), ensure to use the postgres 13 instructions. Note that this changes the cluster setting to provisioned in v2, which is somewhat confusing but a provisioned cluster can have serverless instances. Ensure to run this upgrade before terraform is applied, as the new rds block is for the v2 setup.
