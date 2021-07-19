import { useContext, useEffect, useState } from 'react';
import Modal from '@button-inc/bcgov-theme/Modal';
import styled from 'styled-components';
import Loader from 'react-loader-spinner';
import { getRequestUrls, getPropertyName } from 'utils/helpers';
import { getInstallation } from 'services/keycloak';

const InstallationModal = ({ requestId, environment }: { requestId: number; environment: string }) => {
  const [installation, setInstallation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getData = async () => {
      setLoading(true);
      const data = await getInstallation(requestId, environment);
      setLoading(false);
    };
    getData();
  }, []);

  return (
    <>
      <Modal id="installation-json">
        <Modal.Header>
          Installation JSON <Modal.Close>Close</Modal.Close>
        </Modal.Header>
        <Modal.Content>
          {loading ? (
            <Loader type="Grid" color="#FFF" height={18} width={50} visible />
          ) : (
            <>{installation && JSON.stringify(installation)}</>
          )}
        </Modal.Content>
      </Modal>

      <a href="#installation-json">Open Modal</a>
    </>
  );
};

export default InstallationModal;
