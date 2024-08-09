import React from 'react';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import CenteredModal from 'components/CenteredModal';

interface Props {
  onConfirm?: Function;
}

function CancelConfirmModal({ onConfirm }: Props) {
  const [openCancelModal, setOpenCancelModal] = React.useState(false);

  const handleConfirm = async () => {
    if (onConfirm) await onConfirm();
    window.location.hash = '#';
  };

  const openModal = () => {
    setOpenCancelModal(true);
  };

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
      <button className="secondary wide" type="button" onClick={openModal}>
        Cancel
      </button>
      <CenteredModal
        id="edit-cancel-confirmation"
        openModal={openCancelModal}
        handleClose={() => setOpenCancelModal(false)}
        content={modalContents}
        onConfirm={handleConfirm}
        icon={faExclamationTriangle}
        title="Canceling request update"
        closable
      />
    </>
  );
}

export default CancelConfirmModal;
