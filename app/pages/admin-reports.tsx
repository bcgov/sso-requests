import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
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
import { AxiosError } from 'axios';
import { FailureMessage } from '@app/page-partials/my-dashboard/Messages';
import { isIdpApprover } from '@app/utils/helpers';
import { useRouter } from 'next/router';

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
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [reportType, setreportType] = useState<any>('');
  const [downloadError, setDownloadError] = useState(false);

  useEffect(() => {
    if (!session?.isAdmin && !isIdpApprover(session)) {
      router.push('/my-dashboard');
    }
  }, []);

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

  const handleDownloadClick = async (reportDownloadFunction: () => Promise<[true, null] | [null, AxiosError]>) => {
    setLoading(true);
    setDownloadError(false);
    const [_, err] = await reportDownloadFunction();
    if (err) {
      setDownloadError(true);
    }
    setLoading(false);
  };

  const handleAllStandardReportClick = async () => handleDownloadClick(downloadAllStandardIntegrationsReport);
  const handleAllBceidApprovedRequestsAndEventsReportClick = async () =>
    handleDownloadClick(downloadAllBceidApprovedRequestsAndEventsReport);
  const handleIntegrationDataIntegrityReportClick = async () =>
    handleDownloadClick(downloadIntegrationDataIntegrityReport);
  const handleDownloadReportClick = async () =>
    handleDownloadClick(() =>
      downloadDatabaseReport(reportTypeMap[reportType], primaryKeyMap[reportTypeMap[reportType]]),
    );

  return (
    <ResponsiveContainer rules={mediaRules}>
      <h2>Reports</h2>
      <BorderLine>
        {loading ? (
          <SpinnerGrid color="#000" height={25} width={25} wrapperClass="d-block" visible={loading} />
        ) : (
          <>
            <button className="primary" type="button" onClick={handleAllStandardReportClick}>
              <span>All Standard Integrations&nbsp;</span>
              <FontAwesomeIcon icon={faDownload} />
            </button>
            <br />
            <br />
            <button className="primary" type="button" onClick={handleAllBceidApprovedRequestsAndEventsReportClick}>
              <span>All BCeID Approved Requests And Events&nbsp;</span>
              <FontAwesomeIcon icon={faDownload} />
            </button>
            <br />
            <br />
            <button className="primary" type="button" onClick={handleIntegrationDataIntegrityReportClick}>
              <span>Data Integrity&nbsp;</span>
              <FontAwesomeIcon icon={faDownload} />
            </button>
          </>
        )}
      </BorderLine>
      <h2>Database</h2>
      {loading ? (
        <SpinnerGrid color="#000" height={25} width={25} wrapperClass="d-block" visible={loading} />
      ) : (
        <>
          <DatabaseReportContainer>
            <ReportTypeOptions />
            <DownloadIconStyle>
              <DownloadIcon type={reportType} handleClick={handleDownloadReportClick} />
            </DownloadIconStyle>
          </DatabaseReportContainer>
          {reportType === 'all-events' && (
            <>
              <br />
              <p>
                <em>
                  Event downloads limited to 5000 most recent events. Please use dashboard for long-term event analysis.
                </em>
              </p>
            </>
          )}
        </>
      )}
      {downloadError && (
        <>
          <br />
          <FailureMessage message="Failed to download report. Please try again." />
        </>
      )}
    </ResponsiveContainer>
  );
}
