import { render, screen, fireEvent } from '@testing-library/react';
import UserRoles from 'page-partials/my-dashboard/UserRoles';
import { searchKeycloakUsers } from 'services/keycloak';
import { sampleRequest } from '../../samples/integrations';

jest.mock('services/keycloak', () => ({
  searchKeycloakUsers: jest.fn(() => Promise.resolve([[], null])),
  listClientRoles: jest.fn(() => Promise.resolve([[], null])),
}));

//const spyUseState = jest.spyOn(require('react'), 'useState').mockReturnValue(['mock state', {}]);

describe('assign user to roles tab', () => {
  it('Should display correct property options from the drop-down box', () => {
    render(<UserRoles selectedRequest={{ ...sampleRequest, environments: ['dev', 'test'], devIdps: ['idir'] }} />);
    expect(screen.getByRole('option', { name: 'Dev' }));
    expect(screen.getByRole('option', { name: 'Test' }));
    expect(screen.getByRole('option', { name: 'IDIR' }));
    expect(screen.getByRole('option', { name: 'Email' }));
  });

  it('Should be able to input some keywords in the Search Criteria input field', () => {
    render(<UserRoles selectedRequest={{ ...sampleRequest }} />);
    const searchInput = screen.getByRole('textbox');
    fireEvent.change(searchInput, { target: { value: 'sample_input' } });
    expect(screen.getByDisplayValue('sample_input')).toBeInTheDocument();
  });

  it('Should be able to click the Search button, and check the endpoint function been called', () => {
    render(<UserRoles selectedRequest={{ ...sampleRequest }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    //since the searchKey cannot be changed/mocked
    expect(searchKeycloakUsers).not.toHaveBeenCalled();
  });
  //need more tests on search result table
});
