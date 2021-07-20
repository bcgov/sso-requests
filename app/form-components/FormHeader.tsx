import SHeader from 'components/SHeader';
import Loader from 'react-loader-spinner';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

const Container = styled.div`
  display: flex;
  & p {
    padding-left: 15px;
  }
`;

const Icon = styled.span`
  width: 30px;
`;

interface Props {
  formStage: number;
  id: number | undefined;
  saveMessage?: string;
  saving: boolean;
}

export default function Formheader({ formStage, id, saveMessage, saving }: Props) {
  const titles = [
    'Enter requester information',
    `Req ID: ${id} - Choose providers and provide URLs`,
    `Req ID: ${id} - Terms and Conditions`,
    `Req ID: ${id} - Review and Submit`,
  ];

  return (
    <>
      <SHeader>{titles[formStage - 1]}</SHeader>
      {saveMessage && (
        <Container>
          <Icon>
            {saving ? (
              <Loader type="TailSpin" color="#000" height={18} width={50} visible />
            ) : (
              <FontAwesomeIcon style={{ color: '#006fc4' }} icon={faCheck} />
            )}
          </Icon>

          <p>{saveMessage}</p>
        </Container>
      )}
    </>
  );
}
