import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import Select, { MultiValue, ActionMeta } from 'react-select';
import startCase from 'lodash.startcase';
import throttle from 'lodash.throttle';
import { Tabs, Tab, Alert } from '@bcgov-sso/common-react-components';
import Grid from '@button-inc/bcgov-theme/Grid';
import { Grid as SpinnerGrid } from 'react-loader-spinner';
import { Integration } from 'interfaces/Request';
import { withTopAlert, TopAlert } from 'layout/TopAlert';
import { LastSavedMessage } from '@bcgov-sso/common-react-components';
import { listClientRoles, listUserRoles, manageUserRoles } from 'services/keycloak';
import { Table } from '@bcgov-sso/common-react-components';
import TopAlertWrapper from '@app/components/TopAlertWrapper';
import Link from 'next/link';

const Label = styled.label`
  font-weight: bold;
  margin-bottom: 2px;
`;

const Readonly = styled.div<{ width?: string }>`
  background-color: #f1f1f1;
  margin: 2px 0 2px 0;
  padding: 4px 6px;
  ${(props) => (props.width ? `width: ${props.width};` : `width: 300px;`)}
`;

const AlignCenter = styled.div`
  text-align: center;
`;

const TopMargin = styled.div`
  height: var(--field-top-spacing);
`;

const Loading = () => (
  <AlignCenter>
    <TopMargin />
    <SpinnerGrid color="#000" height={45} width={45} wrapperClass="d-block" visible={true} />
  </AlignCenter>
);

interface PropertyOption {
  value: string;
  label: string;
  search: boolean;
  result: boolean;
  style?: any;
}

interface Props {
  selectedRequest: Integration;
  alert: TopAlert;
}

const ServiceAccountRoles = ({ selectedRequest, alert }: Props) => {
  const [loading, setLoading] = useState(false);
  const [loadingRight, setLoadingRight] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [environment, setEnvironment] = useState('dev');

  const environments = selectedRequest?.environments || [];

  const getServiceAccountUsername = (clientId: string) => {
    return `service-account-${clientId}`;
  };

  const throttleUpdate = useCallback(
    throttle(
      async (roleNames: string[]) => {
        await setSaving(true);
        const [, err] = await manageUserRoles({
          environment: environment,
          integrationId: selectedRequest.id as number,
          username: getServiceAccountUsername(selectedRequest.clientId as string),
          roleNames,
        });
        if (!err) setSavingMessage(`Last saved at ${new Date().toLocaleString()}`);
        await setSaving(false);
      },
      2000,
      { trailing: true },
    ),
    [selectedRequest?.id, environment, selectedId],
  );

  const handleRoleChange = async (
    newValue: MultiValue<{ value: string; label: string }>,
    actionMeta: ActionMeta<{
      value: string;
      label: string;
    }>,
  ) => {
    let newRoles: string[] = [];
    if (actionMeta.action === 'clear') {
    } else if (actionMeta.action === 'remove-value') {
      newRoles = userRoles.filter((role) => role !== (actionMeta.removedValue?.value as string));
    } else {
      newRoles = [...userRoles, actionMeta.option?.value as string];
    }

    throttleUpdate(newRoles);
    setUserRoles(newRoles);
  };

  const getRoles = async () => {
    if (!selectedRequest) return;

    await setLoading(true);

    const [data, err] = await listClientRoles({
      environment: environment,
      integrationId: selectedRequest.id as number,
      first: 0,
      max: 1000,
    });

    const roles = data || [];

    setRoles(roles);
    setLoading(false);
  };

  const fetchUserRoles = async (username: string) => {
    await setLoadingRight(true);
    const [data, err] = await listUserRoles({
      environment: environment,
      integrationId: selectedRequest.id as number,
      username,
    });

    await setUserRoles(data || []);
    setLoadingRight(false);
  };

  useEffect(() => {
    getRoles();
    setSavingMessage('');
    fetchUserRoles(getServiceAccountUsername(selectedRequest.clientId as string));
  }, [environment]);

  const handleTabSelect = (key: any) => {
    setEnvironment(key);
  };

  let rightPanel: any = null;

  return (
    <>
      <TopAlertWrapper>
        <Alert variant="info" closable={true} data-testid={`assign-svc-acct-role-risk-alert`}>
          <span className="normal">
            Please be advised that relying on client roles of a service account may involve security risk. Follow{' '}
            <Link href="mailto:bcgov.sso@gov.bc.ca">here</Link> to know more.
          </span>
        </Alert>
      </TopAlertWrapper>
      <Tabs onChange={handleTabSelect} activeKey={environment} tabBarGutter={30} destroyInactiveTabPane={true}>
        <br />
        {environments.map((env) => (
          <Tab key={env} tab={startCase(env)}>
            <Grid cols={10}>
              <Grid.Row collapse="1100" gutter={[15, 2]}>
                <Grid.Col span={5}>
                  <Table>
                    <thead>
                      <tr>
                        <th>Service Account</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="active">
                        <td>{selectedRequest.projectName}</td>
                      </tr>
                    </tbody>
                  </Table>
                </Grid.Col>
                <Grid.Col span={5}>
                  {loadingRight ? (
                    <Loading />
                  ) : (
                    <div>
                      <Label>Assign Service Account to a Role</Label>
                      <div data-testid="assign-svc-acct-to-role-select">
                        <Select
                          value={userRoles.map((role) => ({ value: role, label: role }))}
                          options={roles.map((role) => ({ value: role, label: role }))}
                          isMulti={true}
                          placeholder="Select..."
                          noOptionsMessage={() => 'No roles'}
                          onChange={handleRoleChange}
                        />
                      </div>

                      <LastSavedMessage saving={saving} content={savingMessage} />
                    </div>
                  )}
                </Grid.Col>
              </Grid.Row>
            </Grid>
          </Tab>
        ))}
      </Tabs>
    </>
  );
};

export default withTopAlert(ServiceAccountRoles);
