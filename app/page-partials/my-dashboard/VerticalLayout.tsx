import React, { useState, useContext, useMemo, useReducer } from 'react';
import { useRouter } from 'next/router';
import { Resizable } from 're-resizable';
import styled from 'styled-components';
import Tab from 'react-bootstrap/Tab';
import ResponsiveContainer from 'components/ResponsiveContainer';
import { RequestTabs } from 'components/RequestTabs';
import reducer, { DashboardReducerState, initialState } from 'reducers/dashboardReducer';
import { SessionContext, SessionContextInterface } from 'pages/_app';
import { mediaRules } from './Layout';

const InnerResizable = styled.div`
  height: 100%;
  overflow: auto;
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
  showResizable?: boolean;
  children?: React.ReactNode;
}

function VerticalLayout({ tab, leftPanel, rightPanel, showResizable = true, children }: Props) {
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
        {tabs}
        {showResizable ? (
          <Resizable
            style={{ paddingTop: '2px', borderBottom: '3px solid black' }}
            defaultSize={{
              width: '100%',
              height: window.innerHeight * 0.4,
            }}
            enable={{ bottom: true }}
            handleStyles={{ bottom: { bottom: 0 } }}
          >
            <InnerResizable>{leftPanel && leftPanel(state, dispatch)}</InnerResizable>
          </Resizable>
        ) : (
          leftPanel && leftPanel(state, dispatch)
        )}
        <br />
        {rightPanel && rightPanel(state, dispatch)}
      </RequestsContext.Provider>
    </ResponsiveContainer>
  );
}

export default VerticalLayout;
