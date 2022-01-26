import React from 'react';
import Button from '@button-inc/bcgov-theme/Button';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import CenteredModal from 'components/CenteredModal';
import CancelButton from 'components/CancelButton';

interface Props {
  onConfirm?: Function;
}

function CancelConfirmModal({ onConfirm }: Props) {
  const modalId = 'edit-cancel-confirmation';

  const handleConfirm = async () => {
    if (onConfirm) await onConfirm();
    window.location.hash = '#';
  };

  const openModal = () => (window.location.hash = modalId);

  const modalContents = (
    <>
      <p>
        Are you sure you want to press cancel?
        <br />
        If you continue, you will lose any data that you have provided.
      </p>
    </>
  );

  return (
    <>
      <CancelButton variant="secondary" size="medium" type="button" onClick={openModal}>
        Cancel
      </CancelButton>
      <CenteredModal
        id={modalId}
        content={modalContents}
        onConfirm={handleConfirm}
        icon={faExclamationTriangle}
        title="Canceling request submission"
        closable
      />
    </>
  );
}

export default CancelConfirmModal;
