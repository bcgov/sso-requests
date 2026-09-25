import { PRESETS, Permission } from '@sso/authz';
import { IntegrationAccess } from '@app/queries/integrationAccess';
import {
  FIELD_AUTHORITY,
  actorPayload,
  authorizeTransition,
  authorizeChanges,
  changedFields,
} from '@app/utils/requestPolicy';
import { IN_FLIGHT, RESTING, TRANSITIONS, deleteIntentFor, transitionRefusal } from '@app/helpers/transitions';
import { canonicalizeArrayFields, normalizeRequest } from '@app/utils/helpers';

/**
 * The update path authorizes the diff between the stored row and the payload, field by field,
 * against the actor's merged permissions. These pin the pieces that decide what a change is,
 * which permission it needs, and what a row's history forbids — the rules that used to be spread
 * across sanitizeRequest, getIdpApprovalStatus and the approver revert in updateRequest.
 */

const access = (permissions: Permission[], extra: Partial<IntegrationAccess> = {}): IntegrationAccess => ({
  owner: false,
  userTeamRole: null,
  permissions,
  ...extra,
});

const teamAdmin = access(PRESETS['team-admin']);
const editor = access(PRESETS.editor);
const approver = access(['integrations:read', 'integrations:approve-bceid']);
const admin = access([
  ...PRESETS['team-admin'],
  'integrations:approve-bceid',
  'integrations:write-lifespans',
  'integrations:write-client-id',
  'integrations:add-restricted-idps',
]);

const applied = {
  id: 1,
  projectName: 'p',
  status: 'applied',
  environments: ['dev', 'test'],
  devIdps: ['azureidir'],
  devValidRedirectUris: ['https://b', 'https://a'],
  testValidRedirectUris: [],
  teamId: 5,
  usesTeam: true,
  bceidApproved: false,
  bcServicesCardApproved: null,
  clientId: 'p-1',
  devLoginTitle: null,
  devAccessTokenLifespan: 0,
  updatedAt: new Date('2026-01-01'),
};

const merged = { merged: true };
const fresh = { merged: false };

describe('changedFields', () => {
  it('ignores the shapes a round-trip produces', () => {
    expect(
      changedFields(applied, {
        devValidRedirectUris: ['https://a', 'https://b'], // permuted
        testValidRedirectUris: [''], // the client's empty list
        teamId: '5', // the form's string
        bceidApproved: null, // null for false
        bcServicesCardApproved: false, // false for null
        devLoginTitle: '', // '' for null
        devAccessTokenLifespan: '0',
      }),
    ).toEqual([]);
  });

  it('ignores system fields, unknown keys and fields absent from the payload', () => {
    expect(
      changedFields(applied, {
        status: 'draft',
        updatedAt: '2026-09-15T00:00:00.000Z',
        isAdmin: true,
        userTeamRole: 'admin',
        user: { id: 9 },
      }),
    ).toEqual([]);
    expect(changedFields(applied, {})).toEqual([]);
  });

  it('names every field whose value actually moved', () => {
    expect(changedFields(applied, { projectName: 'q', environments: ['dev'], bceidApproved: true })).toEqual([
      'projectName',
      'environments',
      'bceidApproved',
    ]);
  });

  it('keeps sdxServices, the one non-column an actor may set', () => {
    expect(changedFields(applied, { sdxServices: { a: 1 } })).toEqual(['sdxServices']);
    expect(Object.keys(actorPayload({ sdxServices: {}, status: 'x', nope: 1, projectName: 'p' }))).toEqual([
      'sdxServices',
      'projectName',
    ]);
  });
});

/**
 * changedFields compares arrays as sets, so an order or an empty entry the diff calls equal must
 * not be able to reach the row: what is written has to be canonical too. Without this the one
 * change nobody has to be authorized for is the one the diff cannot see.
 */
describe('canonical arrays', () => {
  it('sorts and compacts every array the diff compares as a set', () => {
    expect(
      canonicalizeArrayFields({
        devIdps: ['idir', 'bceidbasic'],
        devValidRedirectUris: ['https://b', '', 'https://a'],
        bcscAttributes: ['email', 'age'],
        primaryEndUsers: ['people', 'business'],
      }),
    ).toEqual({
      devIdps: ['bceidbasic', 'idir'],
      devValidRedirectUris: ['https://a', 'https://b'],
      bcscAttributes: ['age', 'email'],
      primaryEndUsers: ['business', 'people'],
    });
  });

  it('keeps environments in their logical order and leaves an unknown one for the constraint', () => {
    expect(canonicalizeArrayFields({ environments: ['prod', 'dev', 'test'] }).environments).toEqual([
      'dev',
      'test',
      'prod',
    ]);
    expect(canonicalizeArrayFields({ environments: ['staging', 'prod', 'dev'] }).environments).toEqual([
      'dev',
      'prod',
      'staging',
    ]);
  });

  it('leaves a field the payload does not carry as an array alone', () => {
    expect(canonicalizeArrayFields({ primaryEndUsers: null, devIdps: undefined })).toEqual({
      primaryEndUsers: null,
      devIdps: undefined,
    });
  });

  it('gives the actor no say in the order that is written', () => {
    const one = normalizeRequest({ devIdps: ['idir', 'bceidbasic'], environments: ['prod', 'dev'] } as any, true);
    const other = normalizeRequest({ devIdps: ['bceidbasic', 'idir'], environments: ['dev', 'prod'] } as any, true);
    expect(actorPayload(one)).toEqual(actorPayload(other));
  });

  it('writes the stored set back in canonical form when the payload only permutes it', () => {
    const submitted = normalizeRequest(
      { environments: ['test', 'dev'], devValidRedirectUris: ['https://a', 'https://b'] } as any,
      true,
    );
    expect(changedFields(applied, submitted)).toEqual([]);
    const canonicalStored = canonicalizeArrayFields(applied);
    expect(submitted.environments).toEqual(canonicalStored.environments);
    expect(submitted.devValidRedirectUris).toEqual(canonicalStored.devValidRedirectUris);
  });
});

describe('field authority', () => {
  it('maps every approval flag, lifespan and ownership field to its own permission', () => {
    expect(FIELD_AUTHORITY.bceidApproved).toEqual('integrations:approve-bceid');
    expect(FIELD_AUTHORITY.devBceidApproved).toEqual('integrations:approve-bceid');
    expect(FIELD_AUTHORITY.testBceidApproved).toEqual('integrations:approve-bceid');
    expect(FIELD_AUTHORITY.githubApproved).toEqual('integrations:approve-github');
    expect(FIELD_AUTHORITY.bcServicesCardApproved).toEqual('integrations:approve-bcsc');
    expect(FIELD_AUTHORITY.socialApproved).toEqual('integrations:approve-social');
    expect(FIELD_AUTHORITY.otpApproved).toEqual('integrations:approve-otp');
    for (const env of ['dev', 'test', 'prod']) {
      for (const field of [
        'AccessTokenLifespan',
        'SessionIdleTimeout',
        'SessionMaxLifespan',
        'OfflineSessionIdleTimeout',
        'OfflineSessionMaxLifespan',
        'AssertionLifespan',
        'OfflineAccessEnabled',
      ]) {
        expect(FIELD_AUTHORITY[`${env}${field}`]).toEqual('integrations:write-lifespans');
      }
    }
    expect(FIELD_AUTHORITY.clientId).toEqual('integrations:write-client-id');
    expect(FIELD_AUTHORITY.usesTeam).toEqual('integrations:reassign-team');
    expect(FIELD_AUTHORITY.teamId).toEqual('integrations:reassign-team');
    expect(FIELD_AUTHORITY.projectName).toBeUndefined();
  });

  it('lets a team admin change ordinary fields and nothing admin-scoped', () => {
    expect(authorizeChanges(applied, { projectName: 'q', teamId: 6 }, teamAdmin, merged)).toEqual([
      'projectName',
      'teamId',
    ]);
    expect(() => authorizeChanges(applied, { bceidApproved: true }, teamAdmin, merged)).toThrow(
      'not allowed to change: bceidApproved',
    );
    expect(() =>
      authorizeChanges(applied, { clientId: 'custom', devAccessTokenLifespan: 300 }, teamAdmin, merged),
    ).toThrow('not allowed to change: clientId, devAccessTokenLifespan');
  });

  it('requires reassign-team permission to change teamId', () => {
    expect(editor.permissions).not.toContain('integrations:reassign-team');
    expect(() => authorizeChanges(applied, { teamId: 6 }, editor, merged)).toThrow('not allowed to change: teamId');
  });

  it('catches revoking as well as approving', () => {
    expect(() =>
      authorizeChanges({ ...applied, bceidApproved: true }, { bceidApproved: false }, teamAdmin, merged),
    ).toThrow('not allowed to change: bceidApproved');
  });

  it('lets an approver change their flag and nothing else', () => {
    expect(authorizeChanges(applied, { bceidApproved: true }, approver, merged)).toEqual(['bceidApproved']);
    expect(() =>
      authorizeChanges(applied, { bceidApproved: true, devValidRedirectUris: ['https://c'] }, approver, merged),
    ).toThrow('not allowed to change: devValidRedirectUris');
    expect(() => authorizeChanges(applied, { githubApproved: true }, approver, merged)).toThrow(
      'not allowed to change: githubApproved',
    );
  });

  it('needs add-restricted-idps to add a restricted or discontinued IdP, and only to add', () => {
    expect(() => authorizeChanges(applied, { devIdps: ['azureidir', 'githubpublic'] }, teamAdmin, merged)).toThrow(
      'not allowed to change: devIdps',
    );
    expect(() => authorizeChanges(applied, { devIdps: ['azureidir', 'idir'] }, teamAdmin, merged)).toThrow(
      'not allowed to change: devIdps',
    );
    expect(authorizeChanges(applied, { devIdps: ['azureidir', 'bceidbasic'] }, teamAdmin, merged)).toEqual(['devIdps']);
    expect(authorizeChanges({ ...applied, devIdps: ['otp'] }, { devIdps: ['azureidir'] }, teamAdmin, merged)).toEqual([
      'devIdps',
    ]);
    expect(authorizeChanges(applied, { devIdps: ['azureidir', 'githubpublic'] }, admin, merged)).toEqual(['devIdps']);
  });
});

describe('field constraints', () => {
  it('refuses an invalid environment in any state', () => {
    expect(() => authorizeChanges(applied, { environments: ['dev', 'test', 'staging'] }, teamAdmin, fresh)).toThrow(
      'environments: staging is not a valid environment',
    );
  });

  it('keeps environments append-only once the integration has been applied', () => {
    expect(() => authorizeChanges(applied, { environments: ['dev'] }, teamAdmin, merged)).toThrow(
      'environments: cannot remove test once the integration is applied',
    );
    expect(authorizeChanges(applied, { environments: ['dev', 'test', 'prod'] }, teamAdmin, merged)).toEqual([
      'environments',
    ]);
    expect(authorizeChanges(applied, { environments: ['dev'] }, teamAdmin, fresh)).toEqual(['environments']);
  });

  it('refuses reverting an applied team integration to single-person ownership, and only that direction', () => {
    expect(() => authorizeChanges(applied, { usesTeam: false }, teamAdmin, merged)).toThrow(
      'usesTeam: cannot revert to single-person ownership once the integration is applied',
    );
    expect(
      authorizeChanges({ ...applied, usesTeam: false, teamId: null }, { usesTeam: true, teamId: 5 }, teamAdmin, merged),
    ).toEqual(['usesTeam', 'teamId']);
    expect(authorizeChanges(applied, { usesTeam: false }, teamAdmin, fresh)).toEqual(['usesTeam']);
  });

  it('locks the BC Services Card registration once approved', () => {
    const bcsc = { ...applied, bcServicesCardApproved: true, bcscAttributes: ['age'], bcscPrivacyZone: 'z1' };
    expect(() => authorizeChanges(bcsc, { bcscAttributes: ['age', 'email'] }, admin, merged)).toThrow(
      'bcscAttributes: cannot change once BC Services Card is approved',
    );
    expect(() => authorizeChanges(bcsc, { bcscPrivacyZone: 'z2' }, admin, merged)).toThrow(
      'bcscPrivacyZone: cannot change once BC Services Card is approved',
    );
    expect(
      authorizeChanges({ ...bcsc, bcServicesCardApproved: false }, { bcscPrivacyZone: 'z2' }, admin, merged),
    ).toEqual(['bcscPrivacyZone']);
  });

  it('checks authority before constraints, so a refusal is one kind at a time', () => {
    expect(() => authorizeChanges(applied, { environments: ['dev'], bceidApproved: true }, teamAdmin, merged)).toThrow(
      'not allowed to change: bceidApproved',
    );
  });
});

describe('transitions', () => {
  it('partitions every status into in flight or resting', () => {
    expect([...IN_FLIGHT, ...RESTING].sort()).toEqual(
      ['draft', 'submitted', 'pr', 'prFailed', 'planned', 'planFailed', 'applied', 'applyFailed'].sort(),
    );
    expect(IN_FLIGHT).toEqual(['submitted', 'planned']);
  });

  it('picks the delete transition from the status', () => {
    expect(deleteIntentFor('draft')).toEqual('deleteDraft');
    expect(deleteIntentFor('applied')).toEqual('requestDelete');
    expect(deleteIntentFor('applyFailed')).toEqual('requestDelete');
    expect(deleteIntentFor('planned')).toEqual('forceDelete');
    expect(deleteIntentFor('submitted')).toEqual('forceDelete');
  });

  it('gates the in-flight delete on its own permission, held by no team role', () => {
    expect(TRANSITIONS.forceDelete.anyOf).toEqual(['integrations:delete-in-flight']);
    expect(PRESETS['team-admin']).not.toContain('integrations:delete-in-flight');
    expect(transitionRefusal('planned', 'forceDelete', PRESETS['team-admin'])).toEqual({
      reason: 'permission',
      needs: ['integrations:delete-in-flight'],
    });
    expect(transitionRefusal('planned', 'forceDelete', ['integrations:delete-in-flight'])).toBeNull();
  });

  it('lets an approver submit but not save a draft', () => {
    expect(transitionRefusal('applied', 'submit', approver.permissions)).toBeNull();
    expect(transitionRefusal('draft', 'save', approver.permissions)).toEqual({
      reason: 'permission',
      needs: ['integrations:write'],
    });
  });

  // Pins dev behaviour: resubmit is "retry the workflow", so it is open from anything in
  // flight or that ended badly, to anyone who could have submitted it — team members and
  // approvers included, not only admins.
  it('lets a retry through from every in-flight or failed status, for submitters and approvers alike', () => {
    expect(TRANSITIONS.resubmit.from).toEqual(['submitted', 'planned', 'planFailed', 'applyFailed']);
    expect(TRANSITIONS.resubmit.anyOf).toEqual(TRANSITIONS.submit.anyOf);
    for (const status of TRANSITIONS.resubmit.from) {
      expect(transitionRefusal(status, 'resubmit', PRESETS['team-member'])).toBeNull();
      expect(transitionRefusal(status, 'resubmit', approver.permissions)).toBeNull();
    }
    for (const status of ['draft', 'applied', 'pr', 'prFailed'] as const) {
      expect(transitionRefusal(status, 'resubmit', PRESETS['team-admin'])).toEqual({ reason: 'status', from: status });
    }
    expect(transitionRefusal('planFailed', 'resubmit', PRESETS.viewer)).toEqual({
      reason: 'permission',
      needs: TRANSITIONS.submit.anyOf,
    });
  });

  it('refuses by status before by permission', () => {
    expect(transitionRefusal('applied', 'save', PRESETS['team-admin'])).toEqual({ reason: 'status', from: 'applied' });
    expect(transitionRefusal('submitted', 'submit', PRESETS['team-admin'])).toEqual({
      reason: 'status',
      from: 'submitted',
    });
    expect(transitionRefusal('applyFailed', 'submit', PRESETS['team-member'])).toBeNull();
  });

  it('turns a refusal into a 400 for status and a 403 for permission', () => {
    expect(() => authorizeTransition({ status: 'planned' }, 'requestDelete', teamAdmin)).toThrow(
      expect.objectContaining({ status: 400, message: 'cannot requestDelete an integration in status planned' }),
    );
    expect(() => authorizeTransition({ status: 'planned' }, 'forceDelete', teamAdmin)).toThrow(
      expect.objectContaining({ status: 403, message: 'not allowed to forceDelete this integration' }),
    );
    expect(authorizeTransition({ status: 'applied' }, 'submit', teamAdmin)).toBe(TRANSITIONS.submit);
  });
});
