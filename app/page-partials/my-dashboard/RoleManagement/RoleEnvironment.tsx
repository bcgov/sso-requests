import React, { MouseEvent, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faExclamationTriangle, faMinusCircle } from '@fortawesome/free-solid-svg-icons';
import { faExclamationCircle, faEye, faDownload, faLock } from '@fortawesome/free-solid-svg-icons';
import Select, { MultiValue, ActionMeta } from 'react-select';
import throttle from 'lodash.throttle';
import get from 'lodash.get';
import reduce from 'lodash.reduce';
import InfiniteScroll from 'react-infinite-scroller';
import Grid from '@button-inc/bcgov-theme/Grid';
import { Grid as SpinnerGrid } from 'react-loader-spinner';
import { Integration, Option } from 'interfaces/Request';
import { withTopAlert, TopAlert } from 'layout/TopAlert';
import GenericModal, { ModalRef, emptyRef } from 'components/GenericModal';
import { ActionButton } from 'components/ActionButtons';
import { Button, Table, LastSavedMessage, SearchBar, Tabs, Tab } from '@bcgov-sso/common-react-components';
import TableNew from 'components/TableNew';
import ControlledTable from 'components/ControlledTable';
import InfoOverlay from 'components/InfoOverlay';
import UserDetailModal from 'page-partials/my-dashboard/UserDetailModal';
import {
  listClientRoles,
  deleteRole,
  listRoleUsers,
  getCompositeClientRoles,
  setCompositeClientRoles,
  manageUserRole,
} from 'services/keycloak';
import { canCreateOrDeleteRoles } from 'helpers/permissions';
import { idpMap } from 'helpers/meta';
import { getRequest } from 'services/request';
import { checkIfUserIsServiceAccount, filterServiceAccountUsers } from 'helpers/users';
import { KeycloakUser } from 'interfaces/team';

const Label = styled.label`
  font-weight: bold;
  margin-bottom: 2px;
`;

const InfScroll = InfiniteScroll as unknown as (a: any) => JSX.Element;

const AlignCenter = styled.div`
  text-align: center;
`;

const AlignRight = styled.div`
  text-align: right;
`;

const TopMargin = styled.div`
  height: var(--field-top-spacing);
`;

interface PropertyOption {
  value: string;
  label: string;
}

const idirPropertyOptions: PropertyOption[] = [
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName', label: 'Last Name' },
  { value: 'email', label: 'Email' },
];

const bceidPropertyOptions: PropertyOption[] = [
  { value: 'firstName', label: 'Display Name' },
  { value: 'lastName', label: 'Username' },
  { value: 'email', label: 'Email' },
];

const githubPropertyOptions: PropertyOption[] = [
  { value: 'firstName', label: 'Name' },
  { value: 'lastName', label: 'Login' },
  { value: 'email', label: 'Email' },
];

const propertyOptionMap: { [key: string]: PropertyOption[] } = {
  idir: idirPropertyOptions,
  azureidir: idirPropertyOptions,
  bceidbasic: bceidPropertyOptions,
  bceidbusiness: bceidPropertyOptions,
  bceidboth: bceidPropertyOptions,
  githubpublic: githubPropertyOptions,
  githubbcgov: githubPropertyOptions,
};

const optionize = (v: string) => ({ label: v, value: v });
const optionizeAll = (vs: string[]) => vs.map(optionize);

interface Props {
  environment: string;
  integration: Integration;
  alert: TopAlert;
}

const LoaderContainer = () => (
  <AlignCenter>
    <TopMargin />
    <SpinnerGrid color="#000" height={45} width={45} wrapperClass="d-block" visible={true} />
  </AlignCenter>
);

type SvcAcctUserIntegrationMapType = {
  username: string;
  integration: Integration;
};

const RoleEnvironment = ({ environment, integration, alert }: Props) => {
  const infoModalRef = useRef<ModalRef>(emptyRef);
  const confirmModalRef = useRef<ModalRef>(emptyRef);
  const removeUserModalRef = useRef<ModalRef>(emptyRef);
  const removeServiceAccountModalRef = useRef<ModalRef>(emptyRef);
  const [roleLoading, setRoleLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [compositeLoading, setCompositeLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState('');
  const [searchKey, setSearchKey] = useState('');
  const [firstUser, setFirstUser] = useState(0);
  const [maxUser, setMaxUser] = useState(20);
  const [hasMoreUser, setHasMoreUser] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [users, setUsers] = useState<KeycloakUser[]>([]);
  const [selectedRole, setSelctedRole] = useState<string | null>(null);
  const [compositeRoles, setCompositeRoles] = useState<Option[]>([]);
  const [rightPanelTabs, setRightPanelTabs] = useState<string[]>([]);
  const [currentIntegrationID, setCurrentIntegrationID] = useState<number>();
  const [canCreateOrDeleteRole, setCanCreateOrDeleteRole] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<string>('');
  const [serviceAccountIntMap, setServiceAccountIntMap] = useState<SvcAcctUserIntegrationMapType[]>([]);

  const populateTabs = () => {
    if (integration.authType === 'service-account') {
      setRightPanelTabs(['Service Accounts', 'Composite Roles']);
      setRightPanelTab('Service Accounts');
    } else if (integration.authType === 'browser-login') {
      setRightPanelTabs(['Users', 'Composite Roles']);
      setRightPanelTab('Users');
    } else {
      setRightPanelTabs(['Users', 'Service Accounts', 'Composite Roles']);
      setRightPanelTab('Users');
    }
  };

  const throttleCompositeRoleUpdate = useCallback(
    throttle(
      async (newValues: Option[]) => {
        if (!selectedRole) return;

        await setSaving(true);
        const [, err] = await setCompositeClientRoles({
          environment,
          integrationId: integration.id as number,
          roleName: selectedRole,
          compositeRoleNames: newValues.map((v) => v.value) as string[],
        });

        if (!err) setSavingMessage(`Last saved at ${new Date().toLocaleString()}`);
        await setSaving(false);
      },
      2000,
      { trailing: true },
    ),
    [selectedRole],
  );

  const reset = () => {
    fetchRoles();
    setUsers([]);
    setRoles([]);
    setSelctedRole(null);
    setCanCreateOrDeleteRole(canCreateOrDeleteRoles(integration));
  };

  useEffect(() => {
    setServiceAccountIntMap([]);
    populateTabs();
    setCurrentIntegrationID(integration.id);
    if (integration.id !== currentIntegrationID) reset();
  }, [integration]);

  useEffect(() => {
    setServiceAccountIntMap([]);
    if (!selectedRole) return;
    fetchUsers(true, selectedRole);
    fetchComposite(selectedRole);
    setSaving(false);
    setSavingMessage('');
  }, [selectedRole]);

  const roleOptions = useMemo(() => {
    return optionizeAll(roles);
  }, [roles]);

  const fetchRoles = async () => {
    if (roleLoading) return;

    setRoleLoading(true);
    const [data, err] = await listClientRoles({
      environment,
      integrationId: integration.id as number,
      search: searchKey,
    });
    console.log('--------data---------', data);

    const _roles = data || [];

    if (err || !data) {
      alert.show({
        variant: 'danger',
        fadeOut: 5000,
        closable: true,
        content: err?.message || 'failed to fetch roles',
      });
    }

    setRoles(_roles);
    setRoleLoading(false);

    if (_roles.length === 1) {
      setSelctedRole(_roles[0]);
    }
  };

  const fetchUsers = async (loadFirst: boolean, roleName: string) => {
    if (userLoading) return;
    if (roleName.length < 2) return;

    let _first = 0;
    let _users: KeycloakUser[] = [];

    setUserLoading(true);

    if (loadFirst) {
      setFirstUser(_first);
    } else {
      _first = firstUser;
      _users = users;
    }

    const [data, err] = await listRoleUsers({
      environment,
      integrationId: integration.id as number,
      roleName,
      first: _first,
      max: maxUser,
    });

    let _data = data || [];

    if (_data.length > 0) {
      _data.map(async (user) => {
        if (checkIfUserIsServiceAccount(user.username)) {
          const a = user.username.split('-');
          const [data] = await getRequest(a[a.length - 1]);
          setServiceAccountIntMap([
            ...serviceAccountIntMap,
            { username: user.username, integration: data as Integration },
          ]);
        }
      });
    } else {
      setServiceAccountIntMap([]);
    }

    setHasMoreUser(_data.length === maxUser);
    setUsers(_users.concat(_data));
    setFirstUser(_first + maxUser);
    setSelctedRole(roleName);
    setUserLoading(false);
  };

  const fetchComposite = async (roleName: string) => {
    if (compositeLoading) return;

    setCompositeLoading(true);
    const [data, err] = await getCompositeClientRoles({
      environment,
      integrationId: integration.id as number,
      roleName,
    });

    if (err || !data) {
      alert.show({
        variant: 'danger',
        fadeOut: 5000,
        closable: true,
        content: err || 'failed to fetch composite roles',
      });
      return;
    }

    setCompositeRoles(data.map((v: string) => ({ label: v, value: v })));
    setCompositeLoading(false);
  };

  const handleSearchKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKey(event.target.value);
  };

  const handleSearchKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      fetchRoles();
    }
  };

  const handleDelete = async (roleName: string) => {
    confirmModalRef.current.open(roleName);
  };

  const handleRightPanelTabSelect = (key: any) => {
    setRightPanelTab(key);
  };

  let rightPanel = null;
  if (firstUser === 0 && userLoading) {
    rightPanel = <LoaderContainer />;
  } else if (selectedRole) {
    if (rightPanelTab === 'Users') {
      rightPanel = (
        <TableNew
          variant="mini"
          headers={[
            {
              accessor: 'id',
              Header: 'IDP',
            },
            {
              accessor: 'projectName',
              Header: 'GUID',
            },
            {
              accessor: 'status',
              Header: 'Email',
            },
            {
              accessor: 'actions',
              Header: 'Actions',
              disableSortBy: true,
            },
          ]}
          data={users.map((user) => {
            const usernameSplit = user.username.split('@');
            if (usernameSplit.length < 2) return null;

            const [guid, idp] = usernameSplit;
            const idpMeta = propertyOptionMap[idp];

            return {
              idp: idpMap[idp],
              guid: guid,
              email: user.email,
              actions: (
                <>
                  <span
                    onClick={(event) => {
                      event.stopPropagation();

                      infoModalRef.current.open({
                        guid: user.username.split('@')[0],
                        attributes: {
                          ...reduce(
                            idpMeta,
                            (ret: { [key: string]: string }, keyVal: PropertyOption) => {
                              ret[keyVal.label] = get(user, keyVal.value);
                              return ret;
                            },
                            {},
                          ),
                          ...user.attributes,
                        },
                      });
                    }}
                  >
                    <FontAwesomeIcon style={{ color: '#000' }} icon={faEye} size="lg" title="User Detail" />
                  </span>
                  &nbsp;&nbsp;
                  <span onClick={() => removeUserModalRef.current.open(user)}>
                    <FontAwesomeIcon style={{ color: '#FF0303' }} icon={faMinusCircle} size="lg" title="Remove User" />
                  </span>
                </>
              ),
            };
          })}
          colfilters={[]}
          noDataFoundElement={<td colSpan={5}>No users found.</td>}
        />
      );
    } else if (rightPanelTab === 'Service Accounts') {
      rightPanel = (
        <TableNew
          variant="mini"
          headers={[
            {
              accessor: 'projectName',
              Header: 'Project Name',
            },
            {
              accessor: 'actions',
              Header: 'Actions',
              disableSortBy: true,
            },
          ]}
          data={users.map((user) => {
            if (!checkIfUserIsServiceAccount(user.username)) return null;
            return {
              projectName: serviceAccountIntMap.find((u) => u.username == user.username)?.integration?.projectName,
              actions: (
                <span onClick={() => removeServiceAccountModalRef.current.open(user)}>
                  <FontAwesomeIcon
                    style={{ color: '#FF0303' }}
                    icon={faMinusCircle}
                    size="lg"
                    title="Remove Service Account"
                  />
                </span>
              ),
            };
          })}
          colfilters={[]}
          noDataFoundElement={<td colSpan={5}>No service accounts found.</td>}
        />
      );
    } else {
      rightPanel = compositeLoading ? (
        <LoaderContainer />
      ) : (
        <>
          <Label>
            Select the roles to be nested under the Parent role{' '}
            <InfoOverlay content="Composite roles associate (nest) one or more additional roles within it." />
          </Label>
          <Select
            value={compositeRoles}
            options={roleOptions.filter((v) => v.value !== selectedRole)}
            isMulti={true}
            placeholder="Select..."
            noOptionsMessage={() => 'No roles'}
            onChange={(newValues) => {
              setCompositeRoles(newValues as Option[]);
              throttleCompositeRoleUpdate(newValues as Option[]);
            }}
            isDisabled={!canCreateOrDeleteRole}
          />
          <LastSavedMessage saving={saving} content={savingMessage} />
        </>
      );
    }
  }

  const activateRow = (request: any) => {
    console.log('--------', request['cells'][0].value);
    setSelctedRole(request['cells'][0].value);
  };
  const leftPanel = (
    <TableNew
      headers={[
        {
          accessor: 'role',
          Header: 'Role Name',
        },
        {
          accessor: 'actions',
          Header: 'Actions',
          disableSortBy: true,
        },
      ]}
      noDataFoundElement={<td>No roles found.</td>}
      activateRow={activateRow}
      data={['role1', 'role2'].map((role: string) => {
        return {
          role: role,
          actions: (
            <AlignRight>
              <ActionButton
                disabled={!canCreateOrDeleteRole}
                icon={faTrash}
                role="button"
                aria-label="delete"
                onClick={(event: MouseEvent) => {
                  if (canCreateOrDeleteRole) {
                    event.stopPropagation();
                    handleDelete(role);
                  }
                }}
                title="Delete"
                size="lg"
                style={{ marginRight: '1rem' }}
              />
            </AlignRight>
          ),
        };
      })}
      colfilters={[]}
    />
  );

  return (
    <>
      <Grid cols={10}>
        <Grid.Row collapse="1100" gutter={[15, 2]}>
          <Grid.Col span={4}>
            <div style={{ display: 'flex', float: 'left' }}>
              <SearchBar
                type="text"
                maxLength="1000"
                placeholder="Search existing roles"
                value={searchKey}
                onChange={handleSearchKeyChange}
                onKeyUp={handleSearchKeyUp}
              />
              <Button type="button" size="small" variant="bcPrimary" onClick={fetchRoles}>
                Search
              </Button>
            </div>
          </Grid.Col>
          <Grid.Col span={6}>
            {selectedRole && (
              <Tabs onChange={handleRightPanelTabSelect} activeKey={rightPanelTab} tabBarGutter={30}>
                {rightPanelTabs.map((tab) => (
                  <Tab key={tab} tab={tab} />
                ))}
              </Tabs>
            )}
          </Grid.Col>
        </Grid.Row>
      </Grid>

      <TopMargin />

      {roleLoading ? (
        <LoaderContainer />
      ) : (
        <Grid cols={10}>
          <Grid.Row collapse="1100" gutter={[15, 2]}>
            <Grid.Col span={4}>{leftPanel}</Grid.Col>
            <Grid.Col span={6}>{rightPanel}</Grid.Col>
          </Grid.Row>
        </Grid>
      )}
      <GenericModal
        ref={confirmModalRef}
        title="Delete Role"
        icon={faExclamationTriangle}
        onConfirm={async (contentRef: any, roleName: string) => {
          await deleteRole({
            environment,
            integrationId: integration.id as number,
            roleName,
          });

          await reset();
        }}
        confirmButtonText="Delete"
        confirmButtonVariant="primary"
        cancelButtonVariant="secondary"
      >
        <div>Are you sure you want to delete this role?</div>
      </GenericModal>
      <GenericModal
        id="remove-user"
        ref={removeUserModalRef}
        title="Remove User from Role"
        icon={faExclamationTriangle}
        onConfirm={async (contentRef: any, user: KeycloakUser) => {
          if (!selectedRole) return;

          const [, err] = await manageUserRole({
            environment,
            integrationId: integration.id as number,
            username: user.username as string,
            roleName: selectedRole,
            mode: 'del',
          });

          if (err) {
            alert.show({
              variant: 'danger',
              fadeOut: 5000,
              closable: true,
              content: err,
            });
          }

          fetchUsers(true, selectedRole);
        }}
        confirmButtonText="Remove"
        confirmButtonVariant="primary"
        cancelButtonVariant="secondary"
      >
        <div>Are you sure you want to remove this user from this role?</div>
      </GenericModal>
      <GenericModal
        id="remove-service-account"
        ref={removeServiceAccountModalRef}
        title="Remove Service Account from Role"
        icon={faExclamationTriangle}
        onConfirm={async (contentRef: any, user: KeycloakUser) => {
          if (!selectedRole) return;

          const [, err] = await manageUserRole({
            environment,
            integrationId: integration.id as number,
            username: user.username as string,
            roleName: selectedRole,
            mode: 'del',
          });

          if (err) {
            alert.show({
              variant: 'danger',
              fadeOut: 5000,
              closable: true,
              content: err,
            });
          }

          fetchUsers(true, selectedRole);
        }}
        confirmButtonText="Remove"
        confirmButtonVariant="primary"
        cancelButtonVariant="secondary"
      >
        <div>Are you sure you want to remove this service account from this role?</div>
      </GenericModal>
      <UserDetailModal modalRef={infoModalRef} />
    </>
  );
};

export default withTopAlert(RoleEnvironment);
