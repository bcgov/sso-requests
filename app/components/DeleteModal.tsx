import CenteredModal from './CenteredModal';
import { ChangeEvent, useState } from 'react';
import Input from '@button-inc/bcgov-theme/Input';

interface Props {
  id: string;
  onConfirm: () => void;
  content: string;
  title: string;
  projectName?: string;
}

export default function DeleteModal({ id, onConfirm, title, content, projectName }: Readonly<Props>) {
  const [nameConfirmation, setNameConfirmation] = useState('');

  const handleConfirm = async () => {
    if (nameConfirmation === projectName) {
      await onConfirm();
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
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNameConfirmation(e.target.value)}
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
