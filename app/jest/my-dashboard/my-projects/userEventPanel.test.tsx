import { render, screen } from '@testing-library/react';
import UserEventPanel from 'components/UserEventPanel';
import EventContent from 'components/EventContent';

jest.mock('components/EventContent', () => ({
  EventContent: jest.fn(),
}));

describe('change history tab', () => {
  it('should match the event content', () => {
    render(<UserEventPanel requestId={undefined} />);
    //expect(screen.getByText('No events found'));
    expect(EventContent).toHaveBeenCalled();
  });
});
