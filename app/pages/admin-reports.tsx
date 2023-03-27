import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@bcgov-sso/common-react-components';
import ResponsiveContainer, { MediaRule } from 'components/ResponsiveContainer';
import { PageProps } from 'interfaces/props';
import { Grid as SpinnerGrid } from 'react-loader-spinner';
import { downloadAllStandardIntegrationsReport } from '../services/report';

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

export default function AdminReports({ session }: PageProps) {
  const [loading, setLoading] = useState<boolean>(false);

  const handleAllStandardReportClick = async () => {
    setLoading(true);
    await downloadAllStandardIntegrationsReport();
    setLoading(false);
  };

  return (
    <ResponsiveContainer rules={mediaRules}>
      <h2>Reports</h2>
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
    </ResponsiveContainer>
  );
}
