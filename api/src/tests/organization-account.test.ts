import supertest from 'supertest';
import app from '@/tests/helpers/server';
import * as authenticateModule from '@/modules/authenticate';
import { PRESETS } from '@sso/authz';
import {
  seedIntergrations,
  seedOrganization,
  seedOrganizationApiAccount,
  seedOrganizationLink,
  seedOrganizationOverride,
  seedTeamAndMembers,
} from './helpers/seeder';
import { clearAuthContextCache } from '@/modules/authorization';

const API_BASE_PATH = '/api/v1';

// An organization account's token carries no team claim.
const authenticateAs = (account: any) =>
  jest.spyOn(authenticateModule, 'authenticate').mockImplementationOnce(() =>
    Promise.resolve({
      success: true,
      data: { teamId: null, apiClientId: account.clientId } as any,
      err: null,
    }),
  );

const listIds = async (account: any) => {
  authenticateAs(account);
  const res = await supertest(app).get(`${API_BASE_PATH}/integrations`).expect(200);
  return res.body.data.map((integration: any) => integration.id).sort((a: number, b: number) => a - b);
};

describe('an organization api account', () => {
  let consentingTeam: any;
  let roleManagingTeam: any;
  let unlinkedTeam: any;
  let editable: any;
  let capped: any;
  let roleManaged: any;
  let unreachable: any;
  let account: any;
  let organizationId: number;
  let editorLink: any;

  beforeAll(async () => {
    jest.clearAllMocks();

    consentingTeam = await seedTeamAndMembers('org consenting team', []);
    roleManagingTeam = await seedTeamAndMembers('org role-managing team', []);
    unlinkedTeam = await seedTeamAndMembers('org unlinked team', []);

    editable = await seedIntergrations({ integrationName: 'Org Editable', teamId: consentingTeam.id, submitted: true });
    capped = await seedIntergrations({ integrationName: 'Org Capped', teamId: consentingTeam.id, submitted: true });
    roleManaged = await seedIntergrations({
      integrationName: 'Org Role Managed',
      teamId: roleManagingTeam.id,
      submitted: true,
    });
    unreachable = await seedIntergrations({
      integrationName: 'Org Unreachable',
      teamId: unlinkedTeam.id,
      submitted: true,
    });

    organizationId = (await seedOrganization('Ministry of Api Tests')).id;
    account = await seedOrganizationApiAccount(organizationId);

    editorLink = await seedOrganizationLink(organizationId, consentingTeam.id, [...PRESETS.editor]);
    await seedOrganizationLink(organizationId, roleManagingTeam.id, [...PRESETS['role-manager']]);
    await seedOrganizationOverride(editorLink.id, capped.id, [...PRESETS.viewer]);
  });

  beforeEach(() => clearAuthContextCache());

  it('lists every integration its links reach, and nothing else', async () => {
    expect(await listIds(account)).toEqual([editable.id, capped.id, roleManaged.id].sort((a, b) => a - b));
  });

  it('answers 404 for a team that has consented to nothing', async () => {
    authenticateAs(account);
    await supertest(app).get(`${API_BASE_PATH}/integrations/${unreachable.id}`).expect(404);
  });

  it('reads an integration its link reaches', async () => {
    authenticateAs(account);
    const res = await supertest(app).get(`${API_BASE_PATH}/integrations/${editable.id}`).expect(200);
    expect(res.body.id).toEqual(editable.id);
  });

  it('still reads an integration an override caps down to viewer', async () => {
    authenticateAs(account);
    await supertest(app).get(`${API_BASE_PATH}/integrations/${capped.id}`).expect(200);
  });

  it('loses a team the moment its consent is withdrawn', async () => {
    await editorLink.update({ permissions: [] });
    try {
      expect(await listIds(account)).toEqual([roleManaged.id]);
      clearAuthContextCache();
      authenticateAs(account);
      await supertest(app).get(`${API_BASE_PATH}/integrations/${editable.id}`).expect(404);
    } finally {
      await editorLink.update({ permissions: [...PRESETS.editor] });
    }
  });

  it('is out of reach entirely while the link is pending', async () => {
    await editorLink.update({ pending: true });
    try {
      expect(await listIds(account)).toEqual([roleManaged.id]);
    } finally {
      await editorLink.update({ pending: false });
    }
  });

  it('has no authority once the organization is gone from its row', async () => {
    await account.update({ organizationId: null, archived: true });
    try {
      clearAuthContextCache();
      authenticateAs(account);
      await supertest(app).get(`${API_BASE_PATH}/integrations`).expect(401);
    } finally {
      await account.update({ organizationId, archived: false });
    }
  });
});
