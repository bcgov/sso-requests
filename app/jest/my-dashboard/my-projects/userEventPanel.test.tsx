import { render, screen, fireEvent } from '@testing-library/react';
import UserEventPanel from 'components/UserEventPanel';

describe('change history tab', () => {
  it('should match the event content', () => {
    render(<UserEventPanel requestId={0} />);
    expect(screen.getByText('No events found'));
  });
});
