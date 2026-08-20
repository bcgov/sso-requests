import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import FormTemplate from 'form-components/FormTemplate';
import {
  buildSdxRequestPayloadFromSelectedScopes,
  getClientScopeState,
  getResourceServersForEnvironment,
  getScopeId,
  normalizeEnvironment,
  restoreSelectedScopesByTab,
  SelectedScopesByTab,
} from 'form-components/FieldSdxServices';
import { updateRequest } from 'services/request';
import { getSdxAllowedAccessForClient, getSdxSubsytemStatus } from 'services/sdx-services';
import { Integration } from 'interfaces/Request';
import { SDXResourceServer } from '@app/shared/interfaces';
import { setUpRouter } from './utils/setup';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('services/request', () => {
  return {
    createRequest: jest.fn(),
    updateRequest: jest.fn(() => Promise.resolve([{}, null])),
    getRequest: jest.fn(),
    isRequestBcscExcluded: jest.fn(() => Promise.resolve([false, null])),
  };
});

jest.mock('services/team', () => {
  return {
    getMyTeams: jest.fn(() => Promise.resolve([[], null])),
    getAllowedTeams: jest.fn(() => Promise.resolve([[], null])),
  };
});

jest.mock('services/keycloak', () => {
  return {
    fetchDefaultSessionSettings: jest.fn(() => Promise.resolve([null, null])),
  };
});

jest.mock('services/bc-services-card', () => {
  return {
    fetchPrivacyZones: jest.fn(() => Promise.resolve([[], null])),
    fetchAttributes: jest.fn(() => Promise.resolve([[], null])),
  };
});

let sandbox: any = {};

const setUpRender = (request: Integration | object | null, currentUser = {}) => {
  const result = render(<FormTemplate currentUser={currentUser} request={request} />);
  sandbox.requesterInfoBox = screen.queryByTestId(`stage-requester-info`)?.closest('div') as HTMLElement;
  sandbox.basicInfoBox = screen.queryByTestId(`stage-basic-info`)?.closest('div') as HTMLElement;
  sandbox.developmentBox = screen.queryByTestId(`stage-development`)?.closest('div') as HTMLElement;
  sandbox.testBox = screen.queryByTestId(`stage-test`)?.closest('div') as HTMLElement;
  sandbox.productionBox = screen.queryByTestId(`stage-production`)?.closest('div') as HTMLElement;
  sandbox.termsAndConditionsBox = screen.queryByTestId(`stage-terms-and-conditions`)?.closest('div') as HTMLElement;
  sandbox.adminReview = screen.queryByTestId(`stage-review-submit`)?.closest('div') as HTMLElement;
  sandbox.sdxServices = screen.queryByTestId(`stage-sdx-services`)?.closest('div') as HTMLElement;
  return result;
};

const sdxScope = (label: string) => ({ label, description: `${label} description` });

// Non-production/production resource servers use the sandbox SDX environment values.
const sampleSdxResourceServers = [
  {
    id: 'health-rs',
    name: 'Health Resource Server',
    organization: 'Ministry of Health',
    description: 'Health data services',
    environment: 'apsdev',
    services: [
      {
        name: 'patient-api',
        title: 'Patient API',
        version: 'v1',
        scopes: [sdxScope('patient.read'), sdxScope('patient.write')],
      },
      {
        name: 'patient-api',
        title: 'Patient API',
        version: 'v2',
        scopes: [sdxScope('patient.v2.read')],
      },
    ],
  },
  {
    id: 'finance-rs',
    name: 'Finance Resource Server',
    organization: 'Ministry of Finance',
    description: 'Finance data services',
    environment: 'apstest',
    services: [
      {
        name: 'payment-api',
        title: 'Payment API',
        version: 'v1',
        scopes: [sdxScope('payment.read'), sdxScope('payment.write')],
      },
    ],
  },
];

const emptySdxAllowedAccess = { clientId: 'sdx-client', resourceServers: [] };

// The same organization, service, version and scope labels are offered in both environments.
const sharedLabelResourceServers = [
  {
    id: 'shared-rs',
    name: 'Shared Resource Server',
    organization: 'Shared Organization',
    environment: 'apsdev',
    services: [
      {
        name: 'shared-api',
        title: 'Shared API',
        version: 'v1',
        scopes: [sdxScope('shared.read'), sdxScope('shared.write')],
      },
    ],
  },
  {
    id: 'shared-rs',
    name: 'Shared Resource Server',
    organization: 'Shared Organization',
    environment: 'apstest',
    services: [
      {
        name: 'shared-api',
        title: 'Shared API',
        version: 'v1',
        scopes: [sdxScope('shared.read'), sdxScope('shared.write')],
      },
    ],
  },
];

const sharedLabelAllowedAccess = (scopes: string[]) => ({
  clientId: 'sdx-client',
  resourceServers: [
    {
      id: 'shared-rs',
      environment: 'apsdev',
      services: [{ name: 'shared-api', version: 'v1', scopes: scopes.map(sdxScope) }],
    },
  ],
});

// Two distinct organizations/services in the same environment that happen to reuse a scope label.
const duplicateLabelResourceServers = [
  {
    id: 'org-a-rs',
    name: 'Org A Resource Server',
    organization: 'Org A',
    environment: 'apsdev',
    services: [{ name: 'org-a-api', title: 'Org A API', version: 'v1', scopes: [sdxScope('read')] }],
  },
  {
    id: 'org-b-rs',
    name: 'Org B Resource Server',
    organization: 'Org B',
    environment: 'apsdev',
    services: [{ name: 'org-b-api', title: 'Org B API', version: 'v1', scopes: [sdxScope('read')] }],
  },
];

const duplicateLabelApprovedAccess = {
  clientId: 'sdx-client',
  resourceServers: [
    {
      id: 'org-a-rs',
      environment: 'apsdev',
      services: [{ name: 'org-a-api', version: 'v1', scopes: [sdxScope('read')] }],
    },
  ],
};

// Partially populated resource servers that the widget still has to render.
const incompleteSdxResourceServers = [
  {
    id: 'no-services-rs',
    name: 'No Services Server',
    organization: 'Organization Without Services',
    environment: 'apsdev',
    services: [],
  },
  {
    id: 'string-scope-rs',
    name: 'String Scopes Server',
    environment: 'apsdev',
    services: [
      { name: 'string-api', version: 'v1', scopes: ['string.read'] },
      { name: 'empty-api', title: 'Empty API', version: 'v1', scopes: [] },
    ],
  },
  {
    id: 'unknown-env-rs',
    name: 'Unknown Environment Server',
    organization: 'Organization With Unknown Environment',
    environment: 'not-a-known-environment',
    services: [{ name: 'unknown-api', title: 'Unknown API', version: 'v1', scopes: [sdxScope('unknown.read')] }],
  },
];

const savedSdxServices = {
  integrationId: 0,
  resourceServers: [
    {
      id: 'health-rs',
      environment: 'apsdev',
      services: [{ name: 'patient-api', version: 'v1', scopes: ['patient.write'] }],
    },
    {
      id: 'finance-rs',
      environment: 'apstest',
      services: [{ name: 'payment-api', version: 'v1', scopes: ['payment.write'] }],
    },
  ],
};

const sampleSdxApprovedAccess = {
  clientId: 'sdx-client',
  resourceServers: [
    {
      id: 'health-rs',
      environment: 'apsdev',
      services: [{ name: 'patient-api', version: 'v1', scopes: [sdxScope('patient.read')] }],
    },
  ],
};

const sampleSdxPendingAccess = {
  clientId: 'sdx-client',
  resourceServers: [
    {
      id: 'health-rs',
      environment: 'apsdev',
      services: [{ name: 'patient-api', version: 'v2', scopes: [sdxScope('patient.v2.read')] }],
    },
  ],
};

let mockSdxResourceServersResponse: any = sampleSdxResourceServers;
let mockSdxApprovedAccessResponse: any = emptySdxAllowedAccess;
let mockSdxPendingAccessResponse: any = emptySdxAllowedAccess;
let mockSdxSubsytemStatusResponse: any = { status: 'registered' };

jest.mock('services/sdx-services', () => {
  return {
    listSdxResourceServers: jest.fn(() => Promise.resolve([mockSdxResourceServersResponse, null])),
    getSdxAllowedAccessForClient: jest.fn((session: any, requestId: number, status: string) =>
      Promise.resolve([status === 'approved' ? mockSdxApprovedAccessResponse : mockSdxPendingAccessResponse, null]),
    ),
    getSdxSubsytemStatus: jest.fn(() => Promise.resolve([mockSdxSubsytemStatusResponse, null])),
  };
});

beforeAll(() => {
  process.env.NEXT_PUBLIC_INCLUDE_SDX_SERVICES = 'true';
});

describe('SDX Services Form', () => {
  const defaultRender = {
    id: 0,
    serviceType: 'gold',
    status: 'draft',
    environments: ['dev', 'test', 'prod'],
    protocol: 'oidc',
    authType: 'browser-login',
    publicAccess: true,
    devIdps: ['bcservicescard'],
  };
  const userSession = { email: 'user-session@gov.bc.ca', client_roles: [] };

  const NON_PROD_TAB = /^Non-Production/;
  const PROD_TAB = /^Production/;

  const activePanel = () => document.querySelector('.rc-tabs-tabpane-active') as HTMLElement;

  const selectedScopesSection = () =>
    within(activePanel()).getByText('Selected Scopes').closest('section') as HTMLElement;

  const scopeCheckbox = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

  // Scoped to the visible tab, for catalogs that repeat the same scope labels in both environments.
  const panelCheckbox = (label: string) => within(activePanel()).getByLabelText(label) as HTMLInputElement;

  const organizationHeader = (organization: string) =>
    within(activePanel()).getByText(organization).parentElement as HTMLElement;

  const versionRow = (version: string) => within(activePanel()).getByText(version).parentElement as HTMLElement;

  const lastSavedSdxServices = () => {
    const calls = (updateRequest as jest.Mock).mock.calls;
    return calls[calls.length - 1][0].sdxServices;
  };

  const renderSdxForm = async (requestOverrides: object = {}) => {
    setUpRender({ ...defaultRender, sdxEnabled: true, ...requestOverrides }, userSession);
    // The resource servers and the client access are fetched on mount, before the stage is opened.
    await act(async () => {});
    fireEvent.click(screen.getByTestId('stage-sdx-services'));
    await screen.findByRole('tab', { name: NON_PROD_TAB });
  };

  const openProductionTab = () => {
    fireEvent.click(screen.getByRole('tab', { name: PROD_TAB }));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setUpRouter('/', sandbox);
    mockSdxResourceServersResponse = sampleSdxResourceServers;
    mockSdxApprovedAccessResponse = sampleSdxApprovedAccess;
    mockSdxPendingAccessResponse = sampleSdxPendingAccess;
  });

  it('Should show SDX Services enabled flag set to false by default', async () => {
    setUpRender(defaultRender, userSession);
    fireEvent.click(sandbox.basicInfoBox);
    const sdxEnabledCheckbox = screen.getByLabelText('Secure Data Exchange (SDX) Services') as HTMLInputElement;
    expect(sdxEnabledCheckbox.checked).toBe(false);
  });

  it('SDX Services enabled flag set to true shows SDX services tab', async () => {
    setUpRender(defaultRender, userSession);
    fireEvent.click(sandbox.basicInfoBox);
    expect(screen.queryByTestId('stage-sdx-services')).toBeNull();

    fireEvent.click(screen.getByLabelText('Secure Data Exchange (SDX) Services'));
    const sdxEnabledCheckbox = screen.getByLabelText('Secure Data Exchange (SDX) Services') as HTMLInputElement;
    expect(sdxEnabledCheckbox.checked).toBe(true);
    await waitFor(() => expect(screen.getByTestId('stage-sdx-services')).toBeVisible());
  });

  it('Loads the client SDX access when SDX is enabled on an already applied integration', async () => {
    setUpRender({ ...defaultRender, status: 'applied' }, userSession);
    await act(async () => {});

    fireEvent.click(sandbox.basicInfoBox);
    // Not yet loaded, since SDX starts disabled on the applied integration.
    expect(getSdxAllowedAccessForClient).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Secure Data Exchange (SDX) Services'));

    await waitFor(() => {
      expect(getSdxAllowedAccessForClient).toHaveBeenCalledWith(expect.anything(), 0, 'approved');
      expect(getSdxAllowedAccessForClient).toHaveBeenCalledWith(expect.anything(), 0, 'pending');
    });

    fireEvent.click(screen.getByTestId('stage-sdx-services'));
    await screen.findByRole('tab', { name: NON_PROD_TAB });

    // The fetched approved/pending access is reflected as soon as the stage is opened.
    expect(scopeCheckbox('patient.read')).toBeChecked();
    expect(scopeCheckbox('patient.v2.read')).toBeChecked();
  });

  it('Displays both non-production and production environment tabs', async () => {
    await renderSdxForm({ status: 'applied' });

    expect(screen.getByRole('tab', { name: NON_PROD_TAB })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: PROD_TAB })).toBeInTheDocument();
    // Approved and pending scopes of the non-production environment are selected by default.
    expect(screen.getByRole('tab', { name: 'Non-Production (2)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Production (0)' })).toBeInTheDocument();
  });

  it('Displays only the organizations, services and scopes of the selected environment', async () => {
    await renderSdxForm();

    let panel = activePanel();
    expect(within(panel).getByText('Ministry of Health')).toBeInTheDocument();
    expect(within(panel).getByText('Patient API')).toBeInTheDocument();
    expect(within(panel).getByText('v1')).toBeInTheDocument();
    expect(within(panel).getByText('v2')).toBeInTheDocument();
    expect(within(panel).getByLabelText('patient.read')).toBeInTheDocument();
    expect(within(panel).getByLabelText('patient.write')).toBeInTheDocument();
    expect(within(panel).getByLabelText('patient.v2.read')).toBeInTheDocument();
    expect(within(panel).queryByText('Ministry of Finance')).toBeNull();

    openProductionTab();

    panel = activePanel();
    expect(within(panel).getByText('Ministry of Finance')).toBeInTheDocument();
    expect(within(panel).getByText('Payment API')).toBeInTheDocument();
    expect(within(panel).getByLabelText('payment.read')).toBeInTheDocument();
    expect(within(panel).getByLabelText('payment.write')).toBeInTheDocument();
    expect(within(panel).queryByText('Ministry of Health')).toBeNull();
  });

  it('Pre-checks approved scopes and keeps them editable', async () => {
    await renderSdxForm({ status: 'applied' });

    expect(scopeCheckbox('patient.read')).toBeChecked();
    expect(scopeCheckbox('patient.read')).not.toBeDisabled();
    expect(scopeCheckbox('patient.write')).not.toBeChecked();
    expect(scopeCheckbox('patient.write')).not.toBeDisabled();
  });

  it('Pre-checks pending scopes and disables them', async () => {
    await renderSdxForm({ status: 'applied' });

    expect(scopeCheckbox('patient.v2.read')).toBeChecked();
    expect(scopeCheckbox('patient.v2.read')).toBeDisabled();

    fireEvent.click(scopeCheckbox('patient.v2.read'));
    expect(scopeCheckbox('patient.v2.read')).toBeChecked();
  });

  it('Does not check or disable any scope when there is no approved or pending access', async () => {
    mockSdxApprovedAccessResponse = emptySdxAllowedAccess;
    mockSdxPendingAccessResponse = emptySdxAllowedAccess;
    await renderSdxForm();

    ['patient.read', 'patient.write', 'patient.v2.read'].forEach((label) => {
      expect(scopeCheckbox(label)).not.toBeChecked();
      expect(scopeCheckbox(label)).not.toBeDisabled();
    });

    expect(screen.getByRole('tab', { name: 'Non-Production (0)' })).toBeInTheDocument();
    expect(within(selectedScopesSection()).getByText('No scopes selected yet.')).toBeInTheDocument();
  });

  it('Updates the saved form data when scopes are selected and deselected', async () => {
    await renderSdxForm();

    fireEvent.click(scopeCheckbox('patient.write'));
    expect(scopeCheckbox('patient.write')).toBeChecked();

    await waitFor(() => {
      const scopes = lastSavedSdxServices().resourceServers[0].services.flatMap((service: any) => service.scopes);
      expect(scopes).toEqual(expect.arrayContaining(['patient.write']));
    });

    fireEvent.click(scopeCheckbox('patient.read'));
    expect(scopeCheckbox('patient.read')).toBeChecked();

    await waitFor(() => {
      const scopes = lastSavedSdxServices().resourceServers[0].services.flatMap((service: any) => service.scopes);
      expect(scopes).toEqual(expect.arrayContaining(['patient.read', 'patient.write']));
    });
  });

  it('Saves the selected scopes of both environments in the same payload', async () => {
    await renderSdxForm();

    fireEvent.click(scopeCheckbox('patient.read'));

    openProductionTab();
    fireEvent.click(scopeCheckbox('payment.read'));

    await waitFor(() => {
      const { resourceServers } = lastSavedSdxServices();
      expect(resourceServers.map((resourceServer: any) => resourceServer.environment).sort()).toEqual([
        'apsdev',
        'apstest',
      ]);
    });

    const { resourceServers } = lastSavedSdxServices();
    const nonProduction = resourceServers.find((resourceServer: any) => resourceServer.environment === 'apsdev');
    expect(nonProduction.services[0].scopes).toEqual(['patient.read']);
    const production = resourceServers.find((resourceServer: any) => resourceServer.environment === 'apstest');
    expect(production.services[0].scopes).toEqual(['payment.read']);
  });

  it('Lists all checked scopes, including pending ones, in the selected scopes section', async () => {
    await renderSdxForm({ status: 'applied' });

    let section = selectedScopesSection();
    expect(within(section).getByText('2 selected')).toBeInTheDocument();
    expect(within(section).getByText('patient.read')).toBeInTheDocument();
    expect(within(section).getByText('patient.v2.read')).toBeInTheDocument();
    // Pending scopes cannot be removed.
    expect(within(section).getByRole('button', { name: 'Remove patient.v2.read' })).toBeDisabled();
    expect(within(section).getByRole('button', { name: 'Remove patient.read' })).not.toBeDisabled();

    fireEvent.click(scopeCheckbox('patient.write'));

    section = selectedScopesSection();
    expect(within(section).getByText('3 selected')).toBeInTheDocument();
    expect(within(section).getByText('patient.write')).toBeInTheDocument();
  });

  it('Unchecks a scope when it is removed from the selected scopes section', async () => {
    await renderSdxForm({ status: 'applied' });

    fireEvent.click(within(selectedScopesSection()).getByRole('button', { name: 'Remove patient.read' }));

    expect(scopeCheckbox('patient.read')).not.toBeChecked();
    expect(within(selectedScopesSection()).queryByText('patient.read')).toBeNull();
    expect(within(selectedScopesSection()).getByText('1 selected')).toBeInTheDocument();
  });

  it('Removes all scopes except the pending ones when clearing the selection', async () => {
    await renderSdxForm({ status: 'applied' });

    fireEvent.click(scopeCheckbox('patient.write'));
    expect(within(selectedScopesSection()).getByText('3 selected')).toBeInTheDocument();

    fireEvent.click(within(selectedScopesSection()).getByRole('button', { name: 'Remove all scopes' }));

    expect(scopeCheckbox('patient.read')).not.toBeChecked();
    expect(scopeCheckbox('patient.write')).not.toBeChecked();
    expect(scopeCheckbox('patient.v2.read')).toBeChecked();
    const section = selectedScopesSection();
    expect(within(section).getByText('1 selected')).toBeInTheDocument();
    expect(within(section).getByText('patient.v2.read')).toBeInTheDocument();
  });

  it('Shows an error when no scope is selected and clears it once a scope is selected', async () => {
    mockSdxApprovedAccessResponse = emptySdxAllowedAccess;
    mockSdxPendingAccessResponse = emptySdxAllowedAccess;
    await renderSdxForm();

    expect(screen.queryByText('Please select at least one scope')).toBeNull();

    // Live validation only kicks in after the stage has been visited.
    fireEvent.click(screen.getByTestId('stage-development'));
    fireEvent.click(screen.getByTestId('stage-sdx-services'));

    await screen.findByText('Please select at least one scope');

    fireEvent.click(scopeCheckbox('patient.read'));

    await waitFor(() => expect(screen.queryByText('Please select at least one scope')).toBeNull());
  });

  it('Does not apply the access of one environment to the identical scopes of the other environment', async () => {
    mockSdxResourceServersResponse = sharedLabelResourceServers;
    mockSdxApprovedAccessResponse = sharedLabelAllowedAccess(['shared.read']);
    mockSdxPendingAccessResponse = sharedLabelAllowedAccess(['shared.write']);
    await renderSdxForm({ status: 'applied' });

    expect(panelCheckbox('shared.read')).toBeChecked();
    expect(panelCheckbox('shared.read')).not.toBeDisabled();
    expect(panelCheckbox('shared.write')).toBeChecked();
    expect(panelCheckbox('shared.write')).toBeDisabled();

    openProductionTab();

    expect(panelCheckbox('shared.read')).not.toBeChecked();
    expect(panelCheckbox('shared.read')).not.toBeDisabled();
    expect(panelCheckbox('shared.write')).not.toBeChecked();
    expect(panelCheckbox('shared.write')).not.toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Non-Production (2)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Production (0)' })).toBeInTheDocument();
  });

  it('Does not apply the access of one organization/service to another that shares the same scope label', async () => {
    mockSdxResourceServersResponse = duplicateLabelResourceServers;
    mockSdxApprovedAccessResponse = duplicateLabelApprovedAccess;
    mockSdxPendingAccessResponse = emptySdxAllowedAccess;
    await renderSdxForm({ status: 'applied' });

    const panel = activePanel();
    const orgAReadCheckbox = within(within(panel).getByText('Org A').closest('section') as HTMLElement).getByLabelText(
      'read',
    );
    const orgBReadCheckbox = within(within(panel).getByText('Org B').closest('section') as HTMLElement).getByLabelText(
      'read',
    );

    expect(orgAReadCheckbox).toBeChecked();
    expect(orgBReadCheckbox).not.toBeChecked();
  });

  it('Keeps the selection of each environment independent', async () => {
    await renderSdxForm({ status: 'applied' });

    openProductionTab();
    fireEvent.click(scopeCheckbox('payment.read'));

    expect(screen.getByRole('tab', { name: 'Non-Production (2)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Production (1)' })).toBeInTheDocument();

    fireEvent.click(within(selectedScopesSection()).getByRole('button', { name: 'Remove all scopes' }));

    expect(screen.getByRole('tab', { name: 'Non-Production (2)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Production (0)' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: NON_PROD_TAB }));
    expect(scopeCheckbox('patient.read')).toBeChecked();
    expect(scopeCheckbox('patient.v2.read')).toBeChecked();
  });

  it('Restores the scopes saved on the integration into the matching environment tab', async () => {
    await renderSdxForm({ sdxServices: savedSdxServices, status: 'applied' });

    expect(scopeCheckbox('patient.write')).toBeChecked();
    expect(scopeCheckbox('patient.read')).not.toBeChecked();
    // Pending scopes stay selected even when they are missing from the saved payload.
    expect(scopeCheckbox('patient.v2.read')).toBeChecked();
    expect(screen.getByRole('tab', { name: 'Non-Production (2)' })).toBeInTheDocument();

    openProductionTab();
    expect(scopeCheckbox('payment.write')).toBeChecked();
    expect(scopeCheckbox('payment.read')).not.toBeChecked();
    expect(screen.getByRole('tab', { name: 'Production (1)' })).toBeInTheDocument();
  });

  it('Keeps the selection when navigating to another stage and back', async () => {
    await renderSdxForm({ status: 'applied' });

    fireEvent.click(scopeCheckbox('patient.write'));
    openProductionTab();
    fireEvent.click(scopeCheckbox('payment.read'));

    fireEvent.click(screen.getByTestId('stage-development'));
    fireEvent.click(screen.getByTestId('stage-sdx-services'));

    await screen.findByRole('tab', { name: 'Non-Production (3)' });
    expect(scopeCheckbox('patient.read')).toBeChecked();
    expect(scopeCheckbox('patient.write')).toBeChecked();
    expect(scopeCheckbox('patient.v2.read')).toBeChecked();

    openProductionTab();
    expect(scopeCheckbox('payment.read')).toBeChecked();
    expect(screen.getByRole('tab', { name: 'Production (1)' })).toBeInTheDocument();
  });

  it('Selects and clears every scope of a single service version', async () => {
    await renderSdxForm({ status: 'applied' });

    const toggleV1 = () => within(versionRow('v1')).getByRole('button');

    expect(toggleV1()).toHaveTextContent('Select all scopes');
    fireEvent.click(toggleV1());

    expect(scopeCheckbox('patient.read')).toBeChecked();
    expect(scopeCheckbox('patient.write')).toBeChecked();
    expect(toggleV1()).toHaveTextContent('Clear all scopes');

    fireEvent.click(toggleV1());
    expect(scopeCheckbox('patient.read')).not.toBeChecked();
    expect(scopeCheckbox('patient.write')).not.toBeChecked();
    // The pending scope of the other version is untouched.
    expect(scopeCheckbox('patient.v2.read')).toBeChecked();
  });

  it('Disables the version toggle when every scope of the version is pending', async () => {
    await renderSdxForm({ status: 'applied' });

    expect(within(versionRow('v2')).getByRole('button')).toBeDisabled();
  });

  it('Updates the organization and service counters when scopes are toggled', async () => {
    await renderSdxForm({ status: 'applied' });

    expect(within(organizationHeader('Ministry of Health')).getByText('2 selected')).toBeInTheDocument();
    expect(within(activePanel()).getByText('2 of 3 scopes')).toBeInTheDocument();

    fireEvent.click(scopeCheckbox('patient.write'));

    expect(within(organizationHeader('Ministry of Health')).getByText('3 selected')).toBeInTheDocument();
    expect(within(activePanel()).getByText('3 of 3 scopes')).toBeInTheDocument();
  });

  it('Disables the remove all scopes button when nothing is selected', async () => {
    mockSdxApprovedAccessResponse = emptySdxAllowedAccess;
    mockSdxPendingAccessResponse = emptySdxAllowedAccess;
    await renderSdxForm();

    const removeAll = () => within(selectedScopesSection()).getByRole('button', { name: 'Remove all scopes' });
    expect(removeAll()).toBeDisabled();

    fireEvent.click(scopeCheckbox('patient.read'));
    expect(removeAll()).not.toBeDisabled();
  });

  it('Renders resource servers with missing services, scopes and organizations', async () => {
    mockSdxResourceServersResponse = incompleteSdxResourceServers;
    mockSdxApprovedAccessResponse = emptySdxAllowedAccess;
    mockSdxPendingAccessResponse = emptySdxAllowedAccess;
    await renderSdxForm();

    let panel = activePanel();
    expect(within(panel).getByText('Organization Without Services')).toBeInTheDocument();
    // Falls back to the resource server name when the organization is missing.
    expect(within(panel).getByText('String Scopes Server')).toBeInTheDocument();
    expect(within(panel).getByText('0 of 0 scopes')).toBeInTheDocument();
    // Unknown environments are shown in the non-production tab.
    expect(within(panel).getByText('Organization With Unknown Environment')).toBeInTheDocument();

    // Scopes provided as plain strings are still selectable.
    fireEvent.click(panelCheckbox('string.read'));
    expect(panelCheckbox('string.read')).toBeChecked();

    openProductionTab();
    panel = activePanel();
    expect(within(panel).queryByText('Organization With Unknown Environment')).toBeNull();
    expect(within(panel).getByText('No scopes selected yet.')).toBeInTheDocument();
  });

  it('Saves scope labels and service details instead of internal identifiers', async () => {
    await renderSdxForm();

    fireEvent.click(scopeCheckbox('patient.write'));

    await waitFor(() => {
      const [resourceServer] = lastSavedSdxServices().resourceServers;
      expect(resourceServer).toEqual(
        expect.objectContaining({ id: 'health-rs', organization: 'Ministry of Health', environment: 'apsdev' }),
      );
      expect(resourceServer.services).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'patient-api', version: 'v1' })]),
      );
    });

    expect(JSON.stringify(lastSavedSdxServices())).not.toContain('$$');
  });

  it('Removes the SDX services stage when the SDX flag is turned off', async () => {
    await renderSdxForm();

    fireEvent.click(sandbox.basicInfoBox);
    fireEvent.click(screen.getByLabelText('Secure Data Exchange (SDX) Services'));

    await waitFor(() => expect(screen.queryByTestId('stage-sdx-services')).toBeNull());
  });

  it('Does not load approved/pending access when the SDX subsystem is not registered', async () => {
    mockSdxSubsytemStatusResponse = { status: 'not-registered' };
    setUpRender({ ...defaultRender, sdxEnabled: true, status: 'applied' }, userSession);
    await act(async () => {});

    expect(getSdxSubsytemStatus).toHaveBeenCalledWith(0);
    expect(getSdxAllowedAccessForClient).not.toHaveBeenCalledWith(expect.anything(), 0, 'approved');
    expect(getSdxAllowedAccessForClient).not.toHaveBeenCalledWith(expect.anything(), 0, 'pending');
  });
});

describe('SDX Services Selection Helpers', () => {
  const emptyByTab = (): SelectedScopesByTab => ({
    'non-production': new Set<string>(),
    production: new Set<string>(),
  });

  const byTab = (nonProduction: string[] = [], production: string[] = []): SelectedScopesByTab => ({
    'non-production': new Set(nonProduction),
    production: new Set(production),
  });

  // The same resource server, service and scope labels exist in both environments.
  const sharedCatalog: SDXResourceServer[] = [
    {
      id: 'health-rs',
      name: 'Health Resource Server',
      organization: 'Ministry of Health',
      environment: 'apsdev',
      services: [
        { name: 'patient-api', title: 'Patient API', version: 'v1', scopes: [sdxScope('read'), sdxScope('write')] },
      ],
    },
    {
      id: 'health-rs',
      name: 'Health Resource Server',
      organization: 'Ministry of Health',
      environment: 'apstest',
      services: [
        { name: 'patient-api', title: 'Patient API', version: 'v1', scopes: [sdxScope('read'), sdxScope('write')] },
      ],
    },
  ];

  const allowedAccess = (environment: string, scopes: string[]) => ({
    clientId: 'sdx-client',
    resourceServers: [
      {
        id: 'health-rs',
        environment,
        services: [{ name: 'patient-api', version: 'v1', scopes: scopes.map(sdxScope) }],
      } as SDXResourceServer,
    ],
  });

  const readScopeId = getScopeId('health-rs', 'patient-api', 'v1', 'read');
  const writeScopeId = getScopeId('health-rs', 'patient-api', 'v1', 'write');

  describe('normalizeEnvironment', () => {
    it('Maps the sandbox environment values to the matching tab', () => {
      expect(normalizeEnvironment('apsdev')).toBe('non-production');
      expect(normalizeEnvironment('apstest')).toBe('production');
    });

    it('Ignores casing and surrounding whitespace', () => {
      expect(normalizeEnvironment('  APSTEST ')).toBe('production');
    });

    it('Falls back to non-production for unknown, empty and missing values', () => {
      expect(normalizeEnvironment('bc')).toBe('non-production');
      expect(normalizeEnvironment('')).toBe('non-production');
      expect(normalizeEnvironment(undefined)).toBe('non-production');
      expect(normalizeEnvironment(null)).toBe('non-production');
    });

    it('Maps the production deployment environment values when the app runs in production', () => {
      const previousAppEnv = process.env.NEXT_PUBLIC_APP_ENV;
      process.env.NEXT_PUBLIC_APP_ENV = 'production';

      jest.isolateModules(() => {
        // The environment mapping is resolved when the module is loaded.
        const { normalizeEnvironment: normalize } = require('form-components/FieldSdxServices');
        expect(normalize('bct')).toBe('non-production');
        expect(normalize('bc')).toBe('production');
        expect(normalize('apstest')).toBe('non-production');
      });

      process.env.NEXT_PUBLIC_APP_ENV = previousAppEnv;
    });
  });

  describe('getResourceServersForEnvironment', () => {
    it('Returns only the resource servers of the requested environment', () => {
      expect(getResourceServersForEnvironment(sharedCatalog, 'non-production')).toEqual([sharedCatalog[0]]);
      expect(getResourceServersForEnvironment(sharedCatalog, 'production')).toEqual([sharedCatalog[1]]);
    });

    it('Tolerates missing data', () => {
      expect(getResourceServersForEnvironment(undefined as any, 'production')).toEqual([]);
    });
  });

  describe('getClientScopeState', () => {
    it('Keeps approved and pending access scoped to their own environment', () => {
      const { approvedScopeIds, pendingScopeIds } = getClientScopeState(
        allowedAccess('apsdev', ['read']),
        allowedAccess('apsdev', ['write']),
        sharedCatalog,
      );

      expect(Array.from(approvedScopeIds['non-production'])).toEqual([readScopeId]);
      expect(Array.from(pendingScopeIds['non-production'])).toEqual([writeScopeId]);
      expect(approvedScopeIds.production.size).toBe(0);
      expect(pendingScopeIds.production.size).toBe(0);
    });

    it('Marks production access only in the production tab', () => {
      const { approvedScopeIds, pendingScopeIds } = getClientScopeState(
        allowedAccess('apstest', ['read']),
        null,
        sharedCatalog,
      );

      expect(Array.from(approvedScopeIds.production)).toEqual([readScopeId]);
      expect(approvedScopeIds['non-production'].size).toBe(0);
      expect(pendingScopeIds.production.size).toBe(0);
    });

    it('Returns empty sets when there is no allowed access or catalog', () => {
      const { approvedScopeIds, pendingScopeIds } = getClientScopeState(null, null, sharedCatalog);
      expect(approvedScopeIds['non-production'].size).toBe(0);
      expect(pendingScopeIds.production.size).toBe(0);

      const withoutCatalog = getClientScopeState(allowedAccess('apsdev', ['read']), null, undefined as any);
      expect(withoutCatalog.approvedScopeIds['non-production'].size).toBe(0);
    });

    it('Supports scopes provided as plain strings', () => {
      const catalog = [
        { ...sharedCatalog[0], services: [{ name: 'patient-api', version: 'v1', scopes: ['read', 'write'] }] },
      ] as SDXResourceServer[];

      const { approvedScopeIds } = getClientScopeState(
        { clientId: 'sdx-client', resourceServers: catalog },
        null,
        catalog,
      );

      expect(Array.from(approvedScopeIds['non-production'])).toEqual([readScopeId, writeScopeId]);
    });
  });

  describe('restoreSelectedScopesByTab', () => {
    it('Falls back to the required and default scopes when nothing was saved', () => {
      const restored = restoreSelectedScopesByTab(undefined, byTab([writeScopeId]), byTab([readScopeId]));

      expect(Array.from(restored['non-production']).sort()).toEqual([readScopeId, writeScopeId].sort());
      expect(restored.production.size).toBe(0);
    });

    it('Restores the current payload format into the matching tabs', () => {
      const saved = {
        integrationId: 1,
        resourceServers: [
          { ...sharedCatalog[0], services: [{ name: 'patient-api', version: 'v1', scopes: ['read'] }] },
          { ...sharedCatalog[1], services: [{ name: 'patient-api', version: 'v1', scopes: ['write'] }] },
        ],
      };

      const restored = restoreSelectedScopesByTab(saved, emptyByTab(), byTab([readScopeId], [readScopeId]));

      expect(Array.from(restored['non-production'])).toEqual([readScopeId]);
      expect(Array.from(restored.production)).toEqual([writeScopeId]);
    });

    it('Restores a bare array of selected resource servers', () => {
      const saved = [{ ...sharedCatalog[1], services: [{ name: 'patient-api', version: 'v1', scopes: ['write'] }] }];

      const restored = restoreSelectedScopesByTab(saved, emptyByTab(), emptyByTab());

      expect(restored['non-production'].size).toBe(0);
      expect(Array.from(restored.production)).toEqual([writeScopeId]);
    });

    it('Restores the legacy scope id format', () => {
      const restored = restoreSelectedScopesByTab(
        { 'non-production': [readScopeId], production: [writeScopeId] },
        emptyByTab(),
        emptyByTab(),
      );

      expect(Array.from(restored['non-production'])).toEqual([readScopeId]);
      expect(Array.from(restored.production)).toEqual([writeScopeId]);
    });

    it('Always keeps the required scopes of each tab selected', () => {
      const saved = { integrationId: 1, resourceServers: [] };
      const restored = restoreSelectedScopesByTab(saved, byTab([readScopeId], [writeScopeId]), emptyByTab());

      expect(Array.from(restored['non-production'])).toEqual([readScopeId]);
      expect(Array.from(restored.production)).toEqual([writeScopeId]);
    });
  });

  describe('buildSdxRequestPayloadFromSelectedScopes', () => {
    it('Emits scope labels and preserves the service and resource server details', () => {
      const resourceServers = buildSdxRequestPayloadFromSelectedScopes(byTab([readScopeId]), sharedCatalog);

      expect(resourceServers).toEqual([
        {
          id: 'health-rs',
          name: 'Health Resource Server',
          organization: 'Ministry of Health',
          description: undefined,
          environment: 'apsdev',
          services: [{ name: 'patient-api', version: 'v1', scopes: ['read'] }],
        },
      ]);
    });

    it('Includes the selections of both environments', () => {
      const resourceServers = buildSdxRequestPayloadFromSelectedScopes(
        byTab([readScopeId], [writeScopeId]),
        sharedCatalog,
      );

      expect(resourceServers.map((resourceServer) => resourceServer.environment)).toEqual(['apsdev', 'apstest']);
      expect(resourceServers[0].services[0].scopes).toEqual(['read']);
      expect(resourceServers[1].services[0].scopes).toEqual(['write']);
    });

    it('Omits resource servers and services without any selected scope', () => {
      expect(buildSdxRequestPayloadFromSelectedScopes(emptyByTab(), sharedCatalog)).toEqual([]);
    });

    it('Tolerates resource servers without services and services without scopes', () => {
      const catalog = [
        { id: 'empty-rs', environment: 'apsdev', services: [] },
        { id: 'no-scope-rs', environment: 'apsdev', services: [{ name: 'api', version: 'v1', scopes: [] }] },
      ] as SDXResourceServer[];

      expect(buildSdxRequestPayloadFromSelectedScopes(byTab([readScopeId]), catalog)).toEqual([]);
    });
  });

  describe('getScopeId', () => {
    it('Creates a unique id per resource server, service, version and label', () => {
      const ids: string[] = [];
      ['health-rs', 'finance-rs'].forEach((resourceServer) => {
        ['v1', 'v2'].forEach((version) => {
          ids.push(getScopeId(resourceServer, 'patient-api', version, 'read'));
        });
      });

      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
