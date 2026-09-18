import { render, screen, fireEvent } from '@testing-library/react';
import { PRESETS } from '@sso/authz';
import ConfigurationUrlPanel from 'page-partials/my-dashboard/SecretsPanel';
import { sampleRequest } from '../../samples/integrations';
import { changeClientSecret } from 'services/keycloak';

const sampleIntegration = {
  ...sampleRequest,
  environments: ['dev', 'test', 'prod'],
  publicAccess: false,
};

jest.mock('services/keycloak', () => ({
  changeClientSecret: jest.fn(() => Promise.resolve(['', null])),
}));

describe('change client secret tab', () => {
  it('Should match all the included environments and button name', () => {
    render(<ConfigurationUrlPanel selectedRequest={sampleIntegration} />);
    expect(screen.findByDisplayValue('Development:'));
    expect(screen.findByDisplayValue('Test:'));
    expect(screen.findByDisplayValue('Production:'));
    expect(screen.getAllByRole('button', { name: 'Change your client secret' }));
  });

  it('Should be able to click the button and return expect modal, and check the endpoint function been called when click Confirm;', () => {
    render(<ConfigurationUrlPanel selectedRequest={{ sampleIntegration, environments: ['dev'] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Change your client secret' }));
    expect(screen.getByText(`You are about to change your client secret`)).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    fireEvent.click(screen.getByRole('button', { name: 'Change your client secret' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(changeClientSecret).toHaveBeenCalledTimes(1);
  });

  // Rolling a secret is gated on integrations:write, so an organization that
  // only manages roles is shown the panel without the button.
  it('Should not offer the change to someone who cannot write the integration', () => {
    render(
      <ConfigurationUrlPanel selectedRequest={{ ...sampleIntegration, permissions: [...PRESETS['role-manager']] }} />,
    );

    const buttons = screen.getAllByRole('button', { name: 'Change your client secret' });
    buttons.forEach((button) => expect(button).toBeDisabled());

    fireEvent.click(buttons[0]);
    expect(screen.queryByText('You are about to change your client secret')).not.toBeInTheDocument();
  });

  it('Should offer the change to an editor', () => {
    render(<ConfigurationUrlPanel selectedRequest={{ ...sampleIntegration, permissions: [...PRESETS.editor] }} />);
    screen
      .getAllByRole('button', { name: 'Change your client secret' })
      .forEach((button) => expect(button).not.toBeDisabled());
  });
});
