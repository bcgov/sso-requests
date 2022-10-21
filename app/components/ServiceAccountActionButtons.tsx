import { MouseEvent } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faCopy, faArrowRotateRight, faDownload } from '@fortawesome/free-solid-svg-icons';
import { Integration } from 'interfaces/Request';
import CenteredModal from 'components/CenteredModal';
import { deleteRequest } from 'services/request';
import { PRIMARY_RED } from 'styles/theme';
import noop from 'lodash.noop';
import { canDeleteIntegration, canEditIntegration } from '@app/helpers/permissions';

export const ActionButtonContainer = styled.div`
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding-right: 15px;
  & > * {
    margin-left: 15px;
  }
`;

export const ActionButton = styled(FontAwesomeIcon)<{
  disabled?: boolean;
  activeColor?: string;
  isUnread?: boolean;
}>`
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  ${(props) =>
    props.disabled ? `color: #CACACA;` : `color: inherit; &:hover { color: ${props.activeColor || '#000'}; }`}
  ${(props) => (props.isUnread ? `color: ${PRIMARY_RED}` : '')};
`;

export const VerticalLine = styled.div`
  height: 40px;
  border-right: 2px solid #e3e3e3;
`;

interface Props {
  copyOrDownloadAction: (download: boolean) => void;
  showDeleteModal: () => void;
  showUpdateModal: () => void;
  actionsDisabled: boolean;
}

export default function ServiceAccountActionbuttons({
  copyOrDownloadAction,
  showDeleteModal,
  showUpdateModal,
  actionsDisabled,
}: Props) {
  return (
    <>
      <ActionButtonContainer>
        <ActionButton
          icon={faCopy}
          role="button"
          aria-label="copy"
          onClick={() => copyOrDownloadAction(false)}
          title="Copy to clipboard"
          size="lg"
          disabled={actionsDisabled}
        />
        <ActionButton
          icon={faDownload}
          role="button"
          aria-label="download"
          onClick={() => copyOrDownloadAction(true)}
          title="Download"
          size="lg"
          disabled={actionsDisabled}
        />
        <ActionButton
          icon={faArrowRotateRight}
          role="button"
          aria-label="download"
          onClick={showUpdateModal}
          title="Update secret"
          size="lg"
          disabled={actionsDisabled}
        />
        <ActionButton
          icon={faTrash}
          role="button"
          aria-label="delete"
          onClick={showDeleteModal}
          title="Delete"
          size="lg"
          disabled={actionsDisabled}
        />
      </ActionButtonContainer>
    </>
  );
}
