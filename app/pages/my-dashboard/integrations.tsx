import React, { useState, Dispatch, SetStateAction } from 'react';
import RequestInfoTabs from 'page-partials/my-dashboard/IntegrationInfoTabs';
import IntegrationList from 'page-partials/my-dashboard/IntegrationList';
import VerticalLayout from 'page-partials/my-dashboard/VerticalLayout';
import { DashboardReducerState } from 'reducers/dashboardReducer';
import { PageProps } from 'interfaces/props';
import { Request } from 'interfaces/Request';

function MyIntegrations() {
  const [integration, setIntegration] = useState<Request | null>(null);

  return (
    <VerticalLayout
      tab="integrations"
      leftPanel={(state: DashboardReducerState, dispatch: Dispatch<SetStateAction<any>>) => (
        <IntegrationList setIntegration={setIntegration} state={state} dispatch={dispatch} />
      )}
      rightPanel={(state: DashboardReducerState, dispatch: Dispatch<SetStateAction<any>>) =>
        integration && <RequestInfoTabs integration={integration} state={state} dispatch={dispatch} />
      }
    />
  );
}

export default MyIntegrations;
