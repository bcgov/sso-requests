import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Select, { MultiValue, ActionMeta } from 'react-select';
import { startCase } from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import Grid from '@button-inc/bcgov-theme/Grid';
import Loader from 'react-loader-spinner';
import { Request, Option } from 'interfaces/Request';
import { withTopAlert, TopAlert } from 'layout/TopAlert';
import { ActionButtonContainer, ActionButton, VerticalLine } from 'components/ActionButtons';
import Table from 'components/Table';
import { searchKeycloakUsers, listClientRoles, listUserRoles, manageUserRole, KeycloakUser } from 'services/keycloak';

const Label = styled.label`
  font-weight: bold;
  margin-bottom: 2px;
`;

const AlignCenter = styled.div`
  text-align: center;
`;

const TopMargin = styled.div`
  height: var(--field-top-spacing);
`;

const CenterAlign = styled.div`
  text-align: center;
`;

const FlexBox = styled.div`
  display: flex;
  & > * {
    padding-right: 0.5rem;
  }
`;

const idpOptions = [
  { value: 'idir', label: 'IDIR' },
  { value: 'bceidbasic', label: 'BCeID Basic' },
  { value: 'bceidbusiness', label: 'BCeID Business' },
  { value: 'bceidboth', label: 'BCeID Both' },
];

const propertyOptions = [
  { value: 'lastName', label: 'Last Name' },
  { value: 'firstName', label: 'First Name' },
  { value: 'email', label: 'Email' },
  { value: 'guid', label: 'IDP GUID' },
];

interface Props {
  selectedRequest: Request;
  alert: TopAlert;
}

const UserRoles = ({ selectedRequest, alert }: Props) => {
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingRight, setLoadingRight] = useState(false);
  const [rows, setRows] = useState<KeycloakUser[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('dev');
  const [selectedIdp, setSelectedIdp] = useState<string>(idpOptions[0].value);
  const [selectedProperty, setSelectedProperty] = useState<string>(propertyOptions[0].value);
  const [searchKey, setSearchKey] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const getRoles = async () => {
    if (!selectedRequest) return;

    const [data, err] = await listClientRoles({
      environment: selectedEnvironment,
      integrationId: selectedRequest.id as number,
    });

    if (data) setRoles(data);
  };

  useEffect(() => {
    setSelectedEnvironment('dev');
    setRows([]);
    setRoles([]);
    setUserRoles([]);
    setSelectedId(undefined);
  }, [selectedRequest.id]);

  useEffect(() => {
    getRoles();
    setRows([]);
    setRoles([]);
    setUserRoles([]);
    setSelectedId(undefined);
  }, [selectedEnvironment]);

  const handleSearch = async (searchKey: string) => {
    setLoading(true);
    setSearchKey(searchKey);
    setRows([]);
    setUserRoles([]);
    setSelectedId(undefined);
    setSearched(true);

    const [data, err] = await searchKeycloakUsers({
      environment: selectedEnvironment,
      idp: selectedIdp,
      property: selectedProperty,
      searchKey,
    });

    if (data) setRows(data);
    setLoading(false);
  };

  const handleRoleChange = async (
    newValue: MultiValue<{ value: string; label: string }>,
    actionMeta: ActionMeta<{
      value: string;
      label: string;
    }>,
  ) => {
    const data: any = {};
    if (actionMeta.action === 'remove-value') {
      data.mode = 'del';
      data.roleName = actionMeta.removedValue?.value as string;
    } else {
      data.mode = 'add';
      data.roleName = actionMeta.option?.value as string;
    }

    await setLoadingRight(true);
    const [roles, err] = await manageUserRole({
      environment: selectedEnvironment,
      integrationId: selectedRequest.id as number,
      username: selectedId as string,
      ...data,
    });

    await setUserRoles(roles || []);
    await setLoadingRight(false);
  };

  const handleUserSelect = async (username: string) => {
    setLoadingRight(true);
    const [data, err] = await listUserRoles({
      environment: selectedEnvironment,
      integrationId: selectedRequest.id as number,
      username,
    });

    await setUserRoles(data || []);
    setSelectedId(username);
    setLoadingRight(false);
  };

  let rightPanel = null;

  if (loadingRight) {
    rightPanel = (
      <AlignCenter>
        <TopMargin />
        <Loader type="Grid" color="#000" height={45} width={45} visible={true} />
      </AlignCenter>
    );
  } else if (selectedId) {
    rightPanel = (
      <>
        <Label>2. Assign User to a Role</Label>
        <Select
          value={userRoles.map((role) => ({ value: role, label: role }))}
          options={roles.map((role) => ({ value: role, label: role }))}
          isMulti={true}
          placeholder="Select..."
          noOptionsMessage={() => 'No roles'}
          onChange={handleRoleChange}
        />
      </>
    );
  }

  let content = null;
  if (!searched) {
    content = (
      <tr>
        <td colSpan={10}>
          <CenterAlign>You have not searched for any users yet.</CenterAlign>
        </td>
      </tr>
    );
  } else if (rows.length > 0) {
    content = rows.map((row: KeycloakUser) => {
      return (
        <tr
          key={row.username}
          className={selectedId === row.username ? 'active' : ''}
          onClick={() => {
            handleUserSelect(row.username);
          }}
        >
          <td>{row.firstName}</td>
          <td>{row.lastName}</td>
          <td>{row.email}</td>
          <td>{row.username}</td>
        </tr>
      );
    });
  } else {
    content = (
      <tr>
        <td colSpan={10}>
          <FlexBox>
            <FontAwesomeIcon icon={faExclamationCircle} color="#D44331" title="Edit" size="lg" />
            <div>
              The search criteria you entered does not exist in this Keycloak realm. If your user has already logged
              into your application, please try again.
            </div>
          </FlexBox>
        </td>
      </tr>
    );
  }

  const environments = selectedRequest?.environments || [];

  return (
    <>
      <TopMargin />
      <Grid cols={10}>
        <Grid.Row collapse="1100" gutter={[15, 2]}>
          <Grid.Col span={6}>
            <Label>1. Search for User</Label>
            <Table
              searchLocation="right"
              filters={[
                {
                  value: selectedEnvironment,
                  multiselect: false,
                  onChange: setSelectedEnvironment,
                  options: environments.map((env) => ({ value: env, label: startCase(env) })),
                },
                {
                  value: selectedIdp,
                  multiselect: false,
                  onChange: setSelectedIdp,
                  options: idpOptions,
                },
                {
                  value: selectedProperty,
                  multiselect: false,
                  onChange: setSelectedProperty,
                  options: propertyOptions,
                },
              ]}
              headers={[{ name: 'First name' }, { name: 'Last Name' }, { name: 'Email' }, { name: 'Username' }]}
              searchKey={searchKey}
              searchPlaceholder="Enter search criteria"
              onSearch={handleSearch}
              onEnter={handleSearch}
              loading={loading}
            >
              {content}
            </Table>
          </Grid.Col>
          <Grid.Col span={4}>{rightPanel}</Grid.Col>
        </Grid.Row>
      </Grid>
    </>
  );
};

export default withTopAlert(UserRoles);
