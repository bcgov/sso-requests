Audit Coverage - Overview
Currently there are two main sources:

Logs in openshift. Retained for 2 weeks, queryable through openshift loki. Their primary use is application debugging. The logs capture which routes were hit when by who, e.g: {"level":"info","time":"2026-10-15T19:49:01.374Z","service":"sso-requests","env":"development","pid":1,"hostname":"sso-requests-694fdd6bc9-wd9wn","module":"http","reqId":"54175886-4855-4098-b410-4ecf4043e5b6","userId":"id","method":"GET","path":"/api/teams","status":200,"durationMs":2340,"msg":"request completed"}. Not intended as long term audit.

An events table persisted to the DB, capturing resource changes and adding context, like who initiated the request. Queryable in grafana, retained indefinitely.

I agree with the above approach, it just currently has gaps (listed below). Alternatives, like adding pgaudit, have complete coverage but cannot capture context like the IDIR user initiating the request without application changes anyways. I think the events table just needs to be made more consistent. I have outlined the tasks required below to get coverage across all resources, and improve the current setup. It is a refined plan so an AI should be able to pick up and implement most of this easily if agreed as the direction.

Audit Coverage — Developer Task List
Concrete follow-ups from docs/audit-coverage.md, reduced to specific code/schema changes.

1. Bug: environments is dropped from update diffs
   omitNonFormFields (app/utils/helpers.ts) strips 'environments' before diffing, so getDifferences never reports environment add/remove in REQUEST_UPDATE_SUCCESS events, and environments is excluded from details.changes.

Remove 'environments' from the omit list in omitNonFormFields (app/utils/helpers.ts, ~line 508).

Confirm canonicalizeArrayFields handles environments as a set (it isn't in ARRAY_FIELDS today) so ordering doesn't produce false diffs — add it to ARRAY_FIELDS if not already set-compared, using the existing dev, test, prod logical order.

Add/update a jest test in app/jest/ asserting an environment add (e.g. ['dev'] → ['dev','test']) shows up in getDifferences.

2. Event schema: add a generic resource reference
   event model (app/shared/sequelize/models/Event.ts, table created in db/src/migrations/2021.07.02T15.57.60.create-events-table.ts) only has requestId and organizationId FKs. Team and role-assignment events need somewhere to hang.

New migration db/src/migrations/<timestamp>-add-team-id-and-workflow-id-to-events.ts: add nullable team_id INTEGER REFERENCES teams(id) column to events.

Same migration: add nullable workflow_id column (type to match the workflow table's PK — check app/workflow/ model/types for the id type) with an FK reference if a workflows table exists. This replaces storing workflowId inside details (see item 5) — a plain indexed column is cheaper to query than a JSONB path and lets you enforce referential integrity.

Update app/shared/sequelize/models/Event.ts and api/src/sequelize/models/Events.ts to add teamId and workflowId (mirrors organizationId field mapping).

Update app/interfaces/Event.ts to add teamId?: number and workflowId?: string | number.

Index events(team_id) and events(workflow_id) in the same migration (queryInterface.addIndex), matching existing indexes on request_id/organization_id if present.

3. Add team lifecycle events
   app/controllers/team.ts: createTeam, updateTeam, deleteTeam call no createEvent.

Add to EVENTS in app/shared/enums.ts: TEAM_CREATE_SUCCESS, TEAM_UPDATE_SUCCESS, TEAM_DELETE_SUCCESS (string values team-create-success, etc., matching existing naming pattern).

In createTeam (line ~34): after models.team.create, call createEvent({ eventCode: EVENTS.TEAM_CREATE_SUCCESS, teamId: team.id, idirUserid: session?.idir_userid, idirUserDisplayName: session?.user?.displayName, details: { name } }).

In updateTeam (line ~102): after the update succeeds, emit TEAM_UPDATE_SUCCESS with details: { before: { name: <old> }, after: { name: data.name } }. Note the old name isn't currently fetched — add a models.team.findByPk(teamId) (or use updated[1].dataValues before mutation) to capture it.

In deleteTeam (line ~123): emit TEAM_DELETE_SUCCESS with details: { name: team.name } once the delete path completes.

Call createEvent after each mutation succeeds, same pattern as the existing calls in this file (e.g. line 192) — don't wrap it in the same transaction as the mutation; see item 8 for why event-write failure shouldn't roll back or fail the request.

4. Add team-membership events
   Same file, addUsersToTeam (~line 42), removeUserFromTeam (~line 182, already has an event at 192 for one path — check it covers plain removal, not just admin removal), updateMemberInTeam (~line 216, has event at 234 — confirm it fires for every role change, not just one branch).

Add TEAM*MEMBER_ADDED, TEAM_MEMBER_REMOVED, TEAM_MEMBER_ROLE_UPDATED to EVENTS (mirror the ORGANIZATION_MEMBER*\* naming already in the enum).

In addUsersToTeam, emit one event per added member (or one event with details.members: [...] if per-member volume is a concern) with teamId, target userId, and role.

In removeUserFromTeam, confirm the existing createEvent call at line 192 uses the new TEAM_MEMBER_REMOVED code for ordinary removal/leave, distinct from TEAM_ADMIN_REMOVAL.

In updateMemberInTeam, confirm the event at line 234 fires for all role transitions (admin→member and member→admin), not just one, and includes details: { before: role, after: newRole }.

5. Correlate workflow events with their triggering request event
   app/workflow/steps/integration.ts — emitWorkflowEventOnce always writes EVENTS.REQUEST_APPLY_SUCCESS regardless of workflow type, and the originating REQUEST_CREATE_SUCCESS/REQUEST_UPDATE_SUCCESS/REQUEST_DELETE_SUCCESS events in app/controllers/requests.ts (lines ~708, ~961) don't carry a workflowId.

Add a terminal event code per workflow type: WORKFLOW*APPLY_SUCCESS, WORKFLOW_APPLY_FAILURE, WORKFLOW_DELETE_SUCCESS, WORKFLOW_DELETE_FAILURE (or pass the existing EVENTS.REQUEST*\* codes already in the enum — REQUEST_DELETE_SUCCESS/FAILURE exist — explicitly from each call site in app/workflow/ instead of defaulting to apply-success in emitWorkflowEventOnce).

Find where emitWorkflowEventOnce is invoked for delete workflows (grep -rn emitWorkflowEventOnce app/workflow) and pass the delete-specific code instead of relying on a default.

In requests.ts, when a workflow is enqueued (wherever processIntegrationRequest triggers workflow creation — check app/workflow/ for the enqueue call), capture the returned workflowId and set it on the workflowId column (item 2) of the REQUEST_CREATE_SUCCESS/REQUEST_UPDATE_SUCCESS/REQUEST_DELETE_SUCCESS event already written at that call site, instead of nesting it in details.

Update emitWorkflowEventOnce's dedupe check (currently details: { workflowId: workflow.id }) to query the new workflow_id column instead of a JSONB path.

This lets a query do WHERE workflow_id = ? (plain indexed equality, optionally with a FK constraint) across both the request-side and workflow-side events, instead of a JSONB containment/path lookup.

6. SDX: dedicated create event + actor on update event
   app/controllers/sdx-services.ts:

createSdxRequest (line ~180): add a createEvent call with a new EVENTS.SDX_REQUEST_CREATE_SUCCESS (add to enum), requestId, idirUserid/idirUserDisplayName, details: { services: ... } — currently this only shows up inside a request update's details.changes.

processSdxWorkflowUpdates (line ~303, event at ~325 uses EVENTS.SDX_ACCESS_REQUEST_UPDATE): this event has no actor because it's triggered by an external callback, not a session. Add details.triggeredBy: 'sdx-callback' or similar explicit system-actor marker rather than leaving idirUserid empty/undefined — ties into item 9 (actor normalization).

File a separate bug ticket (not an audit item) for SDX removal not cleaning up — out of scope here but noted so it isn't lost.

7. Keycloak role events
   Role endpoints: app/pages/api/keycloak/role.ts, role-replicate.ts, bulk-roles.ts, user-roles.ts, delete-role.ts, role-users.ts, set-composite-roles.ts (check each for the controller/service it calls into — likely app/controllers/ or a keycloak service module).

Add EVENTS: ROLE_CREATE_SUCCESS, ROLE_DELETE_SUCCESS, ROLE_ASSIGN_SUCCESS, ROLE_UNASSIGN_SUCCESS, ROLE_REPLICATE_SUCCESS.

Each event needs: requestId (client/integration the role belongs to), target userId or role name, idirUserid for app-initiated calls, and for API-initiated calls the service-account identifier (see item 10) instead of a blank idirUserid.

For bulk assignment (bulk-roles.ts), either emit one event per user with details.roleName or one event with details.userIds: [...] — pick one and match the pattern used for team member adds in item 4 for consistency.

role-replicate.ts: emit ROLE_REPLICATE_SUCCESS with details: { sourceEnv, targetEnv, roleName }.

8. Make createEvent failures alertable without failing the request
   app/queries/event.ts and api/src/utils.ts both catch and log.error on failure. Don't rethrow — the underlying change (DB write, Keycloak call) already succeeded by the time createEvent runs, so failing the request here would return an error code for an operation that actually worked, which is worse than a missing audit row. Keep this a logging/alerting problem, not a request-failure problem.

Standardize the log call in both createEvent implementations to a single, greppable shape, e.g. log.error({ err, eventCode: data.eventCode, requestId: data.requestId, teamId: data.teamId, organizationId: data.organizationId }, 'audit_event_write_failed') — same message string in both files so alerting rules match one pattern.

(Optional) - For external systems (e.g. keycloak roles) insert event as a request, e.g. ROLE_ASSIGNMENT_REQUESTED, and update to ROLE_ASSIGNMENT_APPLIED on completion (after keycloak returns success) or failure. This will setup for grafana notifications on hanging and failed third party attempts

Keep createEvent's signature/return value (Promise<void>) as-is — no need for callers to branch on success/failure, since there's nothing a caller should do differently.

9. Normalize the actor field
   idirUserid / idirUserDisplayName on Event assume an IDIR app user. Service-account (API) calls, SDX callbacks, and cron jobs (e.g. stale-user cleanup, TEAM_ADMIN_REMOVAL) don't have one.

Add actorType column via migration ('user' | 'service-account' | 'system'), default 'user' for backfill.

Add actorId (string) alongside existing idirUserid rather than replacing it immediately, to avoid a breaking change to the ~15 existing createEvent call sites; keep idirUserid populated for actorType = 'user' for backward compatibility with AdminEventPanel.tsx / UserEventPanel.tsx rendering.

Update app/controllers/events.ts query/filter logic and the two React components listed above to show actorType/actorId when idirUserid is empty, instead of rendering a blank actor.

10. Service-account identifier in API access logs and events
    API access logs: find where the Express API's request logger sets fields (likely api/src/ middleware, same pattern as withApiLogging in app) and add the authenticated service-account client ID to the logged object, alongside method/path/status.

Service-account credential retrieval/rotation: locate the controller (app/controllers/team.ts getServiceAccountCredentials/updateServiceAccountSecret, ~lines 347/410) and add createEvent calls: EVENTS.SERVICE_ACCOUNT_CREDENTIALS_VIEWED, EVENTS.SERVICE_ACCOUNT_SECRET_ROTATED, with teamId/requestId and actor.

Apply the same emitWorkflowEventOnce-style request/workflow correlation (item 5) to app/controllers/team.ts service-account create/delete/restore (lines ~389, ~400, ~459) since these currently emit success without checking the synchronous workflow result.

11. Profile changes and ownership transfer
    app/controllers/user.ts: locate the profile-update function; add EVENTS.USER_PROFILE_UPDATE_SUCCESS with details.changes (reuse getDifferences-style diffing if the fields are simple key/value).

Stale-user cleanup ownership transfer: find the cron/cleanup job (likely in app/controllers/user.ts near line 359, or a cron-invoked endpoint) and add EVENTS.TRANSFER_OF_OWNERSHIP_SUCCESS (the enum already has TRANSFER_OF_OWNERSHIP_FAILURE — add the missing success counterpart) with details: { fromUserId, toUserId, requestId/teamId }.

12. User Events

- Add events for user created, user deleted, user updated

Addendum: Transactional request/workflow/event writes (replace compensating-event pattern)
Currently, 8 call sites create a request/workflow and then write a submission event (request-create-success, request-update-success, request-delete-success, team/org api-account create/delete/restore) via a non-transactional createEvent call, sometimes after awaiting the synchronous Keycloak workflow run, with a catch-block compensating createEvent on failure. This is brittle: if the process dies between the DB write and the event write, there is no audit row and no DB cleanup. Affected call sites: app/controllers/requests.ts (updateRequest, deleteRequest, restoreRequest — the latter currently writes no event at all), app/controllers/team.ts (requestServiceAccount, deleteServiceAccount, restoreTeamServiceAccount), app/controllers/organization.ts (createOrganizationApiAccount, deleteOrganizationApiAccount).

Target design: (1) Keycloak client requested (any type); (2) an event, the requests table write, and the workflow record write happen in one DB transaction — if it fails, nothing is persisted and the user can retry with no DB mess or orphaned Keycloak resources; (3) the workflow engine (saga pattern) handles all follow-up events (request-apply-success/failure, request-restore-success/failure, workflow-delete-success/failure) once execution runs, synchronously or in the background.

Primitive changes:

- app/workflow/store.ts: createWorkflow and supersedeActiveWorkflows accept an optional external transaction and use it instead of opening their own when provided.
- app/workflow/request-workflow.ts: split enqueueRequestWorkflow into enqueueRequestWorkflow(payload, options) — pure DB write (type resolution, supersede, createWorkflow via the given transaction), no Keycloak calls — and a new executeEnqueuedWorkflow(enqueueResult, options) that runs runToCompletion or fires background execution, called only after the transaction that created the row commits.
- app/controllers/requests.ts: replace processIntegrationRequest with enqueueIntegrationWorkflow(integration, opts, transaction) and runIntegrationWorkflow(enqueueResult, opts), keeping assertWorkflowCompleted as-is.

Controller shape (applies uniformly to all 8 call sites):

```
const { enqueueResult } = await sequelize.transaction(async (transaction) => {
  const saved = await <row create/save>(..., { transaction });
  const enqueueResult = await enqueueIntegrationWorkflow(saved, opts, transaction);
  await createEvent({ eventCode: <CREATE|UPDATE|DELETE|RESTORE>_SUCCESS, requestId: saved.id, workflowId: enqueueResult.workflowId, ... }, transaction);
  return { enqueueResult };
});
const workflow = await runIntegrationWorkflow(enqueueResult, opts); // Keycloak calls, outside any transaction
assertWorkflowCompleted(workflow);
```

- Remove all manual \*\_FAILURE event writes in catch blocks for the pre-commit phase (nothing persisted on rollback, so nothing to log against).
- Remove all manual _\_SUCCESS/_\_FAILURE writes for the post-commit phase — the workflow engine already writes request-apply-success/failure, request-restore-success/failure, or workflow-delete-success/failure itself. The controller's \*\_SUCCESS event now means "submitted/queued," matching how request-create-success already behaves for normal integration submissions today.
- restoreRequest gains its first submission event (request-restore-success/failure, written transactionally), closing a silent-failure gap — pairs with the engine's own request-restore-success/failure the same way request-create-success pairs with request-apply-success.
- Team/org API-account delete/restore keep their existing TEAM_API_ACCOUNT_DELETE/RESTORE_SUCCESS codes but write them transactionally pre-commit instead of after an awaited Keycloak call.

Out of scope: resubmitRequest (no event today, just re-drives an existing workflow); beginLifecycleEvent/completeLifecycleEvent/runAuditedOperation usages in roles.ts, sdx-services.ts, user.ts, and the non-api-account organization.ts call sites are untouched.

Tests: update jest-api coverage for team/org service-account create/delete/restore and app/jest tests covering updateRequest/deleteRequest/restoreRequest to assert the new transactional event sequence instead of the compensating one.
