import { render, screen } from '@testing-library/react';
import UserEventPanel from 'components/UserEventPanel';
import { getEvents } from 'services/event';

jest.mock('services/event', () => ({
  getEvents: jest.fn(() => Promise.resolve([[], null])),
}));

describe('change history tab', () => {
  it('should match the event content', () => {
    render(<UserEventPanel requestId={1} />);
    expect(getEvents).toHaveBeenCalled();
  });
});
