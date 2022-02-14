import SHeader from 'components/SHeader';
import { padStart, isNil } from 'lodash';

interface Props {
  formStage: number;
  requestId: number | undefined;
  editing: boolean;
}

export default function Formheader({ formStage, requestId, editing }: Props) {
  const paddedId = padStart(String(requestId), 8, '0');
  const titles = [
    `${isNil(requestId) ? '' : `Req ID: ${paddedId} - `}Enter requester information`,
    `Req ID: ${paddedId} - Choose providers and provide URIs`,
    `Req ID: ${paddedId} - Terms and Conditions`,
    `Req ID: ${paddedId} - Review and Submit`,
  ];

  const prefix = editing ? 'Editing ' : '';

  return (
    <>
      <SHeader>{prefix + titles[formStage]}</SHeader>
    </>
  );
}
