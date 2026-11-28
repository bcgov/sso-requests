import React, { useState } from 'react';
import { faStopCircle } from '@fortawesome/free-solid-svg-icons';
import CenteredModal from 'components/CenteredModal';
import { Integration } from 'interfaces/Request';
import { stopRequestWorkflow } from 'services/request';
import { isInFlight } from '@app/helpers/transitions';

interface Props {
  request: Integration;
  onUpdate?: Function;
}

/**
 * Ends an integration's in-progress workflow as failed, for one that keeps retrying a failure only a fix can
 * clear. The integration becomes resubmittable once stopped.
 */
function StopWorkflowModal({ request, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isInFlight(request.status)) return null;

  const close = () => {
    setOpen(false);
    setError(null);
  };

  const handleConfirm = async () => {
    setStopping(true);
    const [, err] = await stopRequestWorkflow(request.id as number);
    setStopping(false);
    if (err) {
      setError(String(err));
      return;
    }
    close();
    if (onUpdate) await onUpdate();
  };

  const content = (
    <div data-testid="stop-workflow-content">
      <p>
        Stop the update of <strong>{request.projectName}</strong> that is in progress? It stops retrying, and the
        integration is marked as failed so its owner can submit it again once the cause is fixed. Changes already
        applied in Keycloak stay applied.
      </p>
      {error && (
        <p role="alert" style={{ color: '#d8292f' }}>
          {error}
        </p>
      )}
    </div>
  );

  return (
    <>
      <button
        className="secondary"
        style={{ marginLeft: 10 }}
        onClick={() => setOpen(true)}
        data-testid="stop-workflow-button"
      >
        Stop Workflow
      </button>
      <CenteredModal
        id="stop-workflow"
        openModal={open}
        handleClose={close}
        content={content}
        onConfirm={handleConfirm}
        confirmText="Stop Workflow"
        disableConfirm={stopping}
        skipCloseOnConfirm
        icon={faStopCircle}
        title="Stop Workflow"
        closable
      />
    </>
  );
}

export default StopWorkflowModal;
