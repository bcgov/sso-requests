import CenteredModal from './CenteredModal';
import { useState } from 'react';
import Input from '@button-inc/bcgov-theme/Input';

interface Props {
  id: string;
  onConfirm: () => void;
  content: string;
  title: string;
  confirmText: string;
  projectName?: string;
}

export default function DeleteModal({ id, onConfirm, title, content, projectName }: Props) {
  const [nameConfirmation, setNameConfirmation] = useState('');

  const handleConfirm = () => {
    if (nameConfirmation === projectName) {
      onConfirm();
    }
  };
  return (
    <div>
      <CenteredModal
        id={id}
        data-testid="modal-delete-integration"
        content={
          <>
            <p>{content}</p>
            <Input
              data-testid="delete-confirmation-input"
              label="Please enter the project name to confirm deletion."
              value={nameConfirmation}
              onChange={(e: any) => setNameConfirmation(e.target.value)}
            />
          </>
        }
        onConfirm={handleConfirm}
        title={title}
        confirmText="Delete"
        disableConfirm={nameConfirmation !== projectName}
      />
    </div>
  );
}
