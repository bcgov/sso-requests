import React from 'react';
import styled from 'styled-components';
import SectionHeader from 'components/SectionHeader';
import RequestPreview from 'components/RequestPreview';
import { Request } from 'interfaces/Request';
import { SUBTITLE_FONT_SIZE } from 'styles/theme';

const Title = styled.h3`
  color: #777777;
  font-size: ${SUBTITLE_FONT_SIZE};
  font-weight: bold;
  padding-top: 10px;
  margin-bottom: 0;
`;

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
    <>
      <SectionHeader>
        <Title>Details</Title>
      </SectionHeader>
      <EventContent>
        <RequestPreview request={request} hasBceid={false} />
      </EventContent>
    </>
  );
}
