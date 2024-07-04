import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import RequestPreview from 'components/RequestPreview';
import { Integration } from 'interfaces/Request';
import MetadataEditModal from 'page-partials/admin-dashboard/MetadataEditModal';
import { LoggedInUser } from 'interfaces/team';
import { usesBcServicesCard } from '@app/helpers/integration';
import { fetchPrivacyZones } from '@app/services/bc-services-card';
import { BcscPrivacyZone } from '@app/interfaces/types';

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
  if (!request) return null;

  useEffect(() => {
    fetchPrivacyZones().then(([zones]): void => {
      if (zones) {
        setPrivacyZones(zones);
      }
    });
  }, []);

  useEffect(() => {
    const bcscPrivacyZone = privacyZones.find((zone) => zone.privacy_zone_uri === request.bcscPrivacyZone);
    setPrivacyZoneName(bcscPrivacyZone?.privacy_zone_name || '');
  }, [request.id, privacyZones]);

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
