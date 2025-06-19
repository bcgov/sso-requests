import { sampleRequest } from './samples/integrations';
import AdminDashboard from '@app/pages/admin-dashboard';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as requestModule from 'services/request';
import * as eventModule from 'services/event';
import { Integration } from '@app/interfaces/Request';
import { updateRequest } from 'services/request';
const MOCK_PRIVACY_ZONE_URI = 'uniqueZoneUri';
const MOCK_PRIVACY_ZONE_NAME = 'uniqueZoneName';

const sampleEvents = {
  bceidApproved: {
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
  githubApproved: {
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
  bcscApproved: {
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
  socialApproved: {
    id: 3,
    requestId: 3,
    eventCode: 'request-update-success',
    idirUserid: null,
    details: {
      changes: [
        {
          lhs: false,
          rhs: true,
          path: ['socialApproved'],
          kind: 'E',
        },
      ],
    },
    idirUserDisplayName: 'Social Approver',
    createdAt: '2024-09-24T21:18:21.546Z',
    updatedAt: '2024-09-24T21:18:21.546Z',
  },
  otpApproved: {
    id: 4,
    requestId: 4,
    eventCode: 'request-update-success',
    idirUserid: null,
    details: {
      changes: [
        {
          lhs: false,
          rhs: true,
          path: ['otpApproved'],
          kind: 'E',
        },
      ],
    },
    idirUserDisplayName: 'OTP Approver',
    createdAt: '2024-09-24T21:18:21.546Z',
    updatedAt: '2024-09-24T21:18:21.546Z',
  },
};
const sampleEventsArray = Object.values(sampleEvents);

const sampleRequests: { [key: string]: Integration } = {
  bceid: {
    ...sampleRequest,
    id: 1,
    projectName: `BCeID Approver`,
    status: 'applied',
    serviceType: 'gold',
    environments: ['dev', 'test', 'prod'],
    devIdps: ['bceidbasic', 'githubbcgov', 'bcservicescard'],
    testIdps: ['bceidbasic', 'githubbcgov', 'bcservicescard'],
    prodIdps: ['bceidbasic', 'githubbcgov', 'bcservicescard'],
    authType: 'both',
    bceidApproved: false,
  },
  github: {
    ...sampleRequest,
    id: 2,
    projectName: `GitHub Approver`,
    status: 'applied',
    serviceType: 'gold',
    environments: ['dev', 'test', 'prod'],
    devIdps: ['bceidbasic', 'githubbcgov', 'bcservicescard'],
    testIdps: ['bceidbasic', 'githubbcgov', 'bcservicescard'],
    prodIdps: ['bceidbasic', 'githubbcgov', 'bcservicescard'],
    authType: 'both',
    githubApproved: false,
  },
  social: {
    ...sampleRequest,
    id: 2,
    projectName: `Social Approver`,
    status: 'applied',
    serviceType: 'gold',
    environments: ['dev', 'test', 'prod'],
    devIdps: ['bceidbasic', 'social', 'bcservicescard'],
    testIdps: ['bceidbasic', 'social', 'bcservicescard'],
    prodIdps: ['bceidbasic', 'social', 'bcservicescard'],
    authType: 'both',
    socialApproved: false,
  },
  bcsc: {
    ...sampleRequest,
    id: 3,
    projectName: `BC Services Card Approver`,
    status: 'applied',
    serviceType: 'gold',
    environments: ['dev', 'test', 'prod'],
    devIdps: ['bceidbasic', 'githubbcgov', 'bcservicescard'],
    testIdps: ['bceidbasic', 'githubbcgov', 'bcservicescard'],
    prodIdps: ['bceidbasic', 'githubbcgov', 'bcservicescard'],
    authType: 'both',
    bcServicesCardApproved: false,
    bcscPrivacyZone: 'uniqueZoneUri',
    bcscAttributes: ['age'],
  },
  otp: {
    ...sampleRequest,
    id: 4,
    projectName: `OTP Approver`,
    status: 'applied',
    serviceType: 'gold',
    environments: ['dev', 'test', 'prod'],
    devIdps: ['bceidbasic', 'otp', 'bcservicescard'],
    testIdps: ['bceidbasic', 'otp', 'bcservicescard'],
    prodIdps: ['bceidbasic', 'otp', 'bcservicescard'],
    authType: 'both',
    otpApproved: false,
  },
};
const sampleRequestsArray = Object.values(sampleRequests);

const sampleSession = {
  email: '',
  isAdmin: false,
};

const MOCK_EMAIL = 'some@email.com';

jest.spyOn(require('next/router'), 'useRouter').mockImplementation(() => ({
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
      .mockImplementationOnce(() => Promise.resolve([{ count: 1, rows: [sampleRequests.bceid] }, null]));
    jest.spyOn(requestModule, 'updateRequest').mockImplementation(() => Promise.resolve([{}, null]));
    jest
      .spyOn(eventModule, 'getEvents')
      .mockImplementation(() => Promise.resolve([{ count: 1, rows: sampleEventsArray as any }, null]));
    render(
      <AdminDashboard
        session={{ ...sampleSession, client_roles: ['bceid-approver'] }}
        onLoginClick={jest.fn}
        onLogoutClick={jest.fn}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('BCeID Approver')).toBeInTheDocument();
    });

    actionButtonsValidations();

    fireEvent.click(screen.getByText('BCeID Approver'));

    // should not see other IDPs
    expect(screen.queryByText('GitHub Prod')).not.toBeInTheDocument();
    expect(screen.queryByText('BC Services Card Prod')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('BCeID Prod'));
    const approveProdButton = screen.getByRole('button', { name: 'Approve Prod' });
    fireEvent.click(approveProdButton);
    expect(screen.getByText('Bceid Approve'));

    jest
      .spyOn(requestModule, 'getRequestAll')
      .mockImplementationOnce(() =>
        Promise.resolve([{ count: 1, rows: [{ ...sampleRequests.bceid, bceidApproved: true }] }, null]),
      );

    //test on confirm button
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(updateRequest).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText('Bceid Approve')).not.toBeInTheDocument();
    });

    const approvedString = `Approved by ${sampleEvents.bceidApproved.idirUserDisplayName} on ${new Date(
      sampleEvents.bceidApproved.createdAt,
    ).toLocaleString()}`;

    expect(screen.getByTestId('idp-approved-note')).toHaveTextContent(approvedString);
  });

  it('GitHub Approver', async () => {
    jest
      .spyOn(requestModule, 'getRequestAll')
      .mockImplementationOnce(() => Promise.resolve([{ count: 1, rows: [sampleRequests.github] }, null]));
    jest.spyOn(requestModule, 'updateRequest').mockImplementation(() => Promise.resolve([{}, null]));
    jest
      .spyOn(eventModule, 'getEvents')
      .mockImplementation(() => Promise.resolve([{ count: 1, rows: sampleEventsArray as any }, null]));
    render(
      <AdminDashboard
        session={{ ...sampleSession, client_roles: ['github-approver'] }}
        onLoginClick={jest.fn}
        onLogoutClick={jest.fn}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('GitHub Approver')).toBeInTheDocument();
    });

    actionButtonsValidations();

    fireEvent.click(screen.getByText('GitHub Approver'));

    // should not see other IDPs
    expect(screen.queryByText('BCeID Prod')).not.toBeInTheDocument();
    expect(screen.queryByText('BC Services Card Prod')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('GitHub Prod'));
    const approveProdButton = screen.getByRole('button', { name: 'Approve Prod' });
    fireEvent.click(approveProdButton);
    expect(screen.getByText('Github Approve'));

    jest
      .spyOn(requestModule, 'getRequestAll')
      .mockImplementationOnce(() =>
        Promise.resolve([{ count: 1, rows: [{ ...sampleRequests.github, githubApproved: true }] }, null]),
      );

    //test on confirm button
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(updateRequest).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText('Github Approve')).not.toBeInTheDocument();
    });
    const approvedString = `Approved by ${sampleEvents.githubApproved.idirUserDisplayName} on ${new Date(
      sampleEvents.githubApproved.createdAt,
    ).toLocaleString()}`;

    expect(screen.getByTestId('idp-approved-note')).toHaveTextContent(approvedString);
  });

  it('Restricts Social Approver to social integrations and allows approval', async () => {
    jest
      .spyOn(requestModule, 'getRequestAll')
      .mockImplementationOnce(() => Promise.resolve([{ count: 1, rows: [sampleRequests.social] }, null]));
    jest.spyOn(requestModule, 'updateRequest').mockImplementation(() => Promise.resolve([{}, null]));
    jest
      .spyOn(eventModule, 'getEvents')
      .mockImplementation(() => Promise.resolve([{ count: 1, rows: sampleEventsArray as any }, null]));
    const { debug } = render(
      <AdminDashboard
        session={{ ...sampleSession, client_roles: ['social-approver'] }}
        onLoginClick={jest.fn}
        onLogoutClick={jest.fn}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Social Approver')).toBeInTheDocument();
    });

    actionButtonsValidations();

    fireEvent.click(screen.getByText('Social Approver'));

    // should not see other IDPs
    expect(screen.queryByText('BCeID Prod')).not.toBeInTheDocument();
    expect(screen.queryByText('BC Services Card Prod')).not.toBeInTheDocument();
    expect(screen.queryByText('Github Prod')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Social Prod'));
    const approveProdButton = screen.getByRole('button', { name: 'Approve Prod' });
    fireEvent.click(approveProdButton);
    expect(screen.getByText('Social Approve'));

    jest
      .spyOn(requestModule, 'getRequestAll')
      .mockImplementationOnce(() =>
        Promise.resolve([{ count: 1, rows: [{ ...sampleRequests.social, socialApproved: true }] }, null]),
      );

    //test on confirm button
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(updateRequest).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText('Social Approve')).not.toBeInTheDocument();
    });
    const approvedString = `Approved by ${sampleEvents.socialApproved.idirUserDisplayName} on ${new Date(
      sampleEvents.socialApproved.createdAt,
    ).toLocaleString()}`;
    expect(screen.getByTestId('idp-approved-note')).toHaveTextContent(approvedString);
  });

  it('Restricts OTP Approver to otp integrations and allows approval', async () => {
    jest
      .spyOn(requestModule, 'getRequestAll')
      .mockImplementationOnce(() => Promise.resolve([{ count: 1, rows: [sampleRequests.otp] }, null]));
    jest.spyOn(requestModule, 'updateRequest').mockImplementation(() => Promise.resolve([{}, null]));
    jest
      .spyOn(eventModule, 'getEvents')
      .mockImplementation(() => Promise.resolve([{ count: 1, rows: sampleEventsArray as any }, null]));
    const { debug } = render(
      <AdminDashboard
        session={{ ...sampleSession, client_roles: ['otp-approver'] }}
        onLoginClick={jest.fn}
        onLogoutClick={jest.fn}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('OTP Approver')).toBeInTheDocument();
    });

    debug(undefined, 300000);

    actionButtonsValidations();

    fireEvent.click(screen.getByText('OTP Approver'));

    // should not see other IDPs
    expect(screen.queryByText('BCeID Prod')).not.toBeInTheDocument();
    expect(screen.queryByText('BC Services Card Prod')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('OTP Prod'));
    const approveProdButton = screen.getByRole('button', { name: 'Approve Prod' });
    fireEvent.click(approveProdButton);
    expect(screen.getByText('Otp Approve'));

    jest
      .spyOn(requestModule, 'getRequestAll')
      .mockImplementationOnce(() =>
        Promise.resolve([{ count: 1, rows: [{ ...sampleRequests.otp, otpApproved: true }] }, null]),
      );

    //test on confirm button
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(updateRequest).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText('Otp Approve')).not.toBeInTheDocument();
    });
    const approvedString = `Approved by ${sampleEvents.otpApproved.idirUserDisplayName} on ${new Date(
      sampleEvents.otpApproved.createdAt,
    ).toLocaleString()}`;
    expect(screen.getByTestId('idp-approved-note')).toHaveTextContent(approvedString);
  });

  it('BC Services Card Approver', async () => {
    jest
      .spyOn(requestModule, 'getRequestAll')
      .mockImplementationOnce(() => Promise.resolve([{ count: 1, rows: [sampleRequests.bcsc] }, null]));
    jest.spyOn(requestModule, 'updateRequest').mockImplementation(() => Promise.resolve([{}, null]));
    jest
      .spyOn(eventModule, 'getEvents')
      .mockImplementation(() => Promise.resolve([{ count: 1, rows: sampleEventsArray as any }, null]));
    render(
      <AdminDashboard
        session={{ ...sampleSession, client_roles: ['bc-services-card-approver'] }}
        onLoginClick={jest.fn}
        onLogoutClick={jest.fn}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('BC Services Card Approver')).toBeInTheDocument();
    });

    actionButtonsValidations();

    fireEvent.click(screen.getByText('BC Services Card Approver'));

    // should not see other IDPs
    expect(screen.queryByText('GitHub Prod')).not.toBeInTheDocument();
    expect(screen.queryByText('BCeID Prod')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('BC Services Card Prod'));
    const approveProdButton = screen.getByRole('button', { name: 'Approve Prod' });
    fireEvent.click(approveProdButton);
    expect(screen.getByText('BC Services Card Approve'));

    jest
      .spyOn(requestModule, 'getRequestAll')
      .mockImplementationOnce(() =>
        Promise.resolve([{ count: 1, rows: [{ ...sampleRequests.bcsc, bcServicesCardApproved: true }] }, null]),
      );

    //test on confirm button
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(updateRequest).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText('BC Services Card Approve')).not.toBeInTheDocument();
    });
    const approvedString = `Approved by ${sampleEvents.bcscApproved.idirUserDisplayName} on ${new Date(
      sampleEvents.bcscApproved.createdAt,
    ).toLocaleString()}`;

    expect(screen.getByTestId('idp-approved-note')).toHaveTextContent(approvedString);
  });
});
