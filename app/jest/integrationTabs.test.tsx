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
  status: 'applied',
  publicAccess: false,
};

const bcServicesCardIntegration: Integration = {
  ...sampleRequest,
  devIdps: ['bcservicescard'],
  status: 'applied',
  publicAccess: false,
};

const otpIntegration: Integration = {
  ...sampleRequest,
  devIdps: ['otp'],
  status: 'applied',
  publicAccess: false,
};

const bcAndDcIntegration: Integration = {
  ...sampleRequest,
  devIdps: ['bcservicescard', 'digitalcredential'],
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
    render(<IntegrationTabs integration={bcServicesCardIntegration} />);
    browerLoginTabs.forEach((name) => {
      if (['Role Management', 'Assign Users to Roles'].includes(name)) {
        expect(screen.queryByText(name)).toBeNull();
      } else {
        screen.getByText(name);
      }
    });
  });

  it('Hides role management tab for an otp only integration', () => {
    render(<IntegrationTabs integration={otpIntegration} />);
    browerLoginTabs.forEach((name) => {
      if (['Role Management', 'Assign Users to Roles'].includes(name)) {
        expect(screen.queryByText(name)).toBeNull();
      } else {
        screen.getByText(name);
      }
    });
  });

  it('Hides role management tab for a bc services card and digital credential only integration', () => {
    render(<IntegrationTabs integration={bcAndDcIntegration} />);
    browerLoginTabs.forEach((name) => {
      if (['Role Management', 'Assign Users to Roles'].includes(name)) {
        expect(screen.queryByText(name)).toBeNull();
      } else {
        screen.getByText(name);
      }
    });
  });
});
