import { render, screen } from '@testing-library/react';
import TabContent from '@app/page-partials/admin-dashboard/AdminTabs/TabContent';
import { Integration } from '@app/interfaces/Request';

jest.mock('@app/services/event', () => ({
  getEvents: jest.fn(() => Promise.resolve([{ rows: [] }, null])),
}));

jest.mock('services/request', () => ({
  updateRequest: jest.fn(),
}));

const integration = {
  id: 1,
  status: 'submitted',
  bcgovidirApproved: true,
  lastChanges: [
    {
      lhs: false,
      rhs: true,
      path: ['bcgovidirApproved'],
      kind: 'E',
    },
  ],
} as Integration;

describe('IDP approval status', () => {
  it('shows an in-flight message while an approval workflow is running', async () => {
    render(<TabContent integration={integration} type="BCGOV IDIR" canApproveProd={false} notApplied={true} />);

    expect(await screen.findByText('Your request for BCGOV IDIR production approval is being applied.')).toBeVisible();
    expect(screen.queryByText(/could not be completed/)).not.toBeInTheDocument();
  });

  it('shows an error only after the approval workflow fails', async () => {
    render(
      <TabContent
        integration={{ ...integration, status: 'applyFailed' }}
        type="BCGOV IDIR"
        canApproveProd={false}
        notApplied={true}
      />,
    );

    expect(await screen.findByText(/could not be completed/)).toBeVisible();
  });
});
