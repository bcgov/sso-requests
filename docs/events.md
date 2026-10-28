# Audit event reference

This page describes the event codes in `app/shared/enums.ts`. Events are audit
records, not a complete log of every database write. In particular, creating or
autosaving an integration draft does not emit a request create/update event.

## Integration requests and workflows

| Event code                 | Meaning                                                                                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `request-create-success`   | An initial integration request was submitted successfully. This records submission, not successful Keycloak provisioning; see `request-apply-success`. Draft creation alone does not emit it. |
| `request-create-failure`   | Initial integration request submission failed.                                                                                                                                                |
| `request-update-success`   | A change to an already-applied integration was submitted successfully. Draft autosaves are not logged with this event.                                                                        |
| `request-update-failure`   | Submission of a change to an already-applied integration failed.                                                                                                                              |
| `request-delete-success`   | A delete request was recorded successfully. The deletion workflow has its own completion event.                                                                                               |
| `request-delete-failure`   | Recording or starting a delete request failed.                                                                                                                                                |
| `workflow-delete-success`  | The integration deletion workflow completed.                                                                                                                                                  |
| `workflow-delete-failure`  | The integration deletion workflow failed.                                                                                                                                                     |
| `request-plan-success`     | The workflow completed its planning/validation step and marked the request planned.                                                                                                           |
| `request-plan-failure`     | The workflow failed during planning.                                                                                                                                                          |
| `request-apply-success`    | The workflow successfully applied the requested integration configuration.                                                                                                                    |
| `request-apply-failure`    | Applying the requested integration configuration failed.                                                                                                                                      |
| `request-restore-success`  | The integration restore workflow completed successfully.                                                                                                                                      |
| `request-restore-failure`  | The integration restore workflow failed.                                                                                                                                                      |
| `request-pr-success`       | Reserved/legacy code for a successful pull-request step. No active writer was found in the application code.                                                                                  |
| `request-pr-failure`       | Reserved/legacy code for a failed pull-request step. No active writer was found in the application code.                                                                                      |
| `request-limit-reached`    | A user reached the daily limit for creating requests.                                                                                                                                         |
| `email-submission-failure` | Sending a notification email failed.                                                                                                                                                          |

`request-create-*` describes the submission of a new request, not draft-row
creation. Team and organization API-account creation also use these codes; those
flows wait for Keycloak provisioning before recording success/failure. For
integration requests, `request-apply-*` is the event that reports provisioning
completion.

## Teams and API accounts

| Event code                                  | Meaning                                                                                      |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `team-create-success`                       | A team was created.                                                                          |
| `team-update-success`                       | Team details were updated.                                                                   |
| `team-delete-success`                       | A team was deleted.                                                                          |
| `team-member-added`                         | A user was added to a team.                                                                  |
| `team-member-removed`                       | A user was removed from a team, including system cleanup.                                    |
| `team-member-role-updated`                  | A user's role in a team changed.                                                             |
| `team-admin-removal`                        | Legacy/reserved team-admin-removal code; no active writer was found in the application code. |
| `api-account-delete-success`                | A team API account deletion was recorded successfully.                                       |
| `api-account-delete-failure`                | Deleting a team API account failed.                                                          |
| `api-account-restore-success`               | A team API account was restored successfully.                                                |
| `api-account-restore-failure`               | Restoring a team API account failed.                                                         |
| `service-account-secret-rotation-requested` | A service-account secret rotation was requested.                                             |
| `service-account-secret-rotated`            | The service-account secret was rotated successfully.                                         |
| `service-account-secret-rotation-failure`   | Service-account secret rotation failed.                                                      |

## Roles and role assignments

`requested` records the start of an operation; `success` and `failure` record
its outcome.

| Event code                      | Meaning                                                     |
| ------------------------------- | ----------------------------------------------------------- |
| `role-create-requested`         | Creating a role was requested.                              |
| `role-create-success`           | A role was created successfully.                            |
| `role-create-failure`           | Creating a role failed.                                     |
| `role-update-requested`         | Updating a role was requested.                              |
| `role-update-success`           | A role was updated successfully.                            |
| `role-update-failure`           | Updating a role failed.                                     |
| `role-delete-requested`         | Deleting a role was requested.                              |
| `role-delete-success`           | A role was deleted successfully.                            |
| `role-delete-failure`           | Deleting a role failed.                                     |
| `role-assign-requested`         | Assigning a role to a user was requested.                   |
| `role-assign-success`           | A role was assigned successfully.                           |
| `role-assign-failure`           | Assigning a role failed.                                    |
| `role-unassign-requested`       | Removing a role assignment was requested.                   |
| `role-unassign-success`         | A role assignment was removed successfully.                 |
| `role-unassign-failure`         | Removing a role assignment failed.                          |
| `role-bulk-reconcile-requested` | Bulk reconciliation of role assignments was requested.      |
| `role-bulk-reconcile-success`   | Bulk role-assignment reconciliation completed successfully. |
| `role-bulk-reconcile-failure`   | Bulk role-assignment reconciliation failed.                 |
| `role-replicate-requested`      | Replicating roles across environments was requested.        |
| `role-replicate-success`        | Role replication completed without reported failures.       |
| `role-replicate-failure`        | Role replication had one or more failures.                  |

## SDX

| Event code                          | Meaning                                             |
| ----------------------------------- | --------------------------------------------------- |
| `sdx-request-create-requested`      | A create request was sent to SDX.                   |
| `sdx-request-create-success`        | SDX accepted/created the request successfully.      |
| `sdx-request-create-failure`        | Creating the SDX request failed.                    |
| `sdx-access-request-update`         | An SDX access-request update was received/recorded. |
| `sdx-access-request-update-success` | Processing an SDX access-request update succeeded.  |
| `sdx-access-request-update-failure` | Processing an SDX access-request update failed.     |

## Users and ownership

| Event code                      | Meaning                                                   |
| ------------------------------- | --------------------------------------------------------- |
| `user-create-success`           | A user record was created.                                |
| `user-update-success`           | A user record was updated.                                |
| `user-delete-success`           | A user record was deleted.                                |
| `user-profile-update-success`   | A user's profile was updated.                             |
| `transfer-of-ownership-success` | Ownership of an integration was transferred successfully. |
| `transfer-of-ownership-failure` | Transferring integration ownership failed.                |

## Organizations

| Event code                         | Meaning                                                                |
| ---------------------------------- | ---------------------------------------------------------------------- |
| `organization-create-success`      | An organization was created.                                           |
| `organization-update-success`      | Organization details were updated.                                     |
| `organization-delete-success`      | An organization was deleted.                                           |
| `organization-member-added`        | A user was added to an organization.                                   |
| `organization-member-removed`      | A user was removed from an organization.                               |
| `organization-member-role-updated` | An organization member's role changed.                                 |
| `organization-team-invited`        | A team was invited to join an organization.                            |
| `organization-team-joined`         | A team accepted an organization invitation.                            |
| `organization-team-declined`       | A team declined an organization invitation.                            |
| `organization-team-left`           | A team left or was removed from an organization.                       |
| `organization-consent-updated`     | An organization's permission/consent settings for a team were updated. |
| `organization-overrides-updated`   | Organization-specific permission overrides for a team were updated.    |

## Logs

| Event code              | Meaning                                     |
| ----------------------- | ------------------------------------------- |
| `logs-download-success` | A logs download was generated successfully. |
| `logs-download-failure` | Generating a logs download failed.          |

Event codes are also shown as filters in the admin event panel. The event's
request, team, organization, actor, details, and workflow fields provide
additional context where applicable.
