import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import IntegrationList from 'page-partials/my-dashboard/IntegrationList';
import { sampleRequest } from '../../samples/integrations';
import { docusaurusURL } from '@app/utils/constants';
import * as requestService from 'services/request';
import { Integration } from '@app/interfaces/Request';

const setIntegration = jest.fn();
const setIntegrationCount = jest.fn();
const HYPERLINK = `${docusaurusURL}/css-application/client-types`;

function IntegrationListComponent() {
  return <IntegrationList setIntegration={setIntegration} setIntegrationCount={setIntegrationCount} />;
}

const mockRequest = {
  ...sampleRequest,
  id: 1,
  serviceType: 'gold',
  status: 'applied',
  authType: 'browser-login',
};

const spyGetRequest = jest
  .spyOn(require('services/request'), 'getRequests')
  .mockImplementation(() => Promise.resolve([[mockRequest], null]));
const spyDeleteRequest = jest
  .spyOn(require('services/request'), 'deleteRequest')
  .mockImplementation(() => Promise.resolve([[], null]));
const spyUseRouter = jest.spyOn(require('next/router'), 'useRouter').mockImplementation(() => ({
  pathname: '/request/1?status=applied',
  query: '',
  push: jest.fn(() => Promise.resolve(true)),
  replace: jest.fn(() => Promise.resolve(true)),
}));

describe('Integration list', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should match the expected button name, table headers, selected integration; expect the endpoint function been called', async () => {
    render(<IntegrationListComponent />);

    await waitFor(() => {
      expect(spyGetRequest).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '+ Request SSO Integration' }));
    });

    expect(screen.getByText('Request ID')).toBeInTheDocument();
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('00000001test projectCompletedBrowser LoginGold');
  });

  it('Should be able to click the Delete button', async () => {
    render(<IntegrationListComponent />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '+ Request SSO Integration' }));
    });

    fireEvent.click(await screen.findByRole('button', { name: 'delete' }));
    await waitFor(() => {
      expect(screen.getByText('Confirm Deletion'));
    });
    const confirmationInput = await screen.findByTestId('delete-confirmation-input');
    const confirmDeleteButton = await screen.findByTestId('confirm-delete-confirm-deletion');

    fireEvent.change(confirmationInput, { target: { value: sampleRequest.projectName } });
    expect((confirmDeleteButton as HTMLButtonElement).disabled).toBeFalsy();

    await waitFor(async () => {
      fireEvent.click(await screen.findByTestId('confirm-delete-confirm-deletion'));
    });
    await waitFor(() => {
      expect(spyDeleteRequest).toHaveBeenCalledTimes(1);
    });
  });

  it('Should be able to click the Edit button', async () => {
    render(<IntegrationListComponent />);
    await waitFor(() => {
      fireEvent.click(screen.getByLabelText('edit'));
    });
    expect(spyUseRouter).toHaveBeenCalled();
  });

  it('Should be able to click the Create Integration button', async () => {
    const spyRouter = jest.spyOn(require('next/router'), 'useRouter').mockImplementation(() => ({
      pathname: '/request',
      query: '',
      push: jest.fn(() => Promise.resolve(true)),
      replace: jest.fn(() => Promise.resolve(true)),
    }));

    render(<IntegrationListComponent />);
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: '+ Request SSO Integration' }));
    });
    expect(spyRouter).toHaveBeenCalled();
  });

  it('testing on the external link with empty integration list', async () => {
    const spyGetRequest = jest
      .spyOn(require('services/request'), 'getRequests')
      .mockImplementation(() => Promise.resolve([[], null]));

    render(<IntegrationListComponent />);
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Public or Confidential, learn more' })).toHaveAttribute(
        'href',
        HYPERLINK,
      );
    });
  });

  it('preserves the table when a polling response has no changes', async () => {
    let poll: (() => Promise<void>) | undefined;
    const intervalSpy = jest.spyOn(global, 'setInterval').mockImplementation((handler: TimerHandler) => {
      poll = handler as () => Promise<void>;
      return 1 as unknown as NodeJS.Timeout;
    });

    spyGetRequest
      .mockResolvedValueOnce([[{ ...mockRequest, status: 'submitted' }], null])
      .mockResolvedValueOnce([null, null] as any);

    render(<IntegrationListComponent />);

    expect(await screen.findByText('00000001')).toBeVisible();
    await waitFor(() => expect(intervalSpy).toHaveBeenCalled());

    await act(async () => {
      await poll?.();
    });

    expect(screen.getByText('00000001')).toBeVisible();
    expect(screen.queryByText('No Requests Submitted')).not.toBeInTheDocument();
    intervalSpy.mockRestore();
    spyGetRequest.mockReset();
    spyGetRequest.mockImplementation(() => Promise.resolve([[mockRequest], null]));
  });
});

describe('Delete Permissions', () => {
  const setupDeleteRender = (integration: Integration) => {
    // Deletability is decided from the transition table, so the row needs a resting status.
    jest
      .spyOn(requestService, 'getRequests')
      .mockResolvedValueOnce([[{ ...sampleRequest, status: 'applied', ...integration }], null]);
    render(<IntegrationListComponent />);
    return screen.findByRole('button', { name: 'delete' });
  };
  it('allows deletion for direct ownership', async () => {
    const deleteButton = await setupDeleteRender({ ...sampleRequest, usesTeam: false, projectLead: true });
    expect(deleteButton).toHaveAttribute('aria-disabled', 'false');
  });

  it('allows deletion for direct ownership when team is not yet selected', async () => {
    const deleteButton = await setupDeleteRender({ usesTeam: true, projectLead: false, teamId: undefined });
    expect(deleteButton).toHaveAttribute('aria-disabled', 'false');
  });

  it('disables deletion for team integration when user is not a team admin', async () => {
    const deleteButton = await setupDeleteRender({
      usesTeam: true,
      projectLead: false,
      teamId: 1,
      userTeamRole: 'member',
    });
    expect(deleteButton).toHaveAttribute('aria-disabled', 'true');
  });

  it('allows deletion for team integration when user is a team admin', async () => {
    const deleteButton = await setupDeleteRender({
      usesTeam: true,
      projectLead: false,
      teamId: 1,
      userTeamRole: 'admin',
    });
    expect(deleteButton).toHaveAttribute('aria-disabled', 'false');
  });
});
