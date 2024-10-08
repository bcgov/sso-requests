import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import CenteredModal from 'components/CenteredModal';
import { Integration } from 'interfaces/Request';
import { workflowStatusOptions } from 'metadata/options';
import { updateRequestMetadata } from 'services/request';

interface Props {
  request: Integration;
  onUpdate?: Function;
}

function MetadataEditModal({ request, onUpdate }: Props) {
  const [openMetaDataEditModal, setOpenMetaDataEditModal] = useState(false);
  const [status, setStatus] = useState(request.status);

  const handleMetadataModalConfirm = async () => {
    await updateRequestMetadata({ id: request.id, status });
    if (onUpdate) await onUpdate();
    window.location.hash = '#';
  };

  useEffect(() => {
    setStatus(request.status);
  }, [request.id]);

  const openModal = () => {
    setOpenMetaDataEditModal(true);
  };

  const modalContents = (
    <div data-testid="integration-status">
      <p style={{ fontWeight: 'bold' }}>Integration Status</p>
      <Select
        className="react-select-container"
        classNamePrefix="select"
        //@ts-ignore
        options={workflowStatusOptions.filter((op) => ['draft', 'submitted'].includes(op.value))}
        onChange={(val: any) => setStatus(val.value)}
        isSearchable={true}
      />
    </div>
  );

  return (
    <>
      <button className="primary" onClick={openModal} data-testid={'edit-metadata-button'}>
        Edit Metadata
      </button>
      <CenteredModal
        id="edit-metadata"
        openModal={openMetaDataEditModal}
        handleClose={() => setOpenMetaDataEditModal(false)}
        content={modalContents}
        onConfirm={handleMetadataModalConfirm}
        icon={faPencilAlt}
        title="Edit Metadata"
        closable
      />
    </>
  );
}

export default MetadataEditModal;
