import { useContext, useEffect, useState } from 'react';
import Modal from '@button-inc/bcgov-theme/Modal';
import Button from '@button-inc/bcgov-theme/Button';
import Alert from '@button-inc/bcgov-theme/Alert';
import Link from '@button-inc/bcgov-theme/Link';
import styled from 'styled-components';
import Loader from 'react-loader-spinner';
import { getInstallation } from 'services/keycloak';
import { prettyJSON, copyTextToClipboard, downloadText } from 'utils/text';
import type { Environment } from 'interfaces/types';

const AlignCenter = styled.div`
  text-align: center;
`;

const InstallationModal = ({
  requestId,
  environment,
  panelEnv,
}: {
  requestId: number;
  environment: Environment;
  panelEnv: Environment;
}) => {
  const [installation, setInstallation] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleInstallationClick = async () => {
    setLoading(true);
    setInstallation(null);
    const [data, err] = await getInstallation(requestId, environment);
    setInstallation(data);
    setLoading(false);
  };

  const handleCloseClick = () => {
    setInstallation(null);
  };

  const handleCopyClick = () => {
    copyTextToClipboard(prettyJSON(installation));
  };

  const handleDownloadClick = () => {
    downloadText(prettyJSON(installation), `installation-${environment}.json`);
  };

  const installationDisplay = installation ? (
    <>
      <pre>{prettyJSON(installation)}</pre>
      <Button variant="primary-inverse" size="small" onClick={handleCopyClick}>
        Copy
      </Button>

      <Button variant="primary" size="small" onClick={handleDownloadClick}>
        Download
      </Button>
    </>
  ) : (
    <Alert variant="info" content="Failed to load installation JSON" />
  );

  return (
    <>
      <Modal id={`installation-json-${panelEnv}`}>
        <Modal.Header>
          Installation JSON <Modal.Close onClick={handleCloseClick}>Close</Modal.Close>
        </Modal.Header>
        <Modal.Content>
          <AlignCenter>
            <Loader type="Grid" color="#000" height={45} width={45} visible={loading} />
          </AlignCenter>

          {!loading && installationDisplay}
        </Modal.Content>
      </Modal>
      <Link
        href={`#installation-json-${panelEnv}`}
        content="View Installation JSON"
        size="medium"
        onClick={handleInstallationClick}
      />
    </>
  );
};

export default InstallationModal;
