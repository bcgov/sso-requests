import React, { useState, useEffect } from 'react';
import { padStart, startCase } from 'lodash';
import Loader from 'react-loader-spinner';
import Grid from '@button-inc/bcgov-theme/Grid';
import ResponsiveContainer, { MediaRule } from 'components/ResponsiveContainer';
import Table from 'components/Table';
import { getRequestAll } from 'services/request';
import { PageProps } from 'interfaces/props';
import { Request } from 'interfaces/Request';

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

export default function AdminDashboard({ currentUser }: PageProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [rows, setRows] = useState<Request[]>([]);
  const [searchKey, setSearchKey] = useState<string>('');
  const [count, setCount] = useState<number>(0);
  const [limit, setLimit] = useState<number>(5);
  const [page, setPage] = useState<number>(1);
  const [status, setStatus] = useState<Status>('all');
  const [archiveStatus, setArchiveStatus] = useState<ArchiveStatus>('active');

  useEffect(() => {
    const getData = async () => {
      setLoading(true);

      const [data, err] = await getRequestAll({
        searchField: ['projectName'],
        searchKey,
        order: [['createdAt', 'desc']],
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

  return (
    <ResponsiveContainer rules={mediaRules}>
      <Grid cols={10}>
        <Grid.Row collapse="800" gutter={[15, 2]}>
          <Grid.Col span={6}>
            <Table
              headers={['Request ID', 'Project Name', 'Status']}
              filterItems={statusFilters}
              filterItems2={archiveStatusFilters}
              pageLimits={pageLimits}
              searchKey={searchKey}
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
              onLimit={setLimit}
              onPage={setPage}
            >
              {rows.length > 0 ? (
                rows.map((row: Request) => {
                  return (
                    <tr key={row.id}>
                      <td>{padStart(String(row.id), 8, '0')}</td>
                      <td>{row.projectName}</td>
                      <td>{startCase(row.status)}</td>
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
          <Grid.Col span={4}></Grid.Col>
        </Grid.Row>
      </Grid>
    </ResponsiveContainer>
  );
}
