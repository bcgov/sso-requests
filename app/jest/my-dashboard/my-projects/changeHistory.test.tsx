import { render, screen, waitFor } from '@testing-library/react';
import UserEventPanel from 'components/UserEventPanel';
import { getRequestScopedEvents } from 'services/event';

jest.mock('services/event', () => ({
  getRequestScopedEvents: jest.fn(() => [[], null]),
}));

describe('change history tab', () => {
  it('Should match the event content, and check the endpoint function been called', async () => {
    render(<UserEventPanel requestId={1} />);
    await waitFor(() => {
      expect(screen.getByText('No events found'));
    });
    expect(getRequestScopedEvents).toHaveBeenCalledTimes(1);
  });
});
