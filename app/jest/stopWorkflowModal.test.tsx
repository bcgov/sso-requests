import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StopWorkflowModal from 'page-partials/admin-dashboard/StopWorkflowModal';
import { stopRequestWorkflow } from 'services/request';
import { sampleRequest } from './samples/integrations';

jest.mock('services/request', () => ({
  stopRequestWorkflow: jest.fn(),
}));

const mockedStop = stopRequestWorkflow as jest.Mock;

describe('Stop workflow (admin)', () => {
  beforeEach(() => {
    mockedStop.mockReset();
  });

  it('is offered only while the integration is in flight', () => {
    const { rerender } = render(<StopWorkflowModal request={{ ...sampleRequest, status: 'applied' }} />);
    expect(screen.queryByTestId('stop-workflow-button')).toBeNull();

    rerender(<StopWorkflowModal request={{ ...sampleRequest, status: 'planned' }} />);
    expect(screen.getByTestId('stop-workflow-button')).toBeInTheDocument();
  });

  it('stops the workflow on confirm and refreshes the panel', async () => {
    mockedStop.mockResolvedValue([{ state: 'FAILED' }, null]);
    const onUpdate = jest.fn();
    render(<StopWorkflowModal request={{ ...sampleRequest, id: 7, status: 'planned' }} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByTestId('stop-workflow-button'));
    fireEvent.click(screen.getByTestId('confirm-delete-stop-workflow'));

    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    expect(mockedStop).toHaveBeenCalledWith(7);
  });

  it('keeps the dialog open with the reason when the server refuses', async () => {
    mockedStop.mockResolvedValue([null, 'This integration has finished applying and completes on its own.']);
    const onUpdate = jest.fn();
    render(<StopWorkflowModal request={{ ...sampleRequest, status: 'planned' }} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByTestId('stop-workflow-button'));
    fireEvent.click(screen.getByTestId('confirm-delete-stop-workflow'));

    expect(await screen.findByRole('alert')).toHaveTextContent('finished applying');
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
