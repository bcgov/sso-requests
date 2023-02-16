import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import TeamInfoTabs from 'page-partials/my-dashboard/TeamInfoTabs';
import { getTeamMembers } from 'services/team';
import { processRequest } from 'utils/helpers';
import { getTeamIntegrations } from 'services/request';
import MyTeams from '@app/pages/my-dashboard/teams';

const sampleSession = {
  at_hash: '',
  aud: '',
  auth_time: 1,
  azp: '',
  client_roles: ['sso-admin'],
  display_name: '',
  email: 'admin01@gov.bc.ca',
  email_verified: false,
  exp: 0,
  family_name: '',
  given_name: '',
  iat: 0,
  identity_provider: 'idir',
  idir_user_guid: '',
  idir_username: '',
  isAdmin: true,
  iss: '',
  jti: '',
  name: '',
  nonce: '',
  preferred_username: '',
  roles: ['sso-admin'],
  session_state: '',
  sid: '',
  sub: '',
  typ: 'ID',
};
const sampleTeam = {
  createdAt: '',
  id: 1,
  integrationCount: '0',
  name: 'SAMPLE_TEAM',
  role: 'member',
  serviceAccountCount: '0',
  updatedAt: '',
};
const loadTeams = jest.fn();

const getByRole = (role: string, roleName: string) => screen.getByRole(role, { name: roleName });

jest.mock('services/team', () => ({
  getMyTeams: jest.fn(() => [
    [
      {
        createdAt: '',
        id: 1,
        integrationCount: '0',
        name: 'test-team',
        role: 'admin',
        serviceAccountCount: '0',
        updatedAt: '',
      },
    ],
    null,
  ]),
  getTeamMembers: jest.fn(() => [
    [
      {
        createdAt: '',
        id: 1,
        idirEmail: 'admin01@gov.bc.ca',
        idirUserid: '',
        pending: false,
        role: 'admin',
        updatedAt: '',
      },
      {
        createdAt: '',
        id: 2,
        idirEmail: 'sampleMember01@gov.bc.ca',
        idirUserid: '',
        pending: false,
        role: 'member',
        updatedAt: '',
      },
    ],
    null,
  ]),
  getServiceAccounts: jest.fn(() => [
    [
      {
        id: 1,
        clientId: 'service-account-team-1',
        teamId: 1,
        status: 'applied',
        updatedAt: '',
        prNumber: 1,
        archived: false,
        requester: '',
      },
    ],
    null,
  ]),
}));

jest.mock('services/request', () => ({
  getTeamIntegrations: jest.fn(() => [[], null]),
}));

describe('Integrations tab', () => {
  it('Should match the expected button name,', async () => {
    //render(<TeamInfoTabs team={sampleTeam} currentUser={sampleSession} loadTeams={loadTeams} />);
    //expect(asFragment()).toMatchSnapshot();
    //expect(screen.getByText('Email'));
    //const addNewMemberButton = getByRole('button', '+ Add New Team Members');
    const { asFragment } = render(
      <MyTeams session={sampleSession} onLoginClick={jest.fn()} onLogoutClick={jest.fn()} key={'teams'} />,
    );
    await screen.findByText('+ Add new team members');
    expect(asFragment()).toMatchSnapshot();
  });
});
