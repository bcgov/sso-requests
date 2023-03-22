import React, { useState, useContext, useMemo, useReducer } from 'react';
import { useRouter } from 'next/router';
import { Resizable } from 're-resizable';
import styled from 'styled-components';
import { Tabs, Tab } from '@bcgov-sso/common-react-components';
import ResponsiveContainer, { MediaRule } from 'components/ResponsiveContainer';

const InnerResizable = styled.div`
  height: 100%;
  overflow: auto;
`;

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

interface Props {
  tab: 'integrations' | 'teams';
  leftPanel?: () => React.ReactNode;
  rightPanel?: () => React.ReactNode;
  showResizable?: boolean;
  children?: React.ReactNode;
}

function VerticalLayout({ tab, leftPanel, rightPanel, showResizable = true, children }: Props) {
  const router = useRouter();

  const navigateTab = (key: any) => {
    router.replace(`/my-dashboard/${key}`);
  };

  const tabs = (
    <Tabs onChange={navigateTab} activeKey={tab} tabBarGutter={30}>
      <Tab key="integrations" tab="My Projects" />
      <Tab key="teams" tab="My Teams" />
    </Tabs>
  );

  return (
    <ResponsiveContainer rules={mediaRules}>
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
          <InnerResizable>{leftPanel && leftPanel()}</InnerResizable>
        </Resizable>
      ) : (
        leftPanel && leftPanel()
      )}
      <br />
      {rightPanel && rightPanel()}
    </ResponsiveContainer>
  );
}

export default VerticalLayout;
