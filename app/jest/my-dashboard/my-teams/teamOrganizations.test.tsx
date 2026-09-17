import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PRESETS } from '@sso/authz';
import TeamOrganizations from '@app/page-partials/my-dashboard/TeamInfoTabs/TeamOrganizations';
import {
  getTeamOrganizations,
  respondToOrganizationInvitation,
  updateIntegrationOverrides,
  updateTeamConsent,
} from '@app/services/organization';
import { getTeamIntegrations } from '@app/services/request';

jest.mock('@app/services/organization', () => ({
  getTeamOrganizations: jest.fn(),
  leaveOrganization: jest.fn(),
  respondToOrganizationInvitation: jest.fn(),
  updateIntegrationOverrides: jest.fn(),
  updateTeamConsent: jest.fn(),
}));

jest.mock('@app/services/request', () => ({
  getTeamIntegrations: jest.fn(),
}));

const mockedGetTeamOrganizations = jest.mocked(getTeamOrganizations);
const mockedRespond = jest.mocked(respondToOrganizationInvitation);
const mockedUpdateOverrides = jest.mocked(updateIntegrationOverrides);
const mockedUpdateConsent = jest.mocked(updateTeamConsent);
const mockedGetTeamIntegrations = jest.mocked(getTeamIntegrations);

const TEAM_ID = 5;

const link = (overrides: any = {}) => ({
  id: 1,
  organizationId: 9,
  teamId: TEAM_ID,
  permissions: [...PRESETS.editor],
  pending: true,
  organization: { id: 9, name: 'Ministry of Tests' },
  overrides: [],
  ...overrides,
});

// react-select puts `inputId` on its own input, which is what the label points
// at, so the dropdown is addressed the way a user reaches it.
const openLevels = (inputId: string) => {
  const input = document.getElementById(inputId) as HTMLElement;
  fireEvent.keyDown(input, { keyCode: 40 });
};

const pickLevel = async (inputId: string, label: string) => {
  openLevels(inputId);
  fireEvent.click(await screen.findByRole('option', { name: label }));
};

/**
 * The team's side of the negotiation. What matters here is that the screen
 * cannot express more than the team is allowed to give: a pending invitation
 * offers nothing above what was proposed, and a per-integration limit offers
 * nothing above the team's own consent.
 */
describe('a team reviewing an organization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetTeamIntegrations.mockResolvedValue([
      [{ id: 21, projectName: 'Payments', clientId: 'payments', status: 'applied', environments: ['dev'] }] as any,
      null,
    ]);
    mockedRespond.mockResolvedValue([{ success: true } as any, null]);
    mockedUpdateConsent.mockResolvedValue([{} as any, null]);
    mockedUpdateOverrides.mockResolvedValue([[] as any, null]);
  });

  it('shows what an organization has asked for', async () => {
    mockedGetTeamOrganizations.mockResolvedValue([[link()] as any, null]);
    render(<TeamOrganizations teamId={TEAM_ID} />);

    expect(await screen.findByText('Ministry of Tests')).toBeInTheDocument();
    expect(screen.getByText('invitation pending')).toBeInTheDocument();
    expect(screen.getByText(/All integrations: Editor/)).toBeInTheDocument();
  });

  it('offers nothing above what was proposed', async () => {
    mockedGetTeamOrganizations.mockResolvedValue([[link()] as any, null]);
    render(<TeamOrganizations teamId={TEAM_ID} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Review' }));
    await screen.findByText('Access level for all integrations');
    openLevels('team-consent-level');

    expect(await screen.findByRole('option', { name: 'Viewer' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Admin' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Role Manager' })).not.toBeInTheDocument();
  });

  it('accepts on narrower terms, and caps one integration below them', async () => {
    mockedGetTeamOrganizations.mockResolvedValue([[link()] as any, null]);
    render(<TeamOrganizations teamId={TEAM_ID} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Review' }));
    await pickLevel('team-consent-level', 'Viewer');
    await pickLevel('team-override-21', 'No access');
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));

    await waitFor(() => {
      expect(mockedRespond).toHaveBeenCalledWith(TEAM_ID, 9, { accept: true, permissions: PRESETS.viewer });
      expect(mockedUpdateOverrides).toHaveBeenCalledWith(TEAM_ID, 9, [{ requestId: 21, permissions: [] }]);
    });
  });

  it('leaves an accepted consent the team’s own to change', async () => {
    mockedGetTeamOrganizations.mockResolvedValue([
      [link({ pending: false, permissions: [...PRESETS.viewer] })] as any,
      null,
    ]);
    render(<TeamOrganizations teamId={TEAM_ID} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Change' }));
    // No proposal bounds an accepted link, so every organization-facing level
    // is available — the team may widen its own consent as well as narrow it.
    await pickLevel('team-consent-level', 'Admin');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockedUpdateConsent).toHaveBeenCalledWith(TEAM_ID, 9, PRESETS.admin);
      expect(mockedRespond).not.toHaveBeenCalled();
    });
  });

  it('drops an override when an integration goes back to the team-wide level', async () => {
    mockedGetTeamOrganizations.mockResolvedValue([
      [link({ pending: false, overrides: [{ requestId: 21, permissions: [] }] })] as any,
      null,
    ]);
    render(<TeamOrganizations teamId={TEAM_ID} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Change' }));
    await pickLevel('team-override-21', 'Same as all integrations (Editor)');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockedUpdateOverrides).toHaveBeenCalledWith(TEAM_ID, 9, []));
  });
});
