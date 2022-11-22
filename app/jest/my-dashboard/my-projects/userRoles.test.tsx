import { render, screen, fireEvent } from '@testing-library/react';
import UserRoles from 'page-partials/my-dashboard/UserRoles';
import { sampleRequest } from '../../samples/integrations';

describe('assign user to roles tab', () => {
  it('should display correct property options', async () => {
    render(<UserRoles selectedRequest={{ ...sampleRequest, environments: ['dev', 'test'], devIdps: ['idir'] }} />);
    expect(screen.getByRole('option', { name: 'Dev' }));
    expect(screen.getByRole('option', { name: 'Test' }));
    expect(screen.getByRole('option', { name: 'IDIR' }));
    expect(screen.findByTitle('First Name'));
  });

  it('should be able to input some keywords in the input field', () => {
    render(<UserRoles selectedRequest={{ ...sampleRequest }} />);
    const searchInput = screen.getByRole('textbox');
    fireEvent.change(searchInput, { target: { value: 'sample_input' } });
    expect(screen.getByDisplayValue('sample_input')).toBeInTheDocument();
  });

  it('click the Search button with empty input, will pop out warning info', async () => {
    render(<UserRoles selectedRequest={{ ...sampleRequest }} />);
    fireEvent.click(screen.getByText('Search'));
    expect(screen.findByLabelText('popover-basic'));
  });
});
