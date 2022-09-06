import styled from 'styled-components';
import padStart from 'lodash.padstart';
import isNil from 'lodash.isnil';
import { Schema } from '@app/schemas/index';

const Header = styled.h1`
  font-weight: lighter;
  color: #003366;
  margin: 0;
`;

interface Props {
  schema: Schema;
  requestId: number | undefined;
  editing: boolean;
}

export default function Formheader({ schema, requestId, editing }: Props) {
  const paddedId = padStart(String(requestId), 8, '0');
  const prefix = editing ? 'Editing ' : '';
  const header = `${isNil(requestId) ? '' : `Req ID: ${paddedId} - `}${schema.headerText}`;

  return <Header>{prefix + header}</Header>;
}
