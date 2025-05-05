import React from 'react';
import styled from 'styled-components';
import RequestPreview from 'components/RequestPreview';
import { Integration } from 'interfaces/Request';
import MetadataEditModal from 'page-partials/admin-dashboard/MetadataEditModal';
import { LoggedInUser } from 'interfaces/team';

const EventContent = styled.div`
  max-height: calc(100vh - 250px);
  overflow: auto;
`;

interface Props {
  currentUser: LoggedInUser;
  request: Integration | undefined;
  onUpdate: Function;
}

export default function AdminRequestPanel({ currentUser, request, onUpdate }: Props) {
  if (!request) return null;

  return (
    <EventContent>
      <br />
      <RequestPreview request={request} />
      {currentUser.isAdmin && <MetadataEditModal request={request} onUpdate={onUpdate} />}
    </EventContent>
  );
}
