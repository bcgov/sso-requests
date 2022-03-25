import styled from 'styled-components';
import { padStart, isNil } from 'lodash';
import { Stage } from 'interfaces/form';

const Header = styled.h1`
  font-weight: lighter;
  color: #003366;
  margin: 0;
`;

interface Props {
  formStage: number;
  stages: Stage[];
  requestId: number | undefined;
  editing: boolean;
}

export default function Formheader({ formStage, stages, requestId, editing }: Props) {
  const paddedId = padStart(String(requestId), 8, '0');
  const prefix = editing ? 'Editing ' : '';
  const header = `${isNil(requestId) ? '' : `Req ID: ${paddedId} - `}${stages[formStage].header}`;

  return <Header>{prefix + header}</Header>;
}
