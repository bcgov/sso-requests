import SHeader from 'components/SHeader';
import styled from 'styled-components';
import { padStart } from 'lodash';

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
