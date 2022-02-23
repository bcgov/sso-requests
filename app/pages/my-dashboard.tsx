import React, { useState, useEffect, useMemo, useReducer } from 'react';
import { useRouter } from 'next/router';
import Grid from '@button-inc/bcgov-theme/Grid';
import styled from 'styled-components';
import Tab from 'react-bootstrap/Tab';
import { Request } from 'interfaces/Request';
import { Team } from 'interfaces/team';
import { RequestTabs } from 'components/RequestTabs';
import ResponsiveContainer, { MediaRule } from 'components/ResponsiveContainer';
import reducer, { DashboardReducerState, initialState } from 'reducers/dashboardReducer';
import RequestInfoTabs from 'page-partials/my-dashboard/RequestInfoTabs';
import TeamInfoTabs from 'page-partials/my-dashboard/TeamInfoTabs';
import { PageProps } from 'interfaces/props';
import IntegrationList from 'page-partials/my-dashboard/IntegrationList';
import TeamList from 'page-partials/my-dashboard/TeamList';

const mediaRules: MediaRule[] = [
  {
    maxWidth: 900,
    marginTop: 0,
    marginLeft: 10,
    marginRight: 10,
    marginUnit: 'px',
    horizontalAlign: 'none',
  },
  {
    width: 480,
    marginTop: 0,
    marginLeft: 2.5,
    marginRight: 2.5,
    marginUnit: 'rem',
    horizontalAlign: 'none',
  },
];

// TODO: move this logic to component Grid default style
const OverflowAuto = styled.div`
  overflow: auto;
`;

export const RequestsContext = React.createContext({} as { dispatch: Function; state: DashboardReducerState });

function MyDashboard({ currentUser }: PageProps) {
  const router = useRouter();
  let { tab } = router.query;

  const [tabKey, setTabKey] = useState<string>((tab && String(tab)) || 'activeProjects');
  const [integration, setIntegration] = useState<Request | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [state, dispatch] = useReducer(reducer, initialState);

  const contextValue = useMemo(() => {
    return { state, dispatch };
  }, [state, dispatch]);

  const updateTabKey = (key: string) => {
    setTabKey(key);
    router.replace('/my-dashboard');
  };

  return (
    <ResponsiveContainer rules={mediaRules}>
      <RequestsContext.Provider value={contextValue}>
        <Grid cols={10}>
          <Grid.Row collapse="1100" gutter={[15, 2]}>
            <Grid.Col span={6}>
              <OverflowAuto>
                <RequestTabs onSelect={(key: string) => updateTabKey(key)} activeKey={tabKey}>
                  <Tab eventKey="activeProjects" title="My Projects" />
                  <Tab eventKey="activeTeams" title="My Teams" />
                </RequestTabs>
                {tabKey === 'activeProjects' ? (
                  <IntegrationList setIntegration={setIntegration} />
                ) : (
                  <TeamList currentUser={currentUser} setTeam={setTeam} />
                )}
              </OverflowAuto>
            </Grid.Col>
            <Grid.Col span={4}>
              {tabKey === 'activeProjects'
                ? integration && <RequestInfoTabs integration={integration} />
                : team && <TeamInfoTabs team={team} currentUser={currentUser} />}
            </Grid.Col>
          </Grid.Row>
        </Grid>
      </RequestsContext.Provider>
    </ResponsiveContainer>
  );
}

export default MyDashboard;
