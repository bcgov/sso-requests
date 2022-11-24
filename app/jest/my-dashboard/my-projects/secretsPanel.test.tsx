import { render, screen, fireEvent } from '@testing-library/react';
import ConfigurationUrlPanel from 'page-partials/my-dashboard/SecretsPanel';
import { sampleRequest } from '../../samples/integrations';

describe('change client secret tab', () => {
  it('should match the display data', () => {
    render(<ConfigurationUrlPanel selectedRequest={{ ...sampleRequest, environments: ['dev', 'test', 'prod'] }} />);
    expect(screen.getByText('Development:'));
    expect(screen.getByText('Test:'));
    expect(screen.getByText('Production:'));
  });

  it('should be able to click the button and return expect modal', () => {
    render(<ConfigurationUrlPanel selectedRequest={{ ...sampleRequest, publicAccess: false }} />);
    fireEvent.click(screen.getByText('Change your client secret'));
    expect(screen.getByTitle(`You're About to Change Your Client Secret`)).toBeVisible();
    fireEvent.click(screen.getByText('Confirm'));
    expect(screen.findByText(`Client Secret Successfully Updated`));
  });

  //test integration with secret to test mock confirm
  //fixture
  //create a folder: mock; put all the mock function in
});
