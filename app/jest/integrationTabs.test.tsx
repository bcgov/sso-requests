import { render, screen } from '@testing-library/react';
import IntegrationTabs from 'page-partials/my-dashboard/IntegrationInfoTabs';
import { Integration } from 'interfaces/Request';
import { sampleRequest } from './samples/integrations';

const serviceAccountTabs = [
  'Technical Details',
  'Role Management',
  'Assign Service Account to Roles',
  'Secrets',
  'Change History',
];

const serviceAccountIntegration: Integration = {
  ...sampleRequest,
  authType: 'service-account',
  status: 'applied',
  publicAccess: false,
};

describe('SSO Dashboard', () => {
  it('Displays the expected tabs for a service account integration', () => {
    render(<IntegrationTabs integration={serviceAccountIntegration} />);
    serviceAccountTabs.forEach((name) => screen.getByText(name));
  });
});
