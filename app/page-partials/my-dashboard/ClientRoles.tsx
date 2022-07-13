import React, { MouseEvent, useEffect, useState, useRef, useCallback } from 'react';
import styled from 'styled-components';
import Tab from 'react-bootstrap/Tab';
import { Button } from '@bcgov-sso/common-react-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faExclamationTriangle, faMinusCircle } from '@fortawesome/free-solid-svg-icons';
import Select, { MultiValue, ActionMeta } from 'react-select';
import { map, omitBy, startCase, isEmpty, throttle } from 'lodash';
import InfiniteScroll from 'react-infinite-scroller';
import Input from '@button-inc/bcgov-theme/Input';
import Grid from '@button-inc/bcgov-theme/Grid';
import { Grid as SpinnerGrid } from 'react-loader-spinner';
import { Request, ClientRole, Option } from 'interfaces/Request';
import { withTopAlert, TopAlert } from 'layout/TopAlert';
import SaveMessage from 'form-components/SaveMessage';
import { RequestTabs } from 'components/RequestTabs';
import GenericModal, { ModalRef, emptyRef } from 'components/GenericModal';
import { ActionButton } from 'components/ActionButtons';
import { Table } from '@bcgov-sso/common-react-components';
import InfoOverlay from 'components/InfoOverlay';
import CreateRoleContent from './roles/CreateRoleContent';
import {
  searchKeycloakUsers,
  listClientRoles,
  deleteRole,
  listRoleUsers,
  setCompositeClientRoles,
  manageUserRole,
  KeycloakUser,
} from 'services/keycloak';

const StyledInput = styled(Input)`
  display: inline-block;
  input {
    min-width: 200px;
    height: 40px;
  }
`;

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

const rightPanelTabs = ['Users', 'Composite Roles'];

interface Props {
  selectedRequest: Request;
  alert: TopAlert;
}

const LoaderContainer = () => (
  <AlignCenter>
    <TopMargin />
    <SpinnerGrid color="#000" height={45} width={45} wrapperClass="d-block" visible={true} />
  </AlignCenter>
);

const ClientRoles = ({ selectedRequest, alert }: Props) => {
  const modalRef = useRef<ModalRef>(emptyRef);
  const confirmModalRef = useRef<ModalRef>(emptyRef);
  const removeUserModalRef = useRef<ModalRef>(emptyRef);
  const [environment, setEnvironment] = useState('dev');
  const [roleLoading, setRoleLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState('');
  const [firstRole, setFirstRole] = useState(0);
  const [searchKey, setSearchKey] = useState('');
  const [maxRole, setMaxRole] = useState(20);
  const [hasMoreRole, setHasMoreRole] = useState(true);
  const [firstUser, setFirstUser] = useState(0);
  const [maxUser, setMaxUser] = useState(20);
  const [hasMoreUser, setHasMoreUser] = useState(true);
  const [roles, setRoles] = useState<ClientRole[]>([]);
  const [users, setUsers] = useState<KeycloakUser[]>([]);
  const [selectedRole, setSelctedRole] = useState<ClientRole | null>(null);
  const [compositeRoles, setCompositeRoles] = useState<Option[]>([]);
  const [rightPanelTab, setRightPanelTab] = useState<string>(rightPanelTabs[0]);

  const throttleCompositeRoleUpdate = useCallback(
    throttle(
      async (newValues: Option[]) => {
        if (!selectedRole) return;

        await setSaving(true);
        const [newRole, err] = await setCompositeClientRoles({
          environment,
          integrationId: selectedRequest.id as number,
          roleName: selectedRole.name,
          compositeRoleNames: newValues.map((v) => v.value) as string[],
        });

        if (newRole) {
          const newRoles = roles.map((role) => {
            if (role.name === newRole.name) return newRole;
            return role;
          });
          setRoles(newRoles);
        }

        if (!err) setSavingMessage(`Last saved at ${new Date().toLocaleString()}`);
        await setSaving(false);
      },
      2000,
      { trailing: true },
    ),
    [selectedRequest?.id, selectedRole],
  );

  const reset = () => {
    fetchRoles(true);
    setUsers([]);
    setRoles([]);
    setSelctedRole(null);
  };

  useEffect(() => {
    setEnvironment('dev');
    reset();
  }, [selectedRequest.id]);

  useEffect(() => {
    reset();
  }, [environment]);

  useEffect(() => {
    if (!selectedRole) return;

    setSavingMessage('');
    fetchUsers(true, selectedRole);
    setCompositeRoles(selectedRole.composites.map((name: string) => ({ label: name, value: name })));
  }, [selectedRole]);

  const fetchRoles = async (loadFirst: boolean) => {
    if (roleLoading) return;

    let _first = 0;
    let _roles: ClientRole[] = [];

    setRoleLoading(true);
    if (loadFirst) {
      setFirstRole(_first);
      setSelctedRole(null);
    } else {
      _first = firstRole;
      _roles = roles;
    }

    const [data, err] = await listClientRoles({
      environment,
      integrationId: selectedRequest.id as number,
      first: _first,
      search: searchKey,
      max: maxRole,
    });

    const _data = data || [];
    const allroles = _roles.concat(_data);

    setHasMoreRole(_data.length === maxRole);
    setRoles(allroles);
    setFirstRole(_first + maxRole);
    setRoleLoading(false);

    if (allroles.length === 1) {
      setSelctedRole(allroles[0]);
    }
  };

  const fetchUsers = async (loadFirst: boolean, role: ClientRole) => {
    if (!role || userLoading) return;
    if (role.name.length < 2) return;

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
      integrationId: selectedRequest.id as number,
      roleName: role.name,
      first: _first,
      max: maxUser,
    });

    const _data = data || [];

    setHasMoreUser(_data.length === maxUser);
    setUsers(_users.concat(_data));
    setFirstUser(_first + maxUser);
    setSelctedRole(role);
    setUserLoading(false);
  };

  const handleSearchKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKey(event.target.value);
  };

  const handleSearchKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      fetchRoles(true);
    }
  };

  const handleDelete = async (role: ClientRole) => {
    confirmModalRef.current.open(role.name);
  };

  const handleTabSelect = (key: any) => {
    setEnvironment(key);
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
        <Table variant="mini">
          <thead>
            <tr>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Email</th>
              <th>Username</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          {users.length > 0 ? (
            <InfScroll
              element="tbody"
              loadMore={() => fetchUsers(false, selectedRole)}
              hasMore={hasMoreUser}
              loader={<LoaderContainer />}
            >
              {users.map((user) => {
                return (
                  <tr>
                    <td>{user.firstName}</td>
                    <td>{user.lastName}</td>
                    <td>{user.email}</td>
                    <td>{user.username}</td>
                    <td className="text-center">
                      <span onClick={() => removeUserModalRef.current.open(user)}>
                        <FontAwesomeIcon style={{ color: '#FF0303' }} icon={faMinusCircle} title="Remove User" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </InfScroll>
          ) : (
            <tbody>
              <tr>
                <td colSpan={5}>No users found.</td>
              </tr>
            </tbody>
          )}
        </Table>
      );
    } else {
      rightPanel = (
        <>
          <Label>
            Select the roles to be nested under the Parent role{' '}
            <InfoOverlay content="Composite roles associate (nest) one or more additional roles within it." />
          </Label>
          <Select
            value={compositeRoles}
            options={roles.map((role) => ({ value: role.name, label: role.name }))}
            isMulti={true}
            placeholder="Select..."
            noOptionsMessage={() => 'No roles'}
            onChange={(newValues) => {
              setCompositeRoles(newValues as Option[]);
              throttleCompositeRoleUpdate(newValues as Option[]);
            }}
          />
          <SaveMessage saving={saving} content={savingMessage} />
        </>
      );
    }
  }

  let leftContent = <tbody />;
  if (roles.length > 0) {
    leftContent = (
      <InfScroll element="tbody" loadMore={() => fetchRoles(false)} hasMore={hasMoreRole} loader={<LoaderContainer />}>
        {roles.map((role: ClientRole) => {
          return (
            <tr
              key={role.name}
              className={selectedRole === role ? 'active' : ''}
              onClick={() => {
                setSelctedRole(role);
              }}
            >
              <td>{role.name}</td>
              <td>
                <AlignRight>
                  <ActionButton
                    icon={faTrash}
                    role="button"
                    aria-label="delete"
                    onClick={(event: MouseEvent) => {
                      event.stopPropagation();
                      handleDelete(role);
                    }}
                    title="Delete"
                    size="lg"
                    style={{ marginRight: '1rem' }}
                  />
                </AlignRight>
              </td>
            </tr>
          );
        })}
      </InfScroll>
    );
  } else {
    leftContent = (
      <tbody>
        <tr>
          <td colSpan={2}>No roles found.</td>
        </tr>
      </tbody>
    );
  }

  const leftPanel = (
    <>
      <Table variant="mini">
        <thead>
          <tr>
            <th>Role Name</th>
            <th></th>
          </tr>
        </thead>
        {leftContent}
      </Table>
    </>
  );

  const environments = selectedRequest?.environments || [];

  return (
    <>
      <TopMargin />
      <Button
        size="medium"
        variant="primary"
        onClick={() => {
          modalRef.current.open();
        }}
      >
        + Create a New Role
      </Button>
      <TopMargin />
      <RequestTabs onSelect={handleTabSelect} activeKey={environment}>
        {environments.map((env) => (
          <Tab eventKey={env} title={startCase(env)} />
        ))}
      </RequestTabs>
      <br />
      <Grid cols={10}>
        <Grid.Row collapse="1100" gutter={[15, 2]}>
          <Grid.Col span={4}>
            <div>
              <StyledInput
                type="text"
                size="small"
                maxLength="1000"
                placeholder="Search existing roles"
                value={searchKey}
                onChange={handleSearchKeyChange}
                onKeyUp={handleSearchKeyUp}
              />
              <Button type="button" size="small" variant="bcPrimary" onClick={() => fetchRoles(true)}>
                Search
              </Button>
            </div>
          </Grid.Col>
          <Grid.Col span={6}>
            {selectedRole && (
              <RequestTabs onSelect={handleRightPanelTabSelect} activeKey={rightPanelTab}>
                {rightPanelTabs.map((tab) => (
                  <Tab eventKey={tab} title={tab} />
                ))}
              </RequestTabs>
            )}
          </Grid.Col>
        </Grid.Row>
      </Grid>

      <TopMargin />

      {firstRole === 0 && roleLoading ? (
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
        ref={modalRef}
        title="Create New Role"
        icon={null}
        onConfirm={async (contentRef: any) => {
          const hasError = await contentRef.current.submit();
          if (!hasError) {
            await contentRef.current.reset();
            reset();
          } else {
            modalRef.current.updateConfig({ confirmButtonText: 'Try Again' });
            return false;
          }
        }}
        onCancel={(contentRef: any) => {
          contentRef.current.reset();
        }}
        confirmButtonText="Save"
        confirmButtonVariant="primary"
        cancelButtonVariant="secondary"
        style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
      >
        <CreateRoleContent integrationId={selectedRequest.id as number} environments={environments} />
      </GenericModal>
      <GenericModal
        ref={confirmModalRef}
        title="Delete Role"
        icon={faExclamationTriangle}
        onConfirm={async (contentRef: any, roleName: string) => {
          await deleteRole({
            environment,
            integrationId: selectedRequest.id as number,
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
            integrationId: selectedRequest.id as number,
            username: user.username as string,
            roleName: selectedRole.name,
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
    </>
  );
};

export default withTopAlert(ClientRoles);
