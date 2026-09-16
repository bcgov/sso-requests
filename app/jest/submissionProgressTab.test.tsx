import { render, screen, waitFor } from '@testing-library/react';
import IntegrationTabs from 'page-partials/my-dashboard/IntegrationInfoTabs';
import { Integration } from 'interfaces/Request';
import { RequestWorkflowProgress } from '@app/interfaces/WorkflowProgress';
import { getIntegrationProgress } from 'services/request';
import { sampleRequest } from './samples/integrations';

jest.mock('services/request', () => ({
  getIntegrationProgress: jest.fn(),
}));

const mockedGetProgress = getIntegrationProgress as jest.Mock;

const buildProgress = (overrides: Partial<RequestWorkflowProgress> = {}): RequestWorkflowProgress => ({
  workflowId: 'workflow-1',
  correlationId: 'corr-1',
  requestId: sampleRequest.id as number,
  type: 'INTEGRATION_APPLY',
  action: 'create',
  state: 'RUNNING',
  active: true,
  failedStep: null,
  error: null,
  startedAt: new Date().toISOString(),
  completedAt: null,
  steps: [
    {
      name: 'PLAN',
      label: 'Request received and validated',
      state: 'COMPLETED',
      attempts: 1,
      error: null,
      startedAt: null,
      completedAt: null,
    },
    {
      name: 'APPLY_DEV',
      label: 'Configuring Development environment',
      state: 'RUNNING',
      attempts: 1,
      error: null,
      startedAt: null,
      completedAt: null,
    },
    {
      name: 'APPLY_TEST',
      label: 'Configuring Test environment',
      state: 'PENDING',
      attempts: 0,
      error: null,
      startedAt: null,
      completedAt: null,
    },
    {
      name: 'FINALIZE',
      label: 'Finalizing integration',
      state: 'PENDING',
      attempts: 0,
      error: null,
      startedAt: null,
      completedAt: null,
    },
  ],
  ...overrides,
});

const submittedIntegration: Integration = { ...sampleRequest, status: 'processing' };
const appliedIntegration: Integration = { ...sampleRequest, status: 'applied', publicAccess: false };

describe('Submission progress tab', () => {
  beforeEach(() => jest.clearAllMocks());

  it('Shows only the progress tab while the request workflow is running', async () => {
    mockedGetProgress.mockResolvedValue([buildProgress(), null]);

    render(<IntegrationTabs integration={submittedIntegration} />);

    await screen.findByText('Submission Progress');
    await screen.findByText('Configuring Development environment...');
    await screen.findByText('Configuring Test environment');
    expect(screen.queryByText('Technical Details')).toBeNull();
  });

  it('Hides the progress tab once the request workflow has completed', async () => {
    mockedGetProgress.mockResolvedValue([buildProgress({ state: 'COMPLETED', active: false }), null]);

    render(<IntegrationTabs integration={appliedIntegration} />);

    await screen.findByText('Technical Details');
    await waitFor(() => expect(mockedGetProgress).toHaveBeenCalled());
    expect(screen.queryByText('Submission Progress')).toBeNull();
  });

  it('Keeps the progress tab visible on failure and tells the user to contact the SSO team', async () => {
    mockedGetProgress.mockResolvedValue([
      buildProgress({
        state: 'FAILED',
        active: false,
        failedStep: 'APPLY_TEST',
        steps: [
          {
            name: 'PLAN',
            label: 'Request received and validated',
            state: 'COMPLETED',
            attempts: 1,
            error: null,
            startedAt: null,
            completedAt: null,
          },
          {
            name: 'APPLY_DEV',
            label: 'Configuring Development environment',
            state: 'COMPLETED',
            attempts: 1,
            error: null,
            startedAt: null,
            completedAt: null,
          },
          {
            name: 'APPLY_TEST',
            label: 'Configuring Test environment',
            state: 'FAILED',
            attempts: 5,
            error: 'boom',
            startedAt: null,
            completedAt: null,
          },
        ],
      }),
      null,
    ]);

    render(<IntegrationTabs integration={{ ...sampleRequest, status: 'applyFailed' }} />);

    await screen.findByText('Submission Progress');
    await screen.findByText('An error has occurred.');
    await screen.findByText('Configuring Test environment - failed');

    const panel = await screen.findByTestId('submission-progress');
    expect(panel.textContent).toContain('failed at: APPLY_TEST');
    expect(panel.textContent).toContain('steps that already succeeded are left in place');
  });

  it('Does not render a progress tab when the integration has no request workflow history', async () => {
    mockedGetProgress.mockResolvedValue([null, null]);

    render(<IntegrationTabs integration={appliedIntegration} />);

    await screen.findByText('Technical Details');
    expect(screen.queryByText('Submission Progress')).toBeNull();
  });
});
