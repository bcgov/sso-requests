import React, { MouseEvent, useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import Tab from 'react-bootstrap/Tab';
import { Button } from '@bcgov-sso/common-react-components';
import { faTrash, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { noop, startCase } from 'lodash';
import InfiniteScroll from 'react-infinite-scroller';
import Input from '@button-inc/bcgov-theme/Input';
import Grid from '@button-inc/bcgov-theme/Grid';
import Loader from 'react-loader-spinner';
import { Request, Option } from 'interfaces/Request';
import { withTopAlert, TopAlert } from 'layout/TopAlert';
import { RequestTabs } from 'components/RequestTabs';
import GenericModal, { ModalRef, emptyRef } from 'components/GenericModal';
import { ActionButton } from 'components/ActionButtons';
import Table from 'html-components/Table';
import CreateRoleContent from './roles/CreateRoleContent';
import { searchKeycloakUsers, listClientRoles, deleteRole, listRoleUsers, KeycloakUser } from 'services/keycloak';

const StyledInput = styled(Input)`
  display: inline-block;
  input {
    min-width: 200px;
    height: 40px;
  }
`;

const AlignCenter = styled.div`
  text-align: center;
`;

const AlignRight = styled.div`
  text-align: right;
`;

const TopMargin = styled.div`
  height: var(--field-top-spacing);
`;

interface Props {
  selectedRequest: Request;
  alert: TopAlert;
}

const LoaderContainer = () => (
  <AlignCenter>
    <TopMargin />
    <Loader type="Grid" color="#000" height={45} width={45} visible={true} />
  </AlignCenter>
);

const ClientRoles = ({ selectedRequest, alert }: Props) => {
  const modalRef = useRef<ModalRef>(emptyRef);
  const confirmModalRef = useRef<ModalRef>(emptyRef);
  const [tab, setTab] = useState('dev');
  const [roleLoading, setRoleLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [firstRole, setFirstRole] = useState(0);
  const [searchKey, setSearchKey] = useState('');
  const [maxRole, setMaxRole] = useState(20);
  const [hasMoreRole, setHasMoreRole] = useState(true);
  const [firstUser, setFirstUser] = useState(0);
  const [maxUser, setMaxUser] = useState(20);
  const [hasMoreUser, setHasMoreUser] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [users, setUsers] = useState<KeycloakUser[]>([]);
  const [selectedRole, setSelctedRole] = useState<string>('');

  const reset = () => {
    fetchRoles(true);
    setUsers([]);
    setRoles([]);
    setSelctedRole('');
  };

  useEffect(() => {
    setTab('dev');
    reset();
  }, [selectedRequest.id]);

  useEffect(() => {
    reset();
  }, [tab]);

  useEffect(() => {
    fetchUsers(true, selectedRole);
  }, [selectedRole]);

  const fetchRoles = async (loadFirst: boolean) => {
    if (roleLoading) return;

    let _first = 0;
    let _roles: string[] = [];

    setRoleLoading(true);
    if (loadFirst) {
      setFirstRole(_first);
      setSelctedRole('');
    } else {
      _first = firstRole;
      _roles = roles;
    }

    const [data, err] = await listClientRoles({
      environment: tab,
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
      environment: tab,
      integrationId: selectedRequest.id as number,
      roleName,
      first: _first,
      max: maxUser,
    });

    const _data = data || [];

    setHasMoreUser(_data.length === maxUser);
    setUsers(_users.concat(_data));
    setFirstUser(_first + maxUser);
    setSelctedRole(roleName);
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

  const handleDelete = async (roleName: string) => {
    confirmModalRef.current.open(roleName);
  };

  const handleTabSelect = (key: string) => {
    setTab(key);
  };

  let rightPanel = null;
  if (firstUser === 0 && userLoading) {
    rightPanel = <LoaderContainer />;
  } else if (selectedRole) {
    rightPanel = (
      <Table variant="mini">
        <thead>
          <tr>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Email</th>
            <th>Username</th>
          </tr>
        </thead>
        {users.length > 0 ? (
          <InfiniteScroll
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
                </tr>
              );
            })}
          </InfiniteScroll>
        ) : (
          <tbody>
            <tr>
              <td colSpan={4}>No users found.</td>
            </tr>
          </tbody>
        )}
      </Table>
    );
  }

  let leftContent = <tbody />;
  if (roles.length > 0) {
    leftContent = (
      <InfiniteScroll
        element="tbody"
        loadMore={() => fetchRoles(false)}
        hasMore={hasMoreRole}
        loader={<LoaderContainer />}
      >
        {roles.map((role: string) => {
          return (
            <tr
              key={role}
              className={selectedRole === role ? 'active' : ''}
              onClick={() => {
                setSelctedRole(role);
              }}
            >
              <td>{role}</td>
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
      </InfiniteScroll>
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
    <Table variant="mini">
      <thead>
        <tr>
          <th>Role Name</th>
          <th></th>
        </tr>
      </thead>
      {leftContent}
    </Table>
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
      <RequestTabs onSelect={handleTabSelect} activeKey={tab}>
        {environments.map((env) => (
          <Tab eventKey={env} title={startCase(env)} />
        ))}
      </RequestTabs>

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
            modalRef.current.close();
            reset();
          } else {
            modalRef.current.updateConfig({ confirmButtonText: 'Try Again' });
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
            environment: tab,
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
    </>
  );
};

export default withTopAlert(ClientRoles);
