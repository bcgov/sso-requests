import { render, screen, fireEvent } from '@testing-library/react';
import ConfigurationUrlPanel from 'page-partials/my-dashboard/SecretsPanel';
import { sampleRequest } from '../../samples/integrations';
import { changeClientSecret } from 'services/keycloak';

const sampleIntegration = {
  ...sampleRequest,
  environments: ['dev', 'test', 'prod'],
  publicAccess: false,
};

jest.mock('services/keycloak', () => ({
  changeClientSecret: jest.fn(() => Promise.resolve([[], null])),
}));

describe('change client secret tab', () => {
  it('should match the display data', () => {
    render(<ConfigurationUrlPanel selectedRequest={sampleIntegration} />);
    expect(screen.findByDisplayValue('Development:'));
    expect(screen.findByDisplayValue('Test:'));
    expect(screen.findByDisplayValue('Production:'));
  });

  it('should be able to click the button and return expect modal', () => {
    render(<ConfigurationUrlPanel selectedRequest={{ sampleIntegration, environments: ['dev'] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Change your client secret' }));
    expect(screen.getByTitle(`You're About to Change Your Client Secret`)).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByTitle(`You're About to Change Your Client Secret`)).not.toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Change your client secret' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(changeClientSecret).toHaveBeenCalled();
  });
});
