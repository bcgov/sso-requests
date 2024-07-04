import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import RequestPreview from 'components/RequestPreview';
import { Integration } from 'interfaces/Request';
import MetadataEditModal from 'page-partials/admin-dashboard/MetadataEditModal';
import { LoggedInUser } from 'interfaces/team';
import { fetchPrivacyZones } from '@app/services/bc-services-card';
import { BcscPrivacyZone } from '@app/interfaces/types';
import { getPrivacyZoneDisplayName } from '@app/helpers/integration';

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
  const [privacyZones, setPrivacyZones] = useState<BcscPrivacyZone[]>([]);
  const [privacyZoneName, setPrivacyZoneName] = useState('');

  useEffect(() => {
    fetchPrivacyZones().then(([zones]): void => {
      if (zones) {
        setPrivacyZones(zones);
      }
    });
  }, []);

  useEffect(() => {
    const bcscPrivacyZone = getPrivacyZoneDisplayName(privacyZones, request?.bcscPrivacyZone);
    setPrivacyZoneName(bcscPrivacyZone);
  }, [request?.id, privacyZones]);

  if (!request) return null;

  return (
    <EventContent>
      <br />
      <RequestPreview request={request} privacyZone={privacyZoneName}>
        <br />
        {currentUser.isAdmin && <MetadataEditModal request={request} onUpdate={onUpdate} />}
      </RequestPreview>
    </EventContent>
  );
}
