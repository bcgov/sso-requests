import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faCopy, faArrowRotateRight, faDownload } from '@fortawesome/free-solid-svg-icons';
import { PRIMARY_RED } from 'styles/theme';

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
          aria-label="copy-credentials"
          onClick={() => copyOrDownloadAction(false)}
          size="lg"
          disabled={actionsDisabled}
          aria-hidden={false}
        />
        <ActionButton
          icon={faDownload}
          role="button"
          aria-label="download-credentials"
          onClick={() => copyOrDownloadAction(true)}
          size="lg"
          disabled={actionsDisabled}
          aria-hidden={false}
        />
        <ActionButton
          icon={faArrowRotateRight}
          role="button"
          aria-label="update-secret"
          onClick={showUpdateModal}
          size="lg"
          disabled={actionsDisabled}
          aria-hidden={false}
        />
        <ActionButton
          icon={faTrash}
          role="button"
          aria-label="delete-api-account"
          onClick={showDeleteModal}
          size="lg"
          disabled={actionsDisabled}
          aria-hidden={false}
        />
      </ActionButtonContainer>
    </>
  );
}
