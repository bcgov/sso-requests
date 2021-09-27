import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { padStart, startCase } from 'lodash';
import Loader from 'react-loader-spinner';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faTrash, faEdit, faEye } from '@fortawesome/free-solid-svg-icons';
import Grid from '@button-inc/bcgov-theme/Grid';
import ResponsiveContainer, { MediaRule } from 'components/ResponsiveContainer';
import Table from 'components/Table';
import { getRequestAll, deleteRequest } from 'services/request';
import { PageProps } from 'interfaces/props';
import { Request } from 'interfaces/Request';
import { Container, ActionButton, VerticalLine } from 'components/ActionButtons';
import CenteredModal from 'components/CenteredModal';
import Modal from '@button-inc/bcgov-theme/Modal';
import BcButton from '@button-inc/bcgov-theme/Button';
import CancelButton from 'components/CancelButton';
import AdminEventPanel from 'components/AdminEventPanel';
import AdminRequestPanel from 'components/AdminRequestPanel';
import { PRIMARY_RED } from 'styles/theme';

type Status =
  | 'all'
  | 'draft'
  | 'submitted'
  | 'pr'
  | 'prFailed'
  | 'planned'
  | 'planFailed'
  | 'approved'
  | 'applied'
  | 'applyFailed';

type ArchiveStatus = 'all' | 'active' | 'archived';

const statusFilters = [
  { value: 'all', text: 'All' },
  { value: 'draft', text: 'Draft' },
  { value: 'submitted', text: 'Submitted' },
  { value: 'pr', text: 'PR' },
  { value: 'prFailed', text: 'PR Failed' },
  { value: 'planned', text: 'Planned' },
  { value: 'planFailed', text: 'Plan Failed' },
  { value: 'approved', text: 'Approved' },
  { value: 'applied', text: 'Applied' },
  { value: 'applyFailed', text: 'Apply Failed' },
];

const archiveStatusFilters = [
  { value: 'all', text: 'All' },
  { value: 'active', text: 'Active' },
  { value: 'archived', text: 'Deleted' },
];

const pageLimits = [
  { value: 5, text: '5 per page' },
  { value: 10, text: '10 per page' },
  { value: 15, text: '15 per page' },
  { value: 30, text: '30 per page' },
  { value: 50, text: '50 per page' },
  { value: 100, text: '100 per page' },
];

const mediaRules: MediaRule[] = [
  {
    maxWidth: 1280,
    marginTop: 10,
  },
  {
    maxWidth: 1400,
    width: 1200,
    marginTop: 20,
  },
  {
    maxWidth: 1700,
    width: 1300,
    marginTop: 20,
  },
  {
    width: 1600,
    marginTop: 20,
  },
];

const ButtonContainer = styled.div`
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  & button {
    min-width: 150px;
    margin-right: 20px;
    display: inline-block;
  }
`;

const PaddedIcon = styled(FontAwesomeIcon)`
  padding-right: 10px;
`;

export default function AdminDashboard({ currentUser }: PageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [showEvents, setShowEvents] = useState<boolean>(false);
  const [rows, setRows] = useState<Request[]>([]);
  const [searchKey, setSearchKey] = useState<string>(String(router.query?.id || ''));
  const [count, setCount] = useState<number>(0);
  const [limit, setLimit] = useState<number>(5);
  const [page, setPage] = useState<number>(1);
  const [status, setStatus] = useState<Status>('all');
  const [archiveStatus, setArchiveStatus] = useState<ArchiveStatus>('active');
  const [selectedId, setSelectedId] = useState<number | undefined>(Number(router.query?.id) || undefined);

  const getData = async () => {
    setLoading(true);

    const [data, err] = await getRequestAll({
      searchField: ['id', 'projectName'],
      searchKey,
      order: [
        ['updatedAt', 'desc'],
        ['status', 'desc'],
      ],
      limit,
      page,
      status,
      archiveStatus,
    });
    if (err) {
      setHasError(true);
    } else if (data) {
      setRows(data.rows);
      setCount(data.count);
    }

    setLoading(false);
  };

  useEffect(() => {
    getData();
  }, [searchKey, limit, page, status, archiveStatus]);

  if (loading) {
    return (
      <ResponsiveContainer rules={mediaRules} style={{ textAlign: 'center' }}>
        <Loader type="Grid" color="#000" height={45} width={45} visible={true} />
      </ResponsiveContainer>
    );
  }

  if (hasError) {
    return null;
  }

  const canEdit = (request: Request) => ['applied'].includes(request?.status || '');
  const canDelete = (request: Request) => !['pr', 'planned', 'submitted'].includes(request?.status || '');

  const handleEdit = async (request: Request) => {
    if (!request.id || !canEdit(request)) return;
    await router.push(`/edit-request?id=${request.id}`);
  };

  const handleDelete = async (request: Request) => {
    if (!request.id || !canDelete(request)) return;
    setSelectedId(request.id);
    window.location.hash = 'delete-modal';
  };

  const confirmDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    await deleteRequest(selectedId);
    setDeleting(false);
    await getData();
    window.location.hash = '#';
  };

  const cancelDelete = () => (window.location.hash = '#');

  let rightPanel = null;
  if (selectedId) {
    rightPanel = showEvents ? (
      <AdminEventPanel requestId={selectedId} />
    ) : (
      <AdminRequestPanel request={rows.find((v) => v.id === selectedId)} />
    );
  }

  return (
    <ResponsiveContainer rules={mediaRules}>
      <Grid cols={10}>
        <Grid.Row collapse="800" gutter={[15, 2]}>
          <Grid.Col span={6}>
            <Table
              headers={[
                { name: 'Request ID' },
                { name: 'Project Name' },
                { name: 'Request Status' },
                { name: 'File Status' },
                { name: 'Actions', style: { textAlign: 'center', minWidth: '140px' } },
              ]}
              filterItems={statusFilters}
              filterItems2={archiveStatusFilters}
              pageLimits={pageLimits}
              searchKey={searchKey}
              searchPlaceholder="Project ID or Name"
              limit={limit}
              page={page}
              rowCount={count}
              filter={status}
              filter2={archiveStatus}
              onSearch={(val) => {
                setSearchKey(val);
                setPage(1);
              }}
              onFilter={(val) => {
                setStatus(val);
                setPage(1);
              }}
              onFilter2={(val) => {
                setArchiveStatus(val);
                setPage(1);
              }}
              onLimit={(val) => {
                setPage(1);
                setLimit(val);
              }}
              onPrev={setPage}
              onNext={setPage}
            >
              {rows.length > 0 ? (
                rows.map((row: Request) => {
                  return (
                    <tr
                      key={row.id}
                      className={selectedId === row.id ? 'active' : ''}
                      onClick={() => {
                        setSelectedId(row.id);
                        setShowEvents(false);
                      }}
                    >
                      <td>{padStart(String(row.id), 8, '0')}</td>
                      <td>{row.projectName}</td>
                      <td>{startCase(row.status)}</td>
                      <td>{row.archived ? 'Deleted' : 'Active'}</td>
                      <td>
                        <Container>
                          <ActionButton
                            icon={faEye}
                            role="button"
                            aria-label="events"
                            onClick={(event: any) => {
                              event.stopPropagation();
                              setSelectedId(row.id);
                              setShowEvents(true);
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
                        </Container>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10}>No clients found.</td>
                </tr>
              )}
            </Table>
          </Grid.Col>
          <Grid.Col span={4}>{rightPanel}</Grid.Col>
        </Grid.Row>
      </Grid>
      <CenteredModal id="delete-modal">
        <Modal.Header>
          <PaddedIcon icon={faExclamationTriangle} title="Information" size="2x" style={{ paddingRight: '10px' }} />
          Confirm Deletion
        </Modal.Header>
        <Modal.Content>
          You are about to delete this integration request. This action cannot be undone.
          <ButtonContainer>
            <CancelButton variant="secondary" onClick={cancelDelete}>
              Cancel
            </CancelButton>
            <BcButton onClick={confirmDelete}>
              {deleting ? <Loader type="Grid" color="#FFF" height={18} width={50} visible /> : 'Delete'}
            </BcButton>
          </ButtonContainer>
        </Modal.Content>
      </CenteredModal>
    </ResponsiveContainer>
  );
}
