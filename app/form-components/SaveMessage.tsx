import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { SaveMessage as SaveMessageInterface } from 'interfaces/form';
import styled from 'styled-components';
import { Grid as SpinnerGrid } from 'react-loader-spinner';

const Icon = styled.span`
  width: 30px;
`;

const SaveContainer = styled.div`
  display: flex;
`;

const StyledP = styled.p`
  margin-left: 10px;
`;

interface Props {
  saving?: boolean;
  saveMessage?: SaveMessageInterface;
}

export default function SaveMessage({ saving, saveMessage }: Props) {
  const icon = saveMessage?.error ? faExclamationTriangle : faCheck;
  return (
    <>
      <SaveContainer>
        <Icon>
          {saving ? (
            // @ts-ignore
            <SpinnerGrid color="#000" height={18} width={50} visible label="request-saving" />
          ) : (
            <FontAwesomeIcon style={{ color: '#006fc4' }} icon={icon} title="request-saved" />
          )}
        </Icon>
        <StyledP>{saveMessage?.content}</StyledP>
      </SaveContainer>
    </>
  );
}
