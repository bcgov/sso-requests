import React, { useState, useEffect } from 'react';
import Button from '@button-inc/bcgov-theme/Button';
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
  const [status, setStatus] = useState(request.status);

  const modalId = 'edit-metadata';

  const handleMetadataModalConfirm = async () => {
    await updateRequestMetadata({ id: request.id, status });
    if (onUpdate) await onUpdate();
    window.location.hash = '#';
  };

  useEffect(() => {
    setStatus(request.status);
  }, [request.id]);

  const openModal = () => (window.location.hash = modalId);

  const modalContents = (
    <div data-testid="integration-status">
      <p style={{ fontWeight: 'bold' }}>Integration Status</p>
      <Select
        className="react-select-container"
        classNamePrefix="select"
        //@ts-ignore
        options={workflowStatusOptions.filter((op) => ['submitted', 'planned'].includes(op.value))}
        onChange={(val: any) => setStatus(val.value)}
        isSearchable={true}
      />
    </div>
  );

  return (
    <>
      <Button variant="bcPrimary" size="small" onClick={openModal}>
        Edit Metadata
      </Button>
      <CenteredModal
        id={modalId}
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
