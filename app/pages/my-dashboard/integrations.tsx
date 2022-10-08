import React, { useState } from 'react';
import IntegrationInfoTabs from 'page-partials/my-dashboard/IntegrationInfoTabs';
import IntegrationList from 'page-partials/my-dashboard/IntegrationList';
import VerticalLayout from 'page-partials/my-dashboard/VerticalLayout';
import { Integration } from 'interfaces/Request';
import { PageProps } from 'interfaces/props';

function MyIntegrations({ session }: PageProps) {
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [integrationCount, setIntegrationCount] = useState(1);

  return (
    <VerticalLayout
      tab="integrations"
      leftPanel={() => <IntegrationList setIntegration={setIntegration} setIntegrationCount={setIntegrationCount} />}
      rightPanel={() => integration && <IntegrationInfoTabs integration={integration} />}
      showResizable={integrationCount > 0}
    />
  );
}

export default MyIntegrations;
