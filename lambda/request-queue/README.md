# Request Monitor

This lambda function is built to daily check the requests table, and return any discrepencies found.

## Getting started

To install dependencies:

- `yarn`

To build:

- `yarn build`

To run this functions tests, from the [lambda directory](../) run:

- `yarn jest 18`

## Running

This request monitor is run on a schedule with cloudwatch, see the [lambda definition](../../terraform/lambda-request-monitor.tf) and [cloudwatch definition](../../terraform/cloudwatch.tf) for details. To generate the zip file used by the terraform lambda, run `make build` from this directory.

## Testing

See [18.request-monitor.test.ts](../__tests__/18.request-monitor.test.ts) for tests related to this function.
