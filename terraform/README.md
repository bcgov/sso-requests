# Terraform

This folder contains terraform scripts for generating a lambda function and API gateway.
Source code for the functions is under the `lambda` directory.

To compile and zip the code, run `make lambda` from the root of the lambda directory.

To create in AWS, make sure you are [authenticated](https://registry.terraform.io/providers/hashicorp/aws/latest/docs#authentication)
to your instance and run `terraform apply`.

The API gateway will accept all requests, and pass them forward to the lambda function to handling routing.
CI is not setup yet, but once terraform cloud is integrated we can move the lambda config step to CI
and should put it in an s3 bucket with version tag. See [here](https://learn.hashicorp.com/tutorials/terraform/lambda-api-gateway) for example.
