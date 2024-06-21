import { render, screen } from '@testing-library/react';
import IntegrationTabs from 'page-partials/my-dashboard/IntegrationInfoTabs';
import { Integration } from 'interfaces/Request';
import { sampleRequest } from './samples/integrations';

const integreationCommonTabs = ['Technical Details', 'Role Management', 'Secrets', 'Change History', 'Metrics', 'Logs'];

const browerLoginTabs = [...integreationCommonTabs, 'Assign Users to Roles'];

const serviceAccountTabs = [...integreationCommonTabs, 'Assign Service Account to Roles'];

const serviceAccountIntegration: Integration = {
  ...sampleRequest,
  authType: 'service-account',
  status: 'applied',
  publicAccess: false,
};

const digitalCredentialIntegration: Integration = {
  ...sampleRequest,
  devIdps: ['digitalcredential'],
  environments: ['dev'],
  authType: 'browser-login',
  status: 'applied',
  publicAccess: false,
};

const bcServicesCardIntegration: Integration = {
  ...sampleRequest,
  devIdps: ['bcservicescard'],
  environments: ['dev'],
  authType: 'browser-login',
  status: 'applied',
  publicAccess: false,
};

describe('SSO Dashboard', () => {
  it('Displays the expected tabs for a service account integration', () => {
    render(<IntegrationTabs integration={serviceAccountIntegration} />);
    serviceAccountTabs.forEach((name) => screen.getByText(name));
  });

  it('Hides role management tab for a digital credential only integration', () => {
    render(<IntegrationTabs integration={digitalCredentialIntegration} />);
    browerLoginTabs.forEach((name) => {
      if (['Role Management', 'Assign Users to Roles'].includes(name)) {
        expect(screen.queryByText(name)).toBeNull();
      } else {
        screen.getByText(name);
      }
    });
  });

  it('Hides role management tab for a bc services card only integration', () => {
    render(<IntegrationTabs integration={digitalCredentialIntegration} />);
    browerLoginTabs.forEach((name) => {
      if (['Role Management', 'Assign Users to Roles'].includes(name)) {
        expect(screen.queryByText(name)).toBeNull();
      } else {
        screen.getByText(name);
      }
    });
  });
});
