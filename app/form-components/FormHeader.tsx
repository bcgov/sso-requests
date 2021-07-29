import SHeader from 'components/SHeader';
import Loader from 'react-loader-spinner';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { padStart } from 'lodash';

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
  const paddedId = padStart(String(id), 8, '0');
  const titles = [
    `${id ? `Req ID: ${paddedId} - ` : ''}Enter requester information`,
    `Req ID: ${paddedId} - Choose providers and provide URIs`,
    `Req ID: ${paddedId} - Terms and Conditions`,
    `Req ID: ${paddedId} - Review and Submit`,
  ];

  return (
    <>
      <SHeader>{titles[formStage - 1]}</SHeader>
      {(saving || saveMessage) && (
        <Container>
          <Icon>
            {saving ? (
              // @ts-ignore
              <Loader type="TailSpin" color="#000" height={18} width={50} visible label="request-saving" />
            ) : (
              <FontAwesomeIcon style={{ color: '#006fc4' }} icon={faCheck} title="request-saved" />
            )}
          </Icon>

          <p>{saveMessage}</p>
        </Container>
      )}
    </>
  );
}
