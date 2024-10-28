import { render, screen } from '@testing-library/react';
import IntegrationTabs from 'page-partials/my-dashboard/IntegrationInfoTabs';
import TabContent from 'page-partials/admin-dashboard/AdminTabs/TabContent';
import BcServicesCardTabContent from 'page-partials/admin-dashboard/AdminTabs/BcServicesCardTabContent';
import { Integration } from 'interfaces/Request';
import { sampleRequest } from '../samples/integrations';

const bcServicesCardIntegration: Integration = {
  ...sampleRequest,
  devIdps: ['bcservicescard'],
  status: 'applied',
  publicAccess: false,
};

const bcServicesCardIntegrationArchived: Integration = {
  ...sampleRequest,
  devIdps: ['bcservicescard'],
  status: 'applied',
  archived: true,
  publicAccess: false,
};

describe('SSO Dashboard', () => {
  it('BCSC Tab can approve submitted bcsc integrations', () => {
    render(<BcServicesCardTabContent integration={bcServicesCardIntegration} />);
    const textElement = screen.getByText('To begin the BC Services Card integration in production, Click Below.');
    expect(textElement).toBeInTheDocument();
  });

  it('BCSC Tab cannot approve archived bcsc integrations', () => {
    render(<BcServicesCardTabContent integration={bcServicesCardIntegrationArchived} />);
    const textElement = screen.getByText('Cannot approve deleted/archived integrations.');
    expect(textElement).toBeInTheDocument();
  });
});
