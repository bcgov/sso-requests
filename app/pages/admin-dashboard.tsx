import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import padStart from 'lodash.padstart';
import startCase from 'lodash.startcase';
import { faTrash, faEdit, faEye } from '@fortawesome/free-solid-svg-icons';
import Grid from '@button-inc/bcgov-theme/Grid';
import { MediaRule } from 'components/ResponsiveContainer';
import Table from 'components/TableNew';
import { getRequestAll, deleteRequest } from 'services/request';
import { PageProps } from 'interfaces/props';
import { Integration, Option } from 'interfaces/Request';
import { ActionButtonContainer, ActionButton, VerticalLine } from 'components/ActionButtons';
import CenteredModal from 'components/CenteredModal';
import { PRIMARY_RED } from 'styles/theme';
import { formatFilters, hasAnyPendingStatus } from 'utils/helpers';
import AdminTabs, { TabKey } from 'page-partials/admin-dashboard/AdminTabs';
import { workflowStatusOptions } from 'metadata/options';
import VerticalLayout from 'page-partials/admin-dashboard/VerticalLayout';

const RightAlign = styled.div`
  text-align: center;
`;

const idpOptions = [
  { value: 'idir', label: 'IDIR' },
  { value: 'bceid', label: 'BCeID' },
  { value: 'github', label: 'GitHub' },
];

const archiveStatusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Deleted' },
];

const environmentOptions = [
  { value: 'dev', label: 'Dev' },
  { value: 'test', label: 'Test' },
  { value: 'prod', label: 'Prod' },
];

const typeOptions = [
  { value: 'silver', label: 'Silver' },
  { value: 'gold', label: 'Gold' },
];

// const pageLimits = [
//   { value: 5, text: '5 per page' },
//   { value: 10, text: '10 per page' },
//   { value: 15, text: '15 per page' },
//   { value: 30, text: '30 per page' },
//   { value: 50, text: '50 per page' },
//   { value: 100, text: '100 per page' },
// ];

const pageLimits = [5, 10, 15, 30, 50, 100];

const mediaRules: MediaRule[] = [
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

export default function AdminDashboard({ session }: PageProps) {
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
  const [archiveStatus, setArchiveStatus] = useState<Option[]>([]);
  const [types, setTypes] = useState<Option[]>([]);
  const [activePanel, setActivePanel] = useState<TabKey>('details');
  const selectedRequest = rows.find((v) => v.id === selectedId);

  const getData = async () => {
    const [devIdps, realms, environments] = formatFilters(selectedIdp, selectedEnvironments);
    return getRequestAll({
      searchField: ['id', 'projectName'],
      searchKey,
      order: [
        ['updatedAt', 'desc'],
        ['status', 'desc'],
      ],
      limit,
      page,
      status: workflowStatus.map((v) => v.value) as string[],
      archiveStatus: archiveStatus.map((v) => v.value) as string[],
      realms,
      environments,
      types: types.map((v) => v.value) as string[],
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
    setSelectedId(undefined);
    loadData();
  }, [searchKey, limit, page, workflowStatus, archiveStatus, selectedIdp, selectedEnvironments, types]);

  useEffect(() => {
    let interval: any;
    if (hasAnyPendingStatus(rows)) {
      interval = setTimeout(async () => {
        const [data, err] = await getData();

        if (err) {
          clearInterval(interval);
        } else if (data) {
          setRows(data.rows);
          setCount(data.count);
        }
      }, 1000 * 5);
    }

    return () => {
      interval && clearInterval(interval);
    };
  }, [rows]);

  if (hasError) {
    return null;
  }

  const canEdit = (request: Integration) => ['applied'].includes(request?.status || '');
  const canDelete = (request: Integration) => !['pr', 'planned', 'submitted'].includes(request?.status || '');

  const handleEdit = async (request: Integration) => {
    if (!request.id || !canEdit(request)) return;
    await router.push(`/request/${request.id}?status=${request.status}`);
  };

  const handleDelete = async (request: Integration) => {
    if (!request.id || !canDelete(request)) return;
    setSelectedId(request.id);
    window.location.hash = 'delete-modal';
  };

  const confirmDelete = async () => {
    if (!canDelete) return;
    await deleteRequest(selectedId);
    await getData();
    window.location.hash = '#';
  };

  const activateRow = (request: any) => {
    setSelectedId(request['cells'][0].value);
    setActivePanel('details');
  };

  return (
    <>
      <VerticalLayout
        leftPanel={() => (
          // <Table
          //   filters={[
          //     {
          //       value: selectedEnvironments,
          //       multiselect: true,
          //       onChange: setSelectedEnvironments,
          //       options: environmentOptions,
          //       label: 'Environments',
          //     },
          //     {
          //       value: selectedIdp,
          //       multiselect: true,
          //       onChange: setSelectedIdp,
          //       options: idpOptions,
          //       label: 'IDPs',
          //     },
          //     {
          //       value: workflowStatus,
          //       multiselect: true,
          //       onChange: setWorkflowStatus,
          //       options: workflowStatusOptions,
          //       label: 'Workflow Status',
          //     },
          //     {
          //       value: archiveStatus,
          //       multiselect: true,
          //       onChange: setArchiveStatus,
          //       options: archiveStatusOptions,
          //       label: 'Archive Status',
          //     },
          //     {
          //       value: types,
          //       multiselect: true,
          //       onChange: setTypes,
          //       options: typeOptions,
          //       label: 'Service Type',
          //     },
          //   ]}
          //   headers={[
          //     { label: 'Request ID' },
          //     { label: 'Project Name' },
          //     { label: 'Request Status' },
          //     { label: 'File Status' },
          //     { label: 'Service Type' },
          //     { label: 'Actions', style: { textAlign: 'center', minWidth: '140px' } },
          //   ]}
          //   pagination={true}
          //   pageLimits={pageLimits}
          //   searchKey={searchKey}
          //   searchPlaceholder="Project ID or Name"
          //   limit={limit}
          //   page={page}
          //   rowCount={count}
          //   onSearch={(val) => {
          //     setSearchKey(val);
          //     setPage(1);
          //   }}
          //   onEnter={(val) => {
          //     setSearchKey(val);
          //     setPage(1);
          //   }}
          //   onLimit={(val) => {
          //     setPage(1);
          //     setLimit(val);
          //   }}
          //   onPrev={setPage}
          //   onNext={setPage}
          //   loading={loading}
          //   totalColSpan={15}
          //   searchColSpan={5}
          //   headerAlign={'bottom'}
          //   headerGutter={[5, 0]}
          // >
          //   {rows.length > 0 ? (
          //     rows.map((row: Integration) => {
          //       return (
          //         <tr
          //           key={row.id}
          //           className={selectedId === row.id ? 'active' : ''}
          //           onClick={() => {
          //             setSelectedId(row.id);
          //             setActivePanel('details');
          //           }}
          //         >
          //           <td>{padStart(String(row.id), 8, '0')}</td>
          //           <td>{row.projectName}</td>
          //           <td>{startCase(row.status)}</td>
          //           <td>{row.archived ? 'Deleted' : 'Active'}</td>
          //           <td>{row.serviceType === 'gold' ? 'Gold' : 'Silver'}</td>
          //           <td>
          //             <ActionButtonContainer>
          //               <ActionButton
          //                 icon={faEye}
          //                 role="button"
          //                 aria-label="events"
          //                 onClick={(event: any) => {
          //                   event.stopPropagation();
          //                   setSelectedId(row.id);
          //                   setActivePanel('events');
          //                 }}
          //                 title="Events"
          //               />
          //               <VerticalLine />
          //               <ActionButton
          //                 disabled={!canEdit(row)}
          //                 icon={faEdit}
          //                 role="button"
          //                 aria-label="edit"
          //                 onClick={() => handleEdit(row)}
          //                 title="Edit"
          //               />
          //               <VerticalLine />
          //               <ActionButton
          //                 icon={faTrash}
          //                 role="button"
          //                 aria-label="delete"
          //                 onClick={() => handleDelete(row)}
          //                 disabled={!canDelete(row)}
          //                 activeColor={PRIMARY_RED}
          //                 title="Delete"
          //               />
          //             </ActionButtonContainer>
          //           </td>
          //         </tr>
          //       );
          //     })
          //   ) : (
          //     <tr>
          //       <td colSpan={10}>
          //         <RightAlign>No clients found.</RightAlign>
          //       </td>
          //     </tr>
          //   )}
          // </Table>
          <Table
            searchPlaceholder="Project ID or Name"
            headers={[
              {
                accessor: 'id',
                Header: 'Request ID',
              },
              {
                accessor: 'projectName',
                Header: 'Project Name',
              },
              {
                accessor: 'status',
                Header: 'Request Status',
              },
              {
                accessor: 'archived',
                Header: 'File Status',
              },
              {
                accessor: 'serviceType',
                Header: 'Service Type',
              },
              {
                accessor: 'actions',
                Header: () => <span style={{ marginLeft: '40%' }}>Actions</span>,
                disableSortBy: true,
              },
            ]}
            data={rows.map((row) => {
              return {
                id: row.id,
                projectName: row.projectName,
                status: startCase(row.status),
                archived: row.archived ? 'Deleted' : 'Active',
                serviceType: row.serviceType === 'gold' ? 'Gold' : 'Silver',
                environments: row.environments,
                actions: (
                  <ActionButtonContainer>
                    <ActionButton
                      icon={faEye}
                      role="button"
                      aria-label="events"
                      onClick={(event: any) => {
                        event.stopPropagation();
                        setSelectedId(row.id);
                        setActivePanel('events');
                      }}
                      title="Events"
                    />
                    <VerticalLine />
                    <ActionButton
                      disabled={!canEdit(row)}
                      icon={faEdit}
                      role="button"
                      aria-label="edit"
                      onClick={() => handleEdit(row)}
                      title="Edit"
                    />
                    <VerticalLine />
                    <ActionButton
                      icon={faTrash}
                      role="button"
                      aria-label="delete"
                      onClick={() => handleDelete(row)}
                      disabled={!canDelete(row)}
                      activeColor={PRIMARY_RED}
                      title="Delete"
                    />
                  </ActionButtonContainer>
                ),
              };
            })}
            activateRow={activateRow}
            colfilters={[
              {
                value: selectedEnvironments,
                multiselect: true,
                onChange: setSelectedEnvironments,
                options: environmentOptions,
                label: 'Environments',
              },
              {
                value: selectedIdp,
                multiselect: true,
                onChange: setSelectedIdp,
                options: idpOptions,
                label: 'IDPs',
              },
              {
                value: workflowStatus,
                multiselect: true,
                onChange: setWorkflowStatus,
                options: workflowStatusOptions,
                label: 'Workflow Status',
              },
              {
                value: archiveStatus,
                multiselect: true,
                onChange: setArchiveStatus,
                options: archiveStatusOptions,
                label: 'Archive Status',
              },
              {
                value: types,
                multiselect: true,
                onChange: setTypes,
                options: typeOptions,
                label: 'Service Type',
              },
            ]}
            showFilters={true}
            loading={loading}
            totalColSpan={15}
            searchColSpan={5}
            headerAlign={'bottom'}
            headerGutter={[5, 0]}
            onPage={setPage}
            rowCount={count}
            searchKey={searchKey}
            onSearch={(val) => {
              setSearchKey(val);
            }}
            onEnter={(val) => {
              setSearchKey(val);
            }}
            pageLimits={pageLimits}
            limit={limit}
            onLimit={(val) => {
              setPage(1);
              setLimit(val);
            }}
          ></Table>
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
      <CenteredModal
        id="delete-modal"
        content="You are about to delete this integration request. This action cannot be undone."
        onConfirm={confirmDelete}
        confirmText="Delete"
        title="Confirm Deletion"
      />
    </>
  );
}
