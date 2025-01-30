# Test Specs

This directory contains Cypress test specs.

To run the tests, run: `npx cypress open` from the root of the project (/app). This will open the cypress portal where you can select specs to run.

## Organization

The tests are split into the `ci` and `external` folder. External tests require the actual environment, e.g sandbox.loginproxy.gov.bc.ca, since they actually login with an external IDP as part of the flow. The ones in CI can be run against the docker compose instance.

Each test has a localtest and smoketest flag, if smoketest is true it will run on each pull request to dev. Otherwise it will be part of the full test suite run only. If localtest is true it should be runnable against the compose instance, e.g. not require an actual idp login.

## User Accounts

There are a few different user accounts used to test out different integrations and IDPs, found in [the sample env file](../../sample.cypress.env.json):

- username/password: This is for a standard IDIR account
- adminUsername/adminPassword: This is an IDIR account that has admin rights in our sandbox app.
- externalGithubUsername/externalGithubPassword: This is for a github account that is not part of the bcgov-sso organization. Note that in our sandbox environments, the bcgov-sso organization is used to replicate functionality for the BCGov Github IDP, e.g only users in this org can log into that IDP.
- internalGithubUsername/internalGithubPassword: Similar to above, but this account is part of the bcgov-sso organization.

Credentials for these can be found in secrets in our tools namespace.

## Request buildup

Since we archive requests and keep associated role and event data for auditing, the test account data builds up over time in our sandbox environment. To clear out any archived data associated to the test account you can use the sql below in sandbox:

```sql
-- Remove associated events
with request_ids as (
   select id from requests where idir_user_display_name = 'Pathfinder SSO Training' and archived = true
)
delete from request_roles where request_id in (select id from request_ids);
-- Remove associated roles
with request_ids as (
    select id from requests where idir_user_display_name = 'Pathfinder SSO Training' and archived = true
)
select * from events where request_id in (select id from request_ids);
-- Remove requests
delete from requests where idir_user_display_name = 'Pathfinder SSO Training' and archived = true;
```
