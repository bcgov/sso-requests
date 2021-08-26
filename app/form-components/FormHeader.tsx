import SHeader from 'components/SHeader';
import Loader from 'react-loader-spinner';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { SaveMessage } from 'interfaces/form';
import { faCheck, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
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
}

export default function Formheader({ formStage, id }: Props) {
  const paddedId = padStart(String(id), 8, '0');
  const titles = [
    `${id ? `Req ID: ${paddedId} - ` : ''}Enter requester information`,
    `Req ID: ${paddedId} - Choose providers and provide URIs`,
    `Req ID: ${paddedId} - Terms and Conditions`,
    `Req ID: ${paddedId} - Review and Submit`,
  ];

  return (
    <>
      <SHeader>{titles[formStage]}</SHeader>
    </>
  );
}
