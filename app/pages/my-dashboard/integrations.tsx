import React, { useState, Dispatch, SetStateAction } from 'react';
import RequestInfoTabs from 'page-partials/my-dashboard/IntegrationInfoTabs';
import IntegrationList from 'page-partials/my-dashboard/IntegrationList';
import VerticalLayout from 'page-partials/my-dashboard/VerticalLayout';
import { DashboardReducerState } from 'reducers/dashboardReducer';
import { Integration } from 'interfaces/Request';
import { PageProps } from 'interfaces/props';

function MyIntegrations({ session }: PageProps) {
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [integrationCount, setIntegrationCount] = useState(1);

  return (
    <VerticalLayout
      tab="integrations"
      leftPanel={(state: DashboardReducerState, dispatch: Dispatch<SetStateAction<any>>) => (
        <IntegrationList
          currentUser={session}
          setIntegration={setIntegration}
          setIntegrationCount={setIntegrationCount}
          state={state}
          dispatch={dispatch}
        />
      )}
      rightPanel={(state: DashboardReducerState, dispatch: Dispatch<SetStateAction<any>>) =>
        integration && (
          <RequestInfoTabs currentUser={session} integration={integration} state={state} dispatch={dispatch} />
        )
      }
      showResizable={integrationCount > 0}
    />
  );
}

export default MyIntegrations;
