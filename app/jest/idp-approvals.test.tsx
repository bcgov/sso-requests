import { sampleRequest } from './samples/integrations';
import AdminDashboard from '@app/pages/admin-dashboard';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as requestModule from 'services/request';
import * as eventModule from 'services/event';
import { Integration } from '@app/interfaces/Request';
import { updateRequest } from 'services/request';

const MOCK_PRIVACY_ZONE_URI = 'uniqueZoneUri';
const MOCK_PRIVACY_ZONE_NAME = 'uniqueZoneName';

const sampleEvents = () => {
  return [
    {
      id: 1,
      requestId: 1,
      eventCode: 'request-update-success',
      idirUserid: null,
      details: {
        changes: [
          {
            lhs: false,
            rhs: true,
            path: ['bceidApproved'],
            kind: 'E',
          },
        ],
      },
      idirUserDisplayName: 'BCeID Approver',
      createdAt: '2024-09-24T21:18:21.546Z',
      updatedAt: '2024-09-24T21:18:21.546Z',
    },
    {
      id: 2,
      requestId: 2,
      eventCode: 'request-update-success',
      idirUserid: null,
      details: {
        changes: [
          {
            lhs: false,
            rhs: true,
            path: ['githubApproved'],
            kind: 'E',
          },
        ],
      },
      idirUserDisplayName: 'GitHub Approver',
      createdAt: '2024-09-24T21:18:21.546Z',
      updatedAt: '2024-09-24T21:18:21.546Z',
    },
    {
      id: 3,
      requestId: 3,
      eventCode: 'request-update-success',
      idirUserid: null,
      details: {
        changes: [
          {
            lhs: false,
            rhs: true,
            path: ['bcServicesCardApproved'],
            kind: 'E',
          },
        ],
      },
      idirUserDisplayName: 'BC Services Card Approver',
      createdAt: '2024-09-24T21:18:21.546Z',
      updatedAt: '2024-09-24T21:18:21.546Z',
    },
  ];
};

const sampleRequests = (): Integration[] => {
  return [
    {
      ...sampleRequest,
      id: 1,
      projectName: `BCeID Approver`,
      status: 'applied',
      serviceType: 'gold',
      environments: ['dev', 'test', 'prod'],
      devIdps: ['bceidbasic'],
      testIdps: ['bceidbasic'],
      prodIdps: ['bceidbasic'],
      authType: 'both',
      bceidApproved: false,
    },
    {
      ...sampleRequest,
      id: 2,
      projectName: `GitHub Approver`,
      status: 'applied',
      serviceType: 'gold',
      environments: ['dev', 'test', 'prod'],
      devIdps: ['githubbcgov'],
      testIdps: ['githubbcgov'],
      prodIdps: ['githubbcgov'],
      authType: 'both',
      githubApproved: false,
    },
    {
      ...sampleRequest,
      id: 3,
      projectName: `BC Services Card Approver`,
      status: 'applied',
      serviceType: 'gold',
      environments: ['dev', 'test', 'prod'],
      devIdps: ['bcservicescard'],
      testIdps: ['bcservicescard'],
      prodIdps: ['bcservicescard'],
      authType: 'both',
      bcServicesCardApproved: false,
      bcscPrivacyZone: 'uniqueZoneUri',
      bcscAttributes: ['age'],
    },
  ];
};

const sampleSession = {
  email: '',
  isAdmin: false,
  client_roles: ['bceid-approver'],
};

const MOCK_EMAIL = 'some@email.com';

const spyUseRouter = jest.spyOn(require('next/router'), 'useRouter').mockImplementation(() => ({
  pathname: '',
  query: '',
  push: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('services/request');

jest.mock('services/event');

jest.mock('services/user', () => {
  return {
    getIdirUsersByEmail: jest.fn(() => Promise.resolve([[{ mail: MOCK_EMAIL, id: 1 }]])),
  };
});

jest.mock('services/bc-services-card', () => {
  return {
    ...jest.requireActual('services/bc-services-card'),
    fetchPrivacyZones: jest.fn(() =>
      Promise.resolve([[{ privacy_zone_uri: MOCK_PRIVACY_ZONE_URI, privacy_zone_name: MOCK_PRIVACY_ZONE_NAME }]]),
    ),
  };
});

const actionButtonsValidations = () => {
  const deleteIcon = screen.queryByText(/Delete from Keycloak/i);
  expect(deleteIcon).not.toBeInTheDocument();
  const eventsIcon = screen.queryByText(/Events/i);
  expect(eventsIcon).not.toBeInTheDocument();
  const editIcon = screen.queryByText(/Edit/i);
  expect(editIcon).not.toBeInTheDocument();
  const restoreIcon = screen.queryByText(/Restore at Keycloak/i);
  expect(restoreIcon).not.toBeInTheDocument();
};

describe('IDP Approvals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('BCeID Approver', async () => {
    jest
      .spyOn(requestModule, 'getRequestAll')
      .mockImplementationOnce(() => Promise.resolve([{ count: 1, rows: [sampleRequests()[0]] }, null]));
    jest.spyOn(requestModule, 'updateRequest').mockImplementation(() => Promise.resolve([{}, null]));
    jest
      .spyOn(eventModule, 'getEvents')
      .mockImplementation(() => Promise.resolve([{ count: 1, rows: sampleEvents() as any }, null]));
    const { container } = render(
      <AdminDashboard session={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />,
    );

    await waitFor(() => {
      expect(screen.getByText('BCeID Approver')).toBeInTheDocument();
    });

    actionButtonsValidations();

    fireEvent.click(screen.getByText('BCeID Approver'));
    fireEvent.click(screen.getByText('BCeID Prod'));
    const approveProdButton = screen.getByRole('button', { name: 'Approve Prod' });
    fireEvent.click(approveProdButton);
    expect(screen.getByText('Bceid Approve'));

    jest
      .spyOn(requestModule, 'getRequestAll')
      .mockImplementationOnce(() =>
        Promise.resolve([{ count: 1, rows: [{ ...sampleRequests()[0], bceidApproved: true }] }, null]),
      );

    //test on confirm button
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(updateRequest).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText('Bceid Approve')).not.toBeInTheDocument();
    });

    expect(container).toHaveTextContent('Approved by BCeID Approver on 9/24/2024, 2:18:21 PM');
  });

  it('GitHub Approver', async () => {
    jest
      .spyOn(requestModule, 'getRequestAll')
      .mockImplementationOnce(() => Promise.resolve([{ count: 1, rows: [sampleRequests()[1]] }, null]));
    jest.spyOn(requestModule, 'updateRequest').mockImplementation(() => Promise.resolve([{}, null]));
    jest
      .spyOn(eventModule, 'getEvents')
      .mockImplementation(() => Promise.resolve([{ count: 1, rows: sampleEvents() as any }, null]));
    const { container } = render(
      <AdminDashboard session={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />,
    );

    await waitFor(() => {
      expect(screen.getByText('GitHub Approver')).toBeInTheDocument();
    });

    actionButtonsValidations();

    fireEvent.click(screen.getByText('GitHub Approver'));
    fireEvent.click(screen.getByText('GitHub Prod'));
    const approveProdButton = screen.getByRole('button', { name: 'Approve Prod' });
    fireEvent.click(approveProdButton);
    expect(screen.getByText('Github Approve'));

    jest
      .spyOn(requestModule, 'getRequestAll')
      .mockImplementationOnce(() =>
        Promise.resolve([{ count: 1, rows: [{ ...sampleRequests()[1], githubApproved: true }] }, null]),
      );

    //test on confirm button
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(updateRequest).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText('Github Approve')).not.toBeInTheDocument();
    });
    expect(container).toHaveTextContent('Approved by GitHub Approver on 9/24/2024, 2:18:21 PM');
  });

  it('BC Services Card Approver', async () => {
    jest
      .spyOn(requestModule, 'getRequestAll')
      .mockImplementationOnce(() => Promise.resolve([{ count: 1, rows: [sampleRequests()[2]] }, null]));
    jest.spyOn(requestModule, 'updateRequest').mockImplementation(() => Promise.resolve([{}, null]));
    jest
      .spyOn(eventModule, 'getEvents')
      .mockImplementation(() => Promise.resolve([{ count: 1, rows: sampleEvents() as any }, null]));
    const { container } = render(
      <AdminDashboard session={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />,
    );

    await waitFor(() => {
      expect(screen.getByText('BC Services Card Approver')).toBeInTheDocument();
    });

    actionButtonsValidations();

    fireEvent.click(screen.getByText('BC Services Card Approver'));
    fireEvent.click(screen.getByText('BC Services Card Prod'));
    const approveProdButton = screen.getByRole('button', { name: 'Approve Prod' });
    fireEvent.click(approveProdButton);
    expect(screen.getByText('BC Services Card Approve'));

    jest
      .spyOn(requestModule, 'getRequestAll')
      .mockImplementationOnce(() =>
        Promise.resolve([{ count: 1, rows: [{ ...sampleRequests()[2], bcServicesCardApproved: true }] }, null]),
      );

    //test on confirm button
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(updateRequest).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText('BC Services Card Approve')).not.toBeInTheDocument();
    });
    expect(container).toHaveTextContent('Approved by BC Services Card Approver on 9/24/2024, 2:18:21 PM');
  });
});
