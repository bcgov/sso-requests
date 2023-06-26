import React from 'react';
import { useRouter } from 'next/router';
import Grid from '@button-inc/bcgov-theme/Grid';
import styled from 'styled-components';
import { Tabs, Tab } from '@bcgov-sso/common-react-components';
import ResponsiveContainer, { MediaRule } from 'components/ResponsiveContainer';

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

interface Props {
  tab: 'integrations' | 'teams' | 's2g';
  leftPanel?: () => React.ReactNode;
  rightPanel?: () => React.ReactNode;
  children?: React.ReactNode;
}

function MyDashboardLayout({ tab, leftPanel, rightPanel, children }: Props) {
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
                {leftPanel && leftPanel()}
              </OverflowAuto>
            </Grid.Col>
            <Grid.Col span={4}>{rightPanel && rightPanel()}</Grid.Col>
          </Grid.Row>
        </Grid>
      )}
    </ResponsiveContainer>
  );
}

export default MyDashboardLayout;
