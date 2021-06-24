# Terraform

This folder contains terraform scripts for generating a lambda function.
Source code for the functions is under the `lambda` directory.

To compile and zip the code, run `make lambda` from the root of this directory.

To create in AWS, make sure you are [authenticated](https://registry.terraform.io/providers/hashicorp/aws/latest/docs#authentication)
to your instance and run `terraform apply`.
