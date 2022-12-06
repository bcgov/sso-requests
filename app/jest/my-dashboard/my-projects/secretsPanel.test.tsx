import { render, screen, fireEvent } from '@testing-library/react';
import ConfigurationUrlPanel from 'page-partials/my-dashboard/SecretsPanel';
import { sampleRequest } from '../../samples/integrations';
import handleSecretChange from 'page-partials/my-dashboard/SecretsPanel';

const sampleIntegration = {
  ...sampleRequest,
  environments: ['dev', 'test', 'prod'],
  publicAccess: false,
};

jest.mock('page-partials/my-dashboard/SecretsPanel', () => ({
  handleSecretChange: jest.fn(),
}));

describe('change client secret tab', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should match the display data', () => {
    render(<ConfigurationUrlPanel selectedRequest={sampleIntegration} />);
    expect(screen.getByText('Development:'));
    expect(screen.getByText('Test:'));
    expect(screen.getByText('Production:'));
  });

  it('should be able to click the button and return expect modal', () => {
    render(<ConfigurationUrlPanel selectedRequest={{ sampleIntegration, environments: ['dev'] }} />);
    fireEvent.click(screen.getByText('Change your client secret'));
    expect(screen.getByTitle(`You're About to Change Your Client Secret`)).toBeVisible();

    fireEvent.click(screen.getByText('Confirm'));
    expect(handleSecretChange).toHaveBeenCalled();
    //expect(screen.findByText(`Client Secret Successfully Updated`));
  });
});
