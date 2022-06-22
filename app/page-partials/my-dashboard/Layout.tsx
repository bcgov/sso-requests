import React, { useState, useContext, useMemo, useReducer } from 'react';
import { useRouter } from 'next/router';
import Grid from '@button-inc/bcgov-theme/Grid';
import styled from 'styled-components';
import Tab from 'react-bootstrap/Tab';
import { RequestTabs } from 'components/RequestTabs';
import ResponsiveContainer, { MediaRule } from 'components/ResponsiveContainer';
import reducer, { DashboardReducerState, initialState } from 'reducers/dashboardReducer';
import { SessionContext, SessionContextInterface } from 'pages/_app';

export const mediaRules: MediaRule[] = [
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

const WholePage = styled.div`
  padding-top: 2px;
`;

export interface DispatchAction {
  type: string;
  value: any;
}
export const RequestsContext = React.createContext(
  {} as { dispatch: React.Dispatch<React.SetStateAction<any>>; state: DashboardReducerState },
);

interface Props {
  tab: 'integrations' | 'teams' | 's2g';
  leftPanel?: (state: DashboardReducerState, dispatch: React.Dispatch<React.SetStateAction<any>>) => React.ReactNode;
  rightPanel?: (state: DashboardReducerState, dispatch: React.Dispatch<React.SetStateAction<any>>) => React.ReactNode;
  children?: React.ReactNode;
}

function MyDashboardLayout({ tab, leftPanel, rightPanel, children }: Props) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);

  const context = useContext<SessionContextInterface | null>(SessionContext);
  const { user, enableGold } = context || {};
  const hasSilverIntegration = user?.integrations?.find((integration: any) => integration.serviceType === 'silver');

  const contextValue = useMemo(() => {
    return { state, dispatch };
  }, [state, dispatch]);

  const navigateTab = (key: any) => {
    router.replace(`/my-dashboard/${key}`);
  };

  const tabs = (
    <RequestTabs onSelect={navigateTab} activeKey={tab}>
      <Tab eventKey="integrations" title="My Projects" />
      <Tab eventKey="teams" title="My Teams" />
      {enableGold && hasSilverIntegration && <Tab eventKey="s2g" title="*New - Silver to Gold Upgrade" />}
    </RequestTabs>
  );

  return (
    <ResponsiveContainer rules={mediaRules}>
      <RequestsContext.Provider value={contextValue}>
        {children ? (
          <WholePage>
            {tabs}
            {children}
          </WholePage>
        ) : (
          <Grid cols={10}>
            <Grid.Row collapse="1100" gutter={[15, 2]}>
              <Grid.Col span={6}>
                <OverflowAuto>
                  {tabs}
                  {leftPanel && leftPanel(state, dispatch)}
                </OverflowAuto>
              </Grid.Col>
              <Grid.Col span={4}>{rightPanel && rightPanel(state, dispatch)}</Grid.Col>
            </Grid.Row>
          </Grid>
        )}
      </RequestsContext.Provider>
    </ResponsiveContainer>
  );
}

export default MyDashboardLayout;
