import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import Select, { MultiValue, ActionMeta } from 'react-select';
import { map, omitBy, startCase, isEmpty } from 'lodash';
import Button from '@button-inc/bcgov-theme/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationCircle, faEye, faDownload, faLock } from '@fortawesome/free-solid-svg-icons';
import Grid from '@button-inc/bcgov-theme/Grid';
import Loader from 'react-loader-spinner';
import { Request, Option } from 'interfaces/Request';
import { withTopAlert, TopAlert } from 'layout/TopAlert';
import Table from 'components/Table';
import { ActionButton, ActionButtonContainer } from 'components/ActionButtons';
import GenericModal, { ModalRef, emptyRef } from 'components/GenericModal';
import IdimLookup from 'page-partials/my-dashboard/users-roles/IdimLookup';
import { searchKeycloakUsers, listClientRoles, listUserRoles, manageUserRole, KeycloakUser } from 'services/keycloak';

const Label = styled.label`
  font-weight: bold;
  margin-bottom: 2px;
`;

const ReadonlyContainer = styled.div`
  display: flex;
  & > div:first-child {
    margin-right: 20px;
  }
`;

const Readonly = styled.div<{ width?: string }>`
  background-color: #f1f1f1;
  margin: 2px 0 2px 0;
  padding: 4px 6px;
  ${(props) => (props.width ? `width: ${props.width};` : `width: 300px;`)}
`;

const ReadonlySubHeader = styled.div<{ width?: string }>`
  font-size: 0.9rem;
  ${(props) => (props.width ? `width: ${props.width};` : `width: 300px;`)}
`;

const ReadonlyItem = ({ children, width }: { children: React.ReactNode; width?: string }) => {
  return (
    <Readonly width={width}>
      <Grid cols={6}>
        <Grid.Row gutter={[]}>
          <Grid.Col span={5}>{children}</Grid.Col>
          <Grid.Col span={1} style={{ textAlign: 'right' }}>
            <FontAwesomeIcon icon={faLock} color="#9F9F9F" size="lg" />
          </Grid.Col>
        </Grid.Row>
      </Grid>
    </Readonly>
  );
};

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

const FlexItem = styled.div`
  padding-top: 10px;
  padding-bottom: 10px;
`;

const Loading = () => (
  <AlignCenter>
    <TopMargin />
    <Loader type="Grid" color="#000" height={45} width={45} visible={true} />
  </AlignCenter>
);

type IDPS = 'idir' | 'azureidir' | 'bceidbasic' | 'bceidbusiness' | 'bceidboth';

const idpMap = {
  idir: 'IDIR',
  azureidir: 'Azure IDIR',
  bceidbasic: 'BCeID Basic',
  bceidbusiness: 'BCeID Business',
  bceidboth: 'BCeID Both',
};

const propertyOptions = [
  { value: 'lastName', label: 'Last Name', allowed: ['idir', 'azureidir'] },
  { value: 'firstName', label: 'First Name', allowed: ['idir', 'azureidir'] },
  { value: 'email', label: 'Email', allowed: ['idir', 'azureidir'] },
  { value: 'guid', label: 'IDP GUID', allowed: ['idir', 'azureidir', 'bceidbasic', 'bceidbusiness', 'bceidboth'] },
];

interface Props {
  selectedRequest: Request;
  alert: TopAlert;
}

const UserRoles = ({ selectedRequest, alert }: Props) => {
  const infoModalRef = useRef<ModalRef>(emptyRef);
  const idimSearchModalRef = useRef<ModalRef>(emptyRef);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingRight, setLoadingRight] = useState(false);
  const [rows, setRows] = useState<KeycloakUser[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('dev');
  const [selectedIdp, setSelectedIdp] = useState<string>('');
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [searchKey, setSearchKey] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const getRoles = async () => {
    if (!selectedRequest) return;

    await setLoading(true);

    const [data, err] = await listClientRoles({
      environment: selectedEnvironment,
      integrationId: selectedRequest.id as number,
      first: 0,
      max: 1000,
    });

    const roles = data || [];

    setRoles(roles);
    setLoading(false);
  };

  const reset = () => {
    setRows([]);
    setRoles([]);
    setUserRoles([]);
    setSelectedId(undefined);
    setSearched(false);
  };

  const resetSearchOptions = () => {
    setSearchKey('');
    setSelectedEnvironment('dev');
    if (selectedRequest.devIdps) {
      const idp = selectedRequest.devIdps.length > 0 ? selectedRequest.devIdps[0] : '';
      setSelectedIdp(idp);
      const firstAllowedProperty = propertyOptions.find((v) => v.allowed.includes(idp));
      setSelectedProperty(firstAllowedProperty?.value || '');
    }
  };

  useEffect(() => {
    reset();
    resetSearchOptions();
  }, [selectedRequest.id]);

  useEffect(() => {
    reset();
    getRoles();
    if (selectedRequest.devIdps) setSelectedIdp(selectedRequest.devIdps.length > 0 ? selectedRequest.devIdps[0] : '');
  }, [selectedEnvironment]);

  useEffect(() => {
    reset();
    const currentPropertyOption = propertyOptions.find((v) => v.value === selectedProperty);
    const isCurrentPropertyAllowed = currentPropertyOption?.allowed.includes(selectedIdp);
    if (!isCurrentPropertyAllowed) {
      const firstAllowedProperty = propertyOptions.find((v) => v.allowed.includes(selectedIdp));
      setSelectedProperty(firstAllowedProperty?.value || '');
    }
  }, [selectedIdp]);

  const handleSearch = async (searchKey: string, property = selectedProperty) => {
    if (searchKey.length < 2) return;

    setLoading(true);
    setSearchKey(searchKey);
    setSelectedProperty(property);
    setRows([]);
    setUserRoles([]);
    setSelectedId(undefined);
    setSearched(true);

    const [data, err] = await searchKeycloakUsers({
      environment: selectedEnvironment,
      idp: selectedIdp,
      property,
      searchKey,
    });

    if (data) {
      setRows(data);
      if (data.length === 1) {
        setSelectedId(data[0].username);
      }
    }
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
    await setLoadingRight(true);
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
    rightPanel = <Loading />;
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

  const showIdirLookupOption = selectedIdp === 'idir';

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
          <td>
            <ActionButtonContainer>
              <ActionButton
                icon={faEye}
                role="button"
                aria-label="view"
                onClick={(event) => {
                  event.stopPropagation();

                  infoModalRef.current.open({
                    guid: row.username.split('@')[0],
                    attributes: {
                      firstName: row.firstName,
                      lastName: row.lastName,
                      email: row.email,
                      ...row.attributes,
                    },
                  });
                }}
                title="View"
                size="lg"
              />
            </ActionButtonContainer>
          </td>
        </tr>
      );
    });
  } else {
    content = (
      <tr>
        <td colSpan={10}>
          <FlexBox>
            <FlexItem>
              <FontAwesomeIcon icon={faExclamationCircle} color="#D44331" title="Edit" size="lg" />
            </FlexItem>
            {showIdirLookupOption ? (
              <FlexItem>
                The user you searched for does not exist. Please try again, by entering the full search criteria or try
                using our IDIM Web Service Lookup tool.
              </FlexItem>
            ) : (
              <FlexItem>
                The user you searched for does not exist. Please try again, by entering the full search criteria.
              </FlexItem>
            )}
          </FlexBox>
        </td>
      </tr>
    );
  }

  let idirLookup = null;

  if (searched && showIdirLookupOption) {
    idirLookup = (
      <>
        {rows.length > 0 && (
          <div className="fst-italic small mb-1">
            If you did not find the user you were looking for, you can try searching for the user in our IDIM Web
            Service Lookup tool. This tool uses a webservice to find IDIR users. so you will need to import the user
            that is found.
          </div>
        )}
        <Button
          type="button"
          size="small"
          onClick={() =>
            idimSearchModalRef.current.open({
              key: new Date().getTime().toString(),
              idp: 'idir',
              property: selectedProperty,
              search: searchKey,
            })
          }
        >
          Search in IDIM Web Service Lookup
        </Button>
      </>
    );
  }

  const environments = selectedRequest?.environments || [];
  const idps = (selectedRequest?.devIdps || []) as IDPS[];

  return (
    <>
      <TopMargin />
      <Grid cols={10}>
        <Grid.Row collapse="1100" gutter={[15, 2]}>
          <Grid.Col span={6}>
            <Label>1. Search for a user based on the selection criteria below</Label>
            <Table
              key={searchKey}
              variant="mini"
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
                  options: idps.map((idp) => ({ value: idp, label: idpMap[idp] })),
                },
                {
                  value: selectedProperty,
                  multiselect: false,
                  onChange: setSelectedProperty,
                  options: propertyOptions.filter((v) => v.allowed.includes(selectedIdp)),
                },
              ]}
              headers={[
                { name: 'First name', style: { float: 'left', width: '20%' } },
                { name: 'Last Name', style: { float: 'left', width: '40%' } },
                { name: 'Email', style: { float: 'left' } },
              ]}
              searchKey={searchKey}
              searchPlaceholder="Enter search criteria"
              onSearch={handleSearch}
              onEnter={handleSearch}
              loading={loading}
              totalColSpan={20}
              searchColSpan={8}
              filterColSpan={12}
            >
              {content}
            </Table>
            {idirLookup}
          </Grid.Col>
          <Grid.Col span={4}>{rightPanel}</Grid.Col>
        </Grid.Row>
      </Grid>
      <GenericModal
        ref={infoModalRef}
        id="additiona-user-info"
        title="Additional User Info"
        icon={null}
        cancelButtonText="Close"
        cancelButtonVariant="primary"
        showConfirmButton={false}
        buttonAlign="right"
        style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
      >
        {(context: { guid: string; attributes: any }) => {
          if (!context) return <></>;

          const attributes = omitBy(context.attributes, isEmpty);

          return (
            <div>
              <Label>GUID</Label>
              <ReadonlyItem width="400px">{context.guid}</ReadonlyItem>
              <br />
              <Label>Attributes</Label>
              <ReadonlyContainer>
                <ReadonlySubHeader width="200px">Key</ReadonlySubHeader>
                <ReadonlySubHeader width="700px">Value</ReadonlySubHeader>
              </ReadonlyContainer>
              {map(attributes, (val, key) => (
                <ReadonlyContainer>
                  <ReadonlyItem width="200px">{startCase(key)}</ReadonlyItem>
                  <ReadonlyItem width="700px">{val}</ReadonlyItem>
                </ReadonlyContainer>
              ))}
            </div>
          );
        }}
      </GenericModal>
      <GenericModal
        ref={idimSearchModalRef}
        id="idim-webservice-lookup"
        title="IDIM Web Service Lookup"
        icon={null}
        onClose={(contentRef, context, closeContext) => {
          handleSearch(closeContext.guid, 'guid');
        }}
        cancelButtonText="Close"
        cancelButtonVariant="primary"
        showConfirmButton={false}
        buttonAlign="right"
        style={{ minWidth: '800px', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
      >
        {(context: { key: string; idp: string; property: string; search: string }) => {
          if (!context) return <></>;

          return (
            <IdimLookup
              key={context.key}
              idp={context.idp}
              property={context.property}
              search={context.search}
              infoModalRef={infoModalRef}
              parentModalRef={idimSearchModalRef}
            />
          );
        }}
      </GenericModal>
    </>
  );
};

export default withTopAlert(UserRoles);
