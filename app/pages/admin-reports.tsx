import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@bcgov-sso/common-react-components';
import ResponsiveContainer, { MediaRule } from 'components/ResponsiveContainer';
import { PageProps } from 'interfaces/props';
import { Grid as SpinnerGrid } from 'react-loader-spinner';
import {
  downloadAllStandardIntegrationsReport,
  downloadDatabaseReport,
  downloadAllBceidApprovedRequestsAndEventsReport,
  downloadIntegrationDataIntegrityReport,
} from '../services/report';
import styled from 'styled-components';
import Select from 'react-select';
import { ActionButton } from 'components/ActionButtons';

const BorderLine = styled.div`
  border-bottom: 1px solid #707070;
  margin-bottom: 20px;
  padding-bottom: 10px;
`;

const DatabaseReportContainer = styled.div`
  display: flex;
`;

const DownloadIconStyle = styled.div`
  padding-top: 5px;
  margin-left: 20px;
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

const reportTypeOptions = [
  { value: 'all-requests', label: 'Integrations' },
  { value: 'all-users', label: 'Users' },
  { value: 'all-teams', label: 'Teams' },
  { value: 'all-events', label: 'Events' },
];

const reportTypeMap: any = {
  'all-requests': 'Requests',
  'all-users': 'Users',
  'all-teams': 'Teams',
  'all-events': 'Events',
};

const primaryKeyMap: any = {
  Requests: 'id',
  Users: 'id',
  Teams: 'id',
  Events: 'request_id',
};

function DownloadIcon(props: { type: string; handleClick: any }) {
  if (props.type == '') return <></>;
  else return <ActionButton icon={faDownload} role="button" onClick={props.handleClick} title="Download" size="lg" />;
}

export default function AdminReports({ session }: PageProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [reportType, setreportType] = useState<any>('');

  const ReportTypeOptions = () => {
    return (
      <Select
        value={reportTypeOptions.filter(function (reportTypeOptions) {
          return reportTypeOptions.value === reportType;
        })}
        options={reportTypeOptions}
        onChange={(type: any) => setreportType(type.value)}
        maxMenuHeight={300}
        placeholder={'Select table...'}
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
    );
  };

  const handleAllStandardReportClick = async () => {
    setLoading(true);
    await downloadAllStandardIntegrationsReport();
    setLoading(false);
  };

  const handleAllBceidApprovedRequestsAndEventsReportClick = async () => {
    setLoading(true);
    await downloadAllBceidApprovedRequestsAndEventsReport();
    setLoading(false);
  };

  const handleIntegrationDataIntegrityReportClick = async () => {
    setLoading(true);
    await downloadIntegrationDataIntegrityReport();
    setLoading(false);
  };

  const handleDownloadReportClick = async () => {
    setLoading(true);
    await downloadDatabaseReport(reportTypeMap[reportType], primaryKeyMap[reportTypeMap[reportType]]);
    setLoading(false);
  };

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
            <br />
            <br />
            <Button
              variant="primary"
              type="button"
              className="text-center"
              onClick={handleAllBceidApprovedRequestsAndEventsReportClick}
            >
              <span>All BCeID Approved Requests And Events&nbsp;</span>
              <FontAwesomeIcon icon={faDownload} />
            </Button>
            <br />
            <br />
            <Button
              variant="primary"
              type="button"
              className="text-center"
              onClick={handleIntegrationDataIntegrityReportClick}
            >
              <span>Data Integrity&nbsp;</span>
              <FontAwesomeIcon icon={faDownload} />
            </Button>
          </>
        )}
      </BorderLine>
      <h2>Database</h2>
      {loading ? (
        <SpinnerGrid color="#000" height={25} width={25} wrapperClass="d-block" visible={loading} />
      ) : (
        <DatabaseReportContainer>
          <ReportTypeOptions />
          <DownloadIconStyle>
            <DownloadIcon type={reportType} handleClick={handleDownloadReportClick} />
          </DownloadIconStyle>
        </DatabaseReportContainer>
      )}
    </ResponsiveContainer>
  );
}
