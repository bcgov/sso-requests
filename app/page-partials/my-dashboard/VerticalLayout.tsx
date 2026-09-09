import React, { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Resizable } from 're-resizable';
import styled from 'styled-components';
import { Tabs } from '@bcgov-sso/common-react-components';
import ResponsiveContainer from 'components/ResponsiveContainer';
import { mediaRules } from 'page-partials/admin-dashboard/VerticalLayout';
import { getOrganizations } from '@app/services/organization';
import { appPermissions, hasAppPermission } from '@app/utils/authorize';
import { SessionContext } from '@app/utils/context';

const InnerResizable = styled.div`
  height: 100%;
  overflow: auto;
`;

interface Props {
  tab: 'integrations' | 'teams' | 'organizations';
  leftPanel?: () => React.ReactNode;
  rightPanel?: () => React.ReactNode;
  showResizable?: boolean;
  children?: React.ReactNode;
}

function VerticalLayout({ tab, leftPanel, rightPanel, showResizable = true, children }: Props) {
  const router = useRouter();
  const sessionContext = useContext(SessionContext);
  const isCssAdmin = hasAppPermission(sessionContext?.session?.client_roles, appPermissions.MANAGE_ORGANIZATIONS);
  const [hasOrganizations, setHasOrganizations] = useState(false);

  useEffect(() => {
    if (isCssAdmin) return;

    getOrganizations().then(([organizations, error]) => {
      if (error) {
        setHasOrganizations(false);
        return;
      }
      setHasOrganizations((organizations?.length ?? 0) > 0);
    });
  }, [isCssAdmin]);

  const navigateTab = (key: any) => {
    router.replace(`/my-dashboard/${key}`);
  };

  const tabItems = [
    {
      key: 'integrations',
      label: 'My Projects',
    },
    {
      key: 'teams',
      label: 'My Teams',
    },
    ...(isCssAdmin || hasOrganizations
      ? [
          {
            key: 'organizations',
            label: 'My Organizations',
          },
        ]
      : []),
  ];

  const tabs = <Tabs onChange={navigateTab} activeKey={tab} tabBarGutter={30} items={tabItems} />;

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
