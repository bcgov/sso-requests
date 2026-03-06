import React, { useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { startCase } from 'lodash';
import { faTrash, faEdit, faEye, faTrashRestoreAlt } from '@fortawesome/free-solid-svg-icons';
import { Table } from '@bcgov-sso/common-react-components';
import { getRequestAll, deleteRequest, restoreRequest } from 'services/request';
import { PageProps } from 'interfaces/props';
import { Integration, Option } from 'interfaces/Request';
import { ActionButtonContainer, ActionButton, VerticalLine } from 'components/ActionButtons';
import CenteredModal from 'components/CenteredModal';
import { PRIMARY_RED } from 'styles/theme';
import { containsPrefix, formatFilters, isIdpApprover } from 'utils/helpers';
import AdminTabs, { TabKey } from 'page-partials/admin-dashboard/AdminTabs';
import { workflowStatusOptions } from 'metadata/options';
import VerticalLayout from 'page-partials/admin-dashboard/VerticalLayout';
import { deleteServiceAccount, getAllowedTeam, restoreServiceAccount } from '@app/services/team';
import AsyncSelect from 'react-select/async';
import { SingleValue } from 'react-select';
import styled from 'styled-components';
import { SystemUnavailableMessage } from '@app/page-partials/my-dashboard/Messages';
import { TopAlert, withTopAlert } from '@app/layout/TopAlert';
import { throttledIdirSearch } from '@app/utils/users';
import DeleteModal from '@app/components/DeleteModal';
import { appPermissions, hasAppPermission } from '@app/utils/authorize';
import TableNew from '@app/components/TableNew';

const idpOptions = [
  { value: 'idir', label: 'IDIR' },
  { value: 'azureidir', label: 'IDIR - MFA' },
  { value: 'bceid', label: 'BCeID' },
  { value: 'github', label: 'GitHub' },
  { value: 'digitalcredential', label: 'Digital Credential' },
  { value: 'bcservicescard', label: 'BC Services Card' },
  { value: 'social', label: 'Social' },
  { value: 'otp', label: 'One Time Passcode' },
];

const archiveStatusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'deleted', label: 'Deleted' },
];

const environmentOptions = [
  { value: 'dev', label: 'Dev' },
  { value: 'test', label: 'Test' },
  { value: 'prod', label: 'Prod' },
];

const pageLimits = [5, 10, 15, 30, 50, 100];

function ActionsHeader() {
  return <span style={{ marginLeft: '40%' }}>Actions</span>;
}

const RequestRestorationContainer = styled.div`
  .restoration-email-select {
    * {
      visibility: inherit;
    }
  }
  label {
    margin-bottom: 0.5em;
  }
  .error-text {
    margin-top: 0.5em;
    color: red;
  }
`;

/**
 * Component to control restoration. Rules are:
 *  1. If the integration is team owned and the team still exists, restore it.
 *  2. If the integration is team owned and the team does not exist, require an email.
 *  3. If the integration is not team owned, require an email.
 *  4. If the integration for a team service account, and the team is deleted, do not allow restoration.
 */
const RestoreModalContent = ({
  selectedIntegration,
  loadData,
  alert,
  showModal,
  handleCloseModal,
}: {
  selectedIntegration?: Integration;
  loadData: () => Promise<void>;
  alert: TopAlert;
  showModal: boolean;
  handleCloseModal: () => void;
}) => {
  const [teamExists, setTeamExists] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedEmail, setSelectedEmail] = useState<string>('');
  const [error, setError] = useState('');

  const checkTeamExistence = async () => {
    setLoading(true);
    const [teamExists, _err] = await getAllowedTeam(String(selectedIntegration!.teamId));
    setTeamExists(!!teamExists);
    setLoading(false);
  };

  useEffect(() => {
    setError('');
    setSelectedEmail('');
    if (selectedIntegration?.usesTeam) {
      checkTeamExistence();
    }
  }, [selectedIntegration?.id]);

  useEffect(() => {
    setError('');
  }, [selectedEmail]);

  const confirmRestore = async () => {
    const emailRequired = !(selectedIntegration?.usesTeam && teamExists);
    let hasError = false;

    if (emailRequired && !selectedEmail) {
      setError('Please select an email address to restore the integration to.');
      return;
    }

    if (selectedIntegration?.apiServiceAccount) {
      const [_result, error] = await restoreServiceAccount(
        Number(selectedIntegration?.teamId),
        selectedIntegration?.id,
      );
      hasError = !!error;
    } else {
      const [_result, error] = await restoreRequest(selectedIntegration?.id, selectedEmail);
      hasError = !!error;
    }
    if (hasError) {
      alert.show({
        variant: 'danger',
        content: 'Failed to restore integration, please try again.',
      });
    }
    await loadData();
    handleClose();
  };

  const handleClose = () => {
    setSelectedEmail('');
    setError('');
  };

  if (!selectedIntegration) return null;

  let content: string | ReactNode = '';
  if (loading) {
    content = 'Checking if the team exists...';
  } else if (selectedIntegration.usesTeam && teamExists) {
    content = 'You are about to restore this integration.';
  } else if (selectedIntegration.apiServiceAccount && !teamExists) {
    content = 'Cannot restore this team account, team does not exist.';
  } else {
    content = (
      <RequestRestorationContainer>
        <label htmlFor="restoration-email-select">
          Please validate the requestor who is asking to restore (get one more government employee confirming their
          role). Please enter new requestor email address. Note this requestor can then assign to a new team as needed.
        </label>
        <AsyncSelect
          loadOptions={throttledIdirSearch}
          value={{ value: selectedEmail, label: selectedEmail }}
          onChange={(option: SingleValue<{ value: string; label: string }>) => setSelectedEmail(option?.label || '')}
          noOptionsMessage={() => 'Start typing email...'}
          maxMenuHeight={120}
          placeholder={'Enter email address'}
          id="restoration-email-select"
          className="restoration-email-select"
        />
        {error && <p className="error-text">Select an email address</p>}
      </RequestRestorationContainer>
    );
  }

  return (
    <CenteredModal
      id="restore-modal"
      data-testid="modal-restore-integration"
      content={content}
      onConfirm={confirmRestore}
      confirmText="Restore"
      title="Confirm Restoration"
      showConfirm={!(selectedIntegration.apiServiceAccount && !teamExists)}
      openModal={showModal}
      handleClose={handleCloseModal}
    />
  );
};

const multilistFilter = (row: any, columnId: string, filterValue: any) => {
  if (filterValue.length === 0) return true;

  const cell = row.getValue(columnId);

  if (Array.isArray(cell)) {
    return cell.some((v) => {
      if (filterValue.includes(String(v)) || containsPrefix(filterValue, v)) return true;
    });
  }

  return filterValue.includes(String(cell));
};

function AdminDashboard({ session, alert }: PageProps & { alert: TopAlert }) {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [rows, setRows] = useState<Integration[]>([]);
  const [searchKey, setSearchKey] = useState<string>(String(router.query?.id || ''));
  const [count, setCount] = useState<number>(0);
  const [limit, setLimit] = useState<number>(5);
  const [page, setPage] = useState<number>(1);
  const [selectedId, setSelectedId] = useState<number | undefined>(Number(router.query?.id) || undefined);
  const [selectedEnvironments, setSelectedEnvironments] = useState<Option[]>([]);
  const [selectedIdp, setSelectedIdp] = useState<Option[]>([]);
  const [workflowStatus, setWorkflowStatus] = useState<Option[]>([]);
  // const [archiveStatus, setArchiveStatus] = useState<Option[]>([{ value: 'active', label: 'Active' }] as Option[]);
  const [activePanel, setActivePanel] = useState<TabKey>('details');
  const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const selectedRequest = rows.find((v) => v.id === selectedId);
  const [columnFilters, setColumnFilters] = useState<any>([
    {
      value: selectedEnvironments,
      multiselect: true,
      onChange: setSelectedEnvironments,
      options: environmentOptions,
      label: 'Environments',
      key: 'environments',
    },
    {
      value: workflowStatus,
      multiselect: true,
      onChange: setWorkflowStatus,
      options: workflowStatusOptions,
      label: 'Workflow Status',
      key: 'workflowStatus',
    },
    // {
    //   value: archiveStatus,
    //   multiselect: true,
    //   onChange: setArchiveStatus,
    //   options: archiveStatusOptions,
    //   defaultValue: archiveStatus,
    //   label: 'Archive Status',
    //   key: 'archiveStatus',
    // },
  ]);

  const getData = async () => {
    const [devIdps, realms, environments] = formatFilters(selectedIdp, selectedEnvironments);

    return getRequestAll({
      searchField: ['id', 'projectName', 'clientId'],
      searchKey,
      order: [
        ['updatedAt', 'desc'],
        ['status', 'desc'],
      ],
      limit,
      page,
      status: workflowStatus.map((v) => v.value) as string[],
      archiveStatus: [],
      realms,
      environments,
      types: ['gold'],
      devIdps,
    });
  };

  const loadData = async () => {
    setLoading(true);
    const [data, err] = await getData();

    if (err) {
      setHasError(true);
    } else if (data) {
      setRows(data.rows);
      setCount(data.count);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!hasAppPermission(session?.client_roles, appPermissions.VIEW_ADMIN_DASHBOARD)) {
      router.push('/my-dashboard');
    } else {
      if (
        hasAppPermission(session?.client_roles, appPermissions.ADMIN_DASHBOARD_VIEW_IDPS_FILTER) &&
        !columnFilters.find((v: any) => v.label === 'IDPs')
      ) {
        setColumnFilters([
          ...columnFilters,
          {
            value: selectedIdp,
            multiselect: true,
            onChange: setSelectedIdp,
            options: idpOptions,
            label: 'IDPs',
            key: 'idps',
          },
        ]);
      }
      setSelectedId(undefined);
      loadData();
    }
  }, [searchKey, limit, page, workflowStatus, selectedIdp, selectedEnvironments]);

  if (hasError) {
    return <SystemUnavailableMessage />;
  }

  const canEdit = (request: Integration) =>
    !request.archived && ['applied'].includes(request?.status || '') && !request.apiServiceAccount;

  const canDelete = (request: Integration) => {
    if (request.archived === true) return false;
    else if (['pr', 'planned', 'submitted'].includes(request?.status || '')) return false;
    else return true;
  };

  const canRestore = (request: Integration) => {
    if (request.archived === false) return false;
    else if (!['applied'].includes(request?.status || '')) return false;
    else return true;
  };

  const handleEdit = async (request: Integration) => {
    if (!request.id || !canEdit(request)) return;
    await router.push(`/request/${request.id}?status=${request.status}`);
  };

  const handleDelete = async (request: Integration) => {
    if (!request.id || !canDelete(request)) return;
    setSelectedId(request.id);
    setShowDeleteModal(true);
  };

  const handleRestore = async (request: Integration) => {
    if (!request.id || !canRestore(request)) return;
    setSelectedId(request.id);
    setShowRestoreModal(false);
    process.nextTick(() => {
      setShowRestoreModal(true);
    });
  };

  const confirmDelete = async () => {
    if (!canDelete) return;
    const [_result, error] = selectedRequest?.apiServiceAccount
      ? await deleteServiceAccount(selectedRequest?.teamId as number, selectedId)
      : await deleteRequest(selectedId);
    if (error) {
      alert.show({
        variant: 'danger',
        content: 'Failed to delete the integration, please try again.',
      });
    }
    await loadData();
  };

  const activateRow = (row: any) => {
    setSelectedId(row.id);
    setActivePanel('details');
  };

  return (
    <>
      <VerticalLayout
        leftPanel={() => (
          <TableNew
            globalSearchPlaceholder="Project ID, Project Name or Client ID"
            columns={
              [
                {
                  accessorKey: 'id',
                  header: 'Request ID',
                  enableSorting: false,
                  enableColumnFilter: false,
                },

                {
                  accessorKey: 'clientId',
                  header: 'Client ID',
                  enableSorting: false,
                  enableColumnFilter: false,
                },
                {
                  accessorKey: 'projectName',
                  header: 'Project Name',
                  enableSorting: false,
                  enableColumnFilter: false,
                },
                {
                  accessorKey: 'idps',
                  header: 'IDPs',
                  enableSorting: false,
                  enableColumnFilter: hasAppPermission(
                    session?.client_roles,
                    appPermissions.ADMIN_DASHBOARD_VIEW_IDPS_FILTER,
                  ),
                  meta: {
                    filterLabel: 'IDPs',
                    filterOptions: idpOptions,
                    multiSelect: true,
                  },
                  filterFn: multilistFilter,
                },
                {
                  accessorKey: 'status',
                  header: 'Request Status',
                  enableSorting: false,
                  meta: {
                    filterLabel: 'Workflow Status',
                    multiSelect: true,
                    filterOptions: workflowStatusOptions,
                  },
                  filterFn: multilistFilter,
                },
                {
                  accessorKey: 'environments',
                  header: 'Environments',
                  enableSorting: false,
                  meta: {
                    filterLabel: 'Environments',
                    multiSelect: true,
                    filterOptions: environmentOptions,
                  },
                  filterFn: multilistFilter,
                },
                {
                  accessorKey: 'archived',
                  header: 'File Status',
                  enableSorting: false,
                  meta: {
                    filterLabel: 'Archive Status',
                    filterOptions: archiveStatusOptions,
                    defaultValue: { value: 'active', label: 'Active' },
                  },
                  filterFunction: multilistFilter,
                },
                {
                  accessorKey: 'apiServiceAccount',
                  header: 'API Service Account',
                  enableSorting: false,
                  enableColumnFilter: false,
                },
                {
                  accessorKey: 'actions',
                  header: () => <div style={{ display: 'flex', justifyContent: 'center' }}>Actions</div>,
                  enableSorting: false,
                  enableColumnFilter: false,
                  cell: (props: any) => {
                    const request = {
                      id: props.row.getValue('id'),
                      archived: props.row.getValue('archived'),
                      status: props.row.getValue('status'),
                      apiServiceAccount: props.row.getValue('apiServiceAccount'),
                    };
                    return (
                      <ActionButtonContainer>
                        {hasAppPermission(
                          session?.client_roles,
                          appPermissions.ADMIN_DASHBOARD_VIEW_REQUEST_EVENTS,
                        ) && (
                          <>
                            <ActionButton
                              icon={faEye}
                              role="button"
                              aria-label="events"
                              onClick={(event: any) => {
                                event.stopPropagation();
                                setSelectedId(props.row.getValue('id'));
                                setActivePanel('events');
                              }}
                              title="Events"
                            />
                          </>
                        )}
                        {hasAppPermission(session?.client_roles, appPermissions.ADMIN_DASHBOARD_UPDATE_REQUEST) && (
                          <>
                            <VerticalLine />
                            <ActionButton
                              disabled={!canEdit(request)}
                              icon={faEdit}
                              role="button"
                              aria-label="edit"
                              onClick={() => handleEdit(request)}
                              title="Edit"
                            />
                          </>
                        )}

                        {hasAppPermission(session?.client_roles, appPermissions.ADMIN_DASHBOARD_DELETE_REQUEST) && (
                          <>
                            <VerticalLine />
                            <ActionButton
                              icon={faTrash}
                              role="button"
                              aria-label="delete"
                              onClick={() => handleDelete(request)}
                              disabled={!canDelete(request)}
                              activeColor={PRIMARY_RED}
                              title="Delete from Keycloak"
                            />
                          </>
                        )}

                        {hasAppPermission(session?.client_roles, appPermissions.ADMIN_DASHBOARD_RESTORE_REQUEST) && (
                          <>
                            <VerticalLine />
                            <ActionButton
                              icon={faTrashRestoreAlt}
                              role="button"
                              aria-label="restore"
                              onClick={() => handleRestore(request)}
                              disabled={!canRestore(request)}
                              activeColor={PRIMARY_RED}
                              title="Restore at Keycloak"
                            />
                          </>
                        )}
                      </ActionButtonContainer>
                    );
                  },
                },
              ] as any
            }
            data={rows.map((row) => {
              return {
                id: row.id,
                projectName: row.projectName,
                status: row.status,
                archived: row.archived ? 'deleted' : 'active',
                environments: row.environments,
                clientId: row.clientId,
                apiServiceAccount: row.apiServiceAccount,
                idps: row.devIdps,
              };
            })}
            hiddenColumns={['environments', 'idps', 'apiServiceAccount']}
            onRowSelect={activateRow}
          ></TableNew>
        )}
        rightPanel={() =>
          selectedRequest && (
            <AdminTabs
              currentUser={session}
              integration={selectedRequest}
              defaultTabKey={'details'}
              setActiveKey={setActivePanel}
              activeKey={activePanel}
              setRows={loadData}
            ></AdminTabs>
          )
        }
      />
      <DeleteModal
        id="delete-modal"
        projectName={selectedRequest?.projectName}
        onConfirm={confirmDelete}
        title="Confirm Deletion"
        content="You are about to delete this integration request. This action cannot be undone."
        openModal={showDeleteModal}
        handleCloseModal={() => setShowDeleteModal(false)}
      />
      <RestoreModalContent
        selectedIntegration={selectedRequest}
        loadData={loadData}
        alert={alert}
        showModal={showRestoreModal}
        handleCloseModal={() => setShowRestoreModal(false)}
      />
    </>
  );
}

export default withTopAlert(AdminDashboard);
