import React from 'react';
import styled from 'styled-components';
import RequestPreview from 'components/RequestPreview';
import { Request } from 'interfaces/Request';

const EventContent = styled.div`
  max-height: calc(100vh - 250px);
  overflow: auto;
`;

interface Props {
  request: Request | undefined;
}

export default function AdminRequestPanel({ request }: Props) {
  if (!request) return null;

  return (
    <EventContent>
      <br />
      <RequestPreview request={request} hasBceid={false} />
    </EventContent>
  );
}
