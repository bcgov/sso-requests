import { render, screen, fireEvent } from '@testing-library/react';
import ConfigurationUrlPanel from 'page-partials/my-dashboard/SecretsPanel';
import { sampleRequest } from '../../samples/integrations';
import CenteredModal from 'components/CenteredModal';

const sampleIntegration = {
  ...sampleRequest,
  environments: ['dev', 'test', 'prod'],
  publicAccess: false,
};

jest.mock('components/CenteredModal', () => {
  return {
    CenteredModal: jest.fn(),
  };
});

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
    render(<ConfigurationUrlPanel selectedRequest={sampleIntegration} />);
    fireEvent.click(screen.getByText('Change your client secret'));
    expect(screen.getByTitle(`You're About to Change Your Client Secret`)).toBeVisible();
    expect(CenteredModal).toHaveBeenCalled();
    fireEvent.click(screen.getByText('Confirm'));
    expect(screen.findByText(`Client Secret Successfully Updated`));
  });

  //test integration with secret to test mock confirm
});
