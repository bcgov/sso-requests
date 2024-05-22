import CenteredModal from './CenteredModal';
import { ChangeEvent, useState } from 'react';
import Input from '@button-inc/bcgov-theme/Input';

interface Props {
  id: string;
  onConfirm: () => Promise<void>;
  content: string;
  title: string;
  projectName?: string;
}

export default function DeleteModal({ id, onConfirm, title, content, projectName }: Readonly<Props>) {
  const [nameConfirmation, setNameConfirmation] = useState('');
  const label = projectName
    ? `Please enter ${projectName} below to confirm deletion.`
    : 'Please enter the project name below to confirm deletion.';

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
              label={label}
              value={nameConfirmation}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNameConfirmation(e.target.value)}
            />
          </>
        }
        onConfirm={handleConfirm}
        title={title}
        confirmText="Delete"
        buttonStyle="danger"
        disableConfirm={nameConfirmation !== projectName}
      />
    </div>
  );
}
