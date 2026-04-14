import { MouseEvent, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faExclamationTriangle, faMinusCircle, faEye } from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import { throttle, get, reduce } from 'lodash';
import { Grid as SpinnerGrid } from 'react-loader-spinner';
import { Integration, Option } from 'interfaces/Request';
import { withTopAlert, TopAlert } from 'layout/TopAlert';
import GenericModal, { ModalRef, emptyRef } from 'components/GenericModal';
import ActionButton from 'components/ActionButton';
import { LastSavedMessage, Tabs, Tab } from '@bcgov-sso/common-react-components';
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
import { dateTimeStringForFileName, generateXlsx } from '@app/utils/helpers';
import _ from 'lodash';
import TableNew from '@app/components/TableNew';
import { Col, Row } from 'react-bootstrap';

const COMPOSITE_ROLE_STRING_LENGTH = 17;

const Label = styled.label`
  font-weight: bold;
  margin-bottom: 2px;
`;

const AlignCenter = styled.div`
  text-align: center;
`;

const AlignRight = styled.div`
  text-align: right;
`;

const RightFloatServiceAccountsActionsButtons = styled.span`
  float: right;
  padding-right: 2.5em;
`;

const RightFloatUsersActionsButtons = styled.span`
  float: right;
  padding-right: 1.6em;
`;

const TopMargin = styled.div`
  height: var(--field-top-spacing);
`;

function UsersListActionsHeader() {
  return <span style={{ float: 'right', paddingRight: '1em' }}>Actions</span>;
}

function ServiceAccountsListActionsHeader() {
  return <span style={{ float: 'right', paddingRight: '1em' }}>Actions</span>;
}

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
  viewOnly?: boolean;
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

const RoleEnvironment = ({ environment, integration, alert, viewOnly = false }: Props) => {
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
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [compositeRoles, setCompositeRoles] = useState<Option[]>([]);
  const [compositeResult, setCompositeResult] = useState<boolean[]>([]);
  const [rightPanelTabs, setRightPanelTabs] = useState<string[]>([]);
  const [currentIntegrationID, setCurrentIntegrationID] = useState<number>();
  const [canCreateOrDeleteRole, setCanCreateOrDeleteRole] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<string>('');
  const [serviceAccountIntMap, setServiceAccountIntMap] = useState<SvcAcctUserIntegrationMapType[]>([]);
  const [compositeRoleError, setCompositeRoleError] = useState(false);

  const populateTabs = () => {
    let tabs: string[] = [];
    if (integration.authType === 'service-account') {
      tabs = ['Service Accounts', 'Composite Roles'];
    } else if (integration.authType === 'browser-login') {
      tabs = ['Users', 'Composite Roles'];
    } else {
      tabs = ['Users', 'Service Accounts', 'Composite Roles'];
    }
    setRightPanelTabs(tabs);
    // If there is no active tab, default to leftmost tab.
    if (rightPanelTab === '') {
      setRightPanelTab(tabs[0]);
    }
    // If the currently active tab is in the new set, keep it selected. Otherwise revert to the default.
    else if (!tabs.includes(rightPanelTab)) {
      setRightPanelTab(tabs[0]);
    }
  };

  const throttleCompositeRoleUpdate = useCallback(
    throttle(
      async (newValues: Option[]) => {
        if (!selectedRole) return;

        setSaving(true);
        setCompositeRoleError(false);
        const [, err] = await setCompositeClientRoles({
          environment,
          integrationId: integration.id as number,
          roleName: selectedRole,
          compositeRoleNames: newValues.map((v) => v.value) as string[],
        });

        if (err) {
          setSavingMessage('Failed to save changes.');
          setCompositeRoleError(true);
          setSaving(false);
          return false;
        }

        if (!err) setSavingMessage(`Last saved at ${new Date().toLocaleString()}`);
        await setSaving(false);
        fetchRoles();
        return true;
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
    setSelectedRole(null);
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

    const _roles = data == null ? [] : data.map((role: any) => role.name);

    if (err || !data) {
      alert.show({
        variant: 'danger',
        content: 'Failed to fetch roles.',
      });
    }

    setRoles(_roles.filter((role: string) => role.toLowerCase().includes(searchKey.toLowerCase())));
    setCompositeResult(data == null ? [] : data.map((role: any) => role.composite));

    if (_roles.length === 1) {
      setSelectedRole(_roles[0]);
    }
    setRoleLoading(false);
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

    if (err) {
      return alert.show({
        variant: 'danger',
        content: 'Failed to fetch users.',
      });
    }

    let _data = data || [];

    if (_data.length > 0) {
      _data.map(async (user) => {
        if (checkIfUserIsServiceAccount(user?.username)) {
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
    setSelectedRole(roleName);
    setUserLoading(false);
  };

  const exportRoleUsers = async () => {
    if (userLoading) return;
    setUserLoading(true);
    const data = [];
    while (true) {
      const [users, err] = await listRoleUsers({
        environment,
        integrationId: integration.id as number,
        roleName: selectedRole as string,
        first: data.length,
        max: maxUser,
      });
      if (err) {
        alert.show({
          variant: 'danger',
          content: 'Failed to export users.',
        });
        setUserLoading(false);
        return;
      }
      if (!users || users.length === 0) break;
      data.push(
        ...users.map((user) => {
          const identityProvider = user.username.split('@')[1];
          const githubOrBceidUser =
            identityProvider && (identityProvider.startsWith('bceid') || identityProvider.startsWith('github'));
          const username =
            user.attributes?.idir_username?.[0] ||
            user.attributes?.bceid_username?.[0] ||
            user.attributes?.github_username?.[0] ||
            '';
          const firstName = githubOrBceidUser ? '' : user.firstName;
          const lastName = githubOrBceidUser ? '' : user.lastName;
          const displayName = githubOrBceidUser ? user.firstName : user.attributes?.display_name?.[0] || '';
          return _.pick({ ...user, username, identityProvider, firstName, lastName, displayName }, [
            'firstName',
            'lastName',
            'email',
            'username',
            'identityProvider',
            'displayName',
          ]);
        }),
      );
    }
    generateXlsx(
      data,
      `${integration.projectName}-${environment}-${dateTimeStringForFileName()}-users`,
      `${selectedRole} users`,
    );
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
        content: 'Failed to fetch composite roles.',
      });
      return;
    }

    setCompositeRoles(data.map((v: string) => ({ label: v, value: v })));
    setCompositeLoading(false);
  };

  const updateRoleName = (role: string, index: number) => {
    if (compositeResult[index] == true) return `${role} (Composite role)`;
    else return role;
  };

  const handleSearchKeyChange = (value: string) => {
    setSearchKey(value);
  };

  const handleDelete = async (roleName: string) => {
    confirmModalRef.current.open(roleName);
  };

  const handleRightPanelTabSelect = (key: any) => {
    setRightPanelTab(key);
  };

  const activateRow = (row: any) => {
    if (row.role.endsWith(' (Composite role)')) {
      const roleLength = row.role.length;
      setSelectedRole(row.role.substr(0, roleLength - COMPOSITE_ROLE_STRING_LENGTH));
    } else setSelectedRole(row.role);
  };

  let rightPanel = null;
  if (firstUser === 0 && userLoading) {
    rightPanel = <LoaderContainer />;
  } else if (selectedRole) {
    const filterUsers = users.filter((user) => !user.username.startsWith('service-account-'));
    const filterServiceAccounts = filterServiceAccountUsers(users);
    if (rightPanelTab === 'Users') {
      rightPanel = (
        <>
          <div style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              className="primary short"
              onClick={exportRoleUsers}
              disabled={users.length === 0 || userLoading}
            >
              Export
            </button>
            <TableNew
              dataTestId="role-users-table"
              variant="mini"
              columns={[
                {
                  accessorKey: 'idp',
                  header: 'IDP',
                },
                {
                  accessorKey: 'guid',
                  header: 'GUID',
                },
                {
                  accessorKey: 'email',
                  header: 'Email',
                },
                {
                  accessorKey: 'actions',
                  header: 'Actions',

                  cell: (props) => {
                    const user = filterUsers.find((u) => {
                      const username = u.username.split('@')[0];
                      return username === props.row.getValue('guid');
                    });
                    const idpMeta = Object.values(propertyOptionMap)
                      .flat()
                      .find((v) => v.value === props.row.getValue('idp'));
                    return (
                      <RightFloatUsersActionsButtons>
                        <span
                          onClick={(event) => {
                            event.stopPropagation();

                            infoModalRef.current.open({
                              guid: user!.username.split('@')[0],
                              attributes: {
                                ...reduce(
                                  idpMeta ? [idpMeta] : [],
                                  (ret: { [key: string]: string }, keyVal: PropertyOption) => {
                                    ret[keyVal.label] = get(user, keyVal.value);
                                    return ret;
                                  },
                                  {},
                                ),
                                ...user!.attributes,
                              },
                            });
                          }}
                        >
                          <FontAwesomeIcon style={{ color: '#000' }} icon={faEye} size="lg" aria-label="User Detail" />
                        </span>

                        {viewOnly ? null : (
                          <span onClick={() => removeUserModalRef.current.open(user)}>
                            &nbsp;&nbsp;
                            <FontAwesomeIcon
                              style={{ color: '#FF0303' }}
                              icon={faMinusCircle}
                              size="lg"
                              aria-label="Remove User"
                            />
                          </span>
                        )}
                      </RightFloatUsersActionsButtons>
                    );
                  },
                },
              ]}
              data={
                filterUsers.map((user) => {
                  const usernameSplit = user.username.split('@');
                  if (usernameSplit.length < 2) return [];

                  const [guid, idp] = usernameSplit;
                  const idpMeta = propertyOptionMap[idp];

                  return {
                    idp: idpMap[idp],
                    guid: guid,
                    email: user.email,
                  };
                }) || []
              }
              enableGlobalSearch={false}
              noDataFoundMessage={<span>No users found.</span>}
              loading={userLoading}
              enablePagination={false}
            ></TableNew>
          </div>
        </>
      );
    } else if (rightPanelTab === 'Service Accounts') {
      rightPanel = (
        <TableNew
          dataTestId="role-service-accounts-table"
          variant="mini"
          columns={[
            {
              accessorKey: 'projectName',
              header: 'Project Name',
            },
            {
              accessorKey: 'actions',
              header: () => <ServiceAccountsListActionsHeader />,
              cell: (props) => {
                return viewOnly ? null : (
                  <span
                    onClick={() => removeServiceAccountModalRef.current.open({ username: props.row.original.username })}
                  >
                    <RightFloatServiceAccountsActionsButtons>
                      <FontAwesomeIcon
                        style={{ color: '#FF0303' }}
                        icon={faMinusCircle}
                        size="lg"
                        aria-label="Remove Service Account"
                      />
                    </RightFloatServiceAccountsActionsButtons>
                  </span>
                );
              },
            },
          ]}
          data={
            filterServiceAccounts.map((user) => {
              return {
                projectName: serviceAccountIntMap.find((u) => u.username == user.username)?.integration?.projectName,
                username: user.username,
              };
            }) || []
          }
          enableGlobalSearch={false}
          noDataFoundMessage="No service accounts found."
          loading={userLoading}
          hiddenColumns={['username']}
          enablePagination={false}
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
            onChange={async (newValues) => {
              const values = newValues as Option[];
              await throttleCompositeRoleUpdate(values)?.then(
                (updateSucceeded) => updateSucceeded && setCompositeRoles(values),
              );
            }}
            isDisabled={!canCreateOrDeleteRole || viewOnly}
          />
          <LastSavedMessage
            saving={saving}
            content={savingMessage}
            variant={compositeRoleError ? 'error' : 'success'}
          />
        </>
      );
    }
  }

  const leftPanel = (
    <TableNew
      dataTestId="roles-table"
      columns={[
        {
          accessorKey: 'role',
          header: 'Role Name',
        },
        {
          accessorKey: 'actions',
          header: '',
          cell: (props) => {
            return viewOnly ? null : (
              <AlignRight>
                <ActionButton
                  disabled={!canCreateOrDeleteRole}
                  icon={faTrash}
                  role="button"
                  aria-label="delete"
                  onClick={(event: MouseEvent) => {
                    if (canCreateOrDeleteRole) {
                      event.stopPropagation();
                      handleDelete(props.row.original.role);
                    }
                  }}
                  title="Delete"
                  size="lg"
                  style={{ marginRight: '1rem' }}
                />
              </AlignRight>
            );
          },
        },
      ]}
      data={roles.map((role: string, index: number) => {
        return {
          role: updateRoleName(role, index),
        };
      })}
      noDataFoundMessage={<span>No roles found.</span>}
      loading={roleLoading}
      globalSearchPlaceholder="Search existing roles"
      onRowSelect={activateRow}
      enablePagination={false}
    ></TableNew>
  );

  const tabItems = rightPanelTabs.map((tab) => ({
    key: tab,
    label: tab,
  }));

  return (
    <>
      {roleLoading ? (
        <LoaderContainer />
      ) : (
        <Row>
          <Col>{leftPanel}</Col>
          <Col>
            {selectedRole && (
              <Tabs onChange={handleRightPanelTabSelect} activeKey={rightPanelTab} tabBarGutter={30} items={tabItems} />
            )}
            {rightPanel}
          </Col>
        </Row>
      )}
      <GenericModal
        ref={confirmModalRef}
        title="Delete Role"
        closable={true}
        icon={faExclamationTriangle}
        onConfirm={async (contentRef: any, roleName: string) => {
          const [_, error] = await deleteRole({
            environment,
            integrationId: integration.id as number,
            roleName,
          });

          if (error) {
            alert.show({
              variant: 'danger',
              content: `Failed to delete role ${roleName}. Please try again.`,
            });
          }

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
