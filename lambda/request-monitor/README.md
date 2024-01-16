# Request Monitor

This lambda function is built to daily check the requests table for applied requests, and find missing clients from Keycloak.

## Getting started

To install dependencies:

- `yarn`

To build:

- `yarn build`

To run this functions tests, from the [lambda directory](../) run:

- `yarn jest 17`

## Running

This queue is run on a schedule with cloudwatch, see the [lambda definition](../../terraform/lambda-request-queue.tf) and [cloudwatch definition](../../terraform/cloudwatch.tf) for details. To generate the zip file used by the terraform lambda, run `make build` from this directory.

## Testing

See [17.run-queued-requests.test.ts](../__tests__/17.run-queued-requests.test.ts) for tests related to this function.
