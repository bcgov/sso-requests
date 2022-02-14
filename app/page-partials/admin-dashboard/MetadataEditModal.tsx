import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Button from '@button-inc/bcgov-theme/Button';
import Input from '@button-inc/bcgov-theme/Input';
import Dropdown from '@button-inc/bcgov-theme/Dropdown';
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import CenteredModal from 'components/CenteredModal';
import { Request } from 'interfaces/Request';
import { workflowStatusOptions } from 'metadata/options';
import { updateRequestMetadata } from 'services/request';

interface Props {
  request: Request;
  onUpdate?: Function;
}

const StyledDropdown = styled(Dropdown)`
  & label {
    display: block;
    font-weight: bold;
  }
`;

function MetadataEditModal({ request, onUpdate }: Props) {
  const [uuid, setUuid] = useState(request.idirUserid);
  const [status, setStatus] = useState(request.status);

  const modalId = 'edit-metadata';

  const handleMetadataModalConfirm = async () => {
    await updateRequestMetadata({ id: request.id, idirUserid: uuid, status });
    if (onUpdate) await onUpdate();
    window.location.hash = '#';
  };

  useEffect(() => {
    setUuid(request.idirUserid);
    setStatus(request.status);
  }, [request.id]);

  const openModal = () => (window.location.hash = modalId);

  const modalContents = (
    <>
      <Input
        label="Owner IDIR UUID"
        fullWidth={true}
        onChange={(event: any) => {
          setUuid(event.target.value);
        }}
        value={uuid}
      />
      <br />
      <StyledDropdown
        label="Integration Status"
        onChange={(event: any) => {
          setStatus(event.target.value);
        }}
        value={status}
      >
        {workflowStatusOptions.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </StyledDropdown>
    </>
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
