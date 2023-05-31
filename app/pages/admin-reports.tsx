import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@bcgov-sso/common-react-components';
import ResponsiveContainer, { MediaRule } from 'components/ResponsiveContainer';
import { PageProps } from 'interfaces/props';
import { Grid as SpinnerGrid } from 'react-loader-spinner';
import {
  downloadAllStandardIntegrationsReport,
  downloadAllRequestsReport,
  downloadAllUsersReport,
  downloadAllTeamsReport,
  downloadAllEventsReport,
} from '../services/report';
import styled from 'styled-components';
import Select from 'react-select';
import Grid from '@button-inc/bcgov-theme/Grid';

const BorderLine = styled.div`
  border-bottom: 1px solid #707070;
  margin-bottom: 20px;
  padding-bottom: 10px;
`;

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

const reportTypeList = [
  { value: 'all-requests', label: 'Integrations' },
  { value: 'all-users', label: 'Users' },
  { value: 'all-teams', label: 'Teams' },
  { value: 'all-events', label: 'Events' },
];

export default function AdminReports({ session }: PageProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [reportType, setreportType] = useState<any>(null);

  const handleAllStandardReportClick = async () => {
    setLoading(true);
    await downloadAllStandardIntegrationsReport();
    setLoading(false);
  };

  const handleAllRequestsClick = async () => {
    setLoading(true);
    await downloadAllRequestsReport();
    setLoading(false);
  };

  const handleAllUsersClick = async () => {
    setLoading(true);
    await downloadAllUsersReport();
    setLoading(false);
  };

  const handleAllTeamsClick = async () => {
    setLoading(true);
    await downloadAllTeamsReport();
    setLoading(false);
  };

  const handleAllEventsClick = async () => {
    setLoading(true);
    await downloadAllEventsReport();
    setLoading(false);
  };

  let databaseReportButton = null;
  if (reportType == 'all-requests') {
    databaseReportButton = (
      <Button variant="primary" type="button" className="text-center" onClick={handleAllRequestsClick}>
        <span>Integrations&nbsp;</span>
        <FontAwesomeIcon icon={faDownload} />
      </Button>
    );
  } else if (reportType == 'all-users') {
    databaseReportButton = (
      <Button variant="primary" type="button" className="text-center" onClick={handleAllUsersClick}>
        <span>Users&nbsp;</span>
        <FontAwesomeIcon icon={faDownload} />
      </Button>
    );
  } else if (reportType == 'all-teams') {
    databaseReportButton = (
      <Button variant="primary" type="button" className="text-center" onClick={handleAllTeamsClick}>
        <span>Teams&nbsp;</span>
        <FontAwesomeIcon icon={faDownload} />
      </Button>
    );
  } else if (reportType == 'all-events') {
    databaseReportButton = (
      <Button variant="primary" type="button" className="text-center" onClick={handleAllEventsClick}>
        <span>Events&nbsp;</span>
        <FontAwesomeIcon icon={faDownload} />
      </Button>
    );
  }

  return (
    <ResponsiveContainer rules={mediaRules}>
      <h2>Reports</h2>
      <BorderLine>
        {loading ? (
          <SpinnerGrid color="#000" height={25} width={25} wrapperClass="d-block" visible={loading} />
        ) : (
          <>
            <Button variant="primary" type="button" className="text-center" onClick={handleAllStandardReportClick}>
              <span>All Standard Integrations&nbsp;</span>
              <FontAwesomeIcon icon={faDownload} />
            </Button>
          </>
        )}
      </BorderLine>
      <h2>Database</h2>
      {loading ? (
        <SpinnerGrid color="#000" height={25} width={25} wrapperClass="d-block" visible={loading} />
      ) : (
        <>
          <Grid cols={10}>
            <Grid.Row collapse="" gutter={[10, 0]}>
              <Grid.Col span={3}>
                {
                  <Select
                    options={reportTypeList}
                    onChange={(type: any) => setreportType(type.value)}
                    maxMenuHeight={300}
                    styles={{
                      control: (base) => ({
                        ...base,
                        width: '250px',
                      }),
                      menu: (base) => ({
                        ...base,
                        width: '250px',
                      }),
                    }}
                  />
                }
              </Grid.Col>
              <Grid.Col span={7}>{databaseReportButton}</Grid.Col>
            </Grid.Row>
          </Grid>
        </>
      )}
    </ResponsiveContainer>
  );
}
