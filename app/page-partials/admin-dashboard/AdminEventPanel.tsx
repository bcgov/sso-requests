import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Grid as SpinnerGrid } from 'react-loader-spinner';
import SectionHeader from 'components/SectionHeader';
import { Event } from 'interfaces/Event';
import { getEvents } from 'services/event';
import EventContent from 'components/EventContent';
import Select from 'react-select';

const AlignCenter = styled.div`
  text-align: center;
`;

interface Props {
  requestId?: number;
}

interface FilterItem {
  value: string | number;
  text: string;
}

const filterItems = [
  { value: 'all', label: 'All Events' },
  { value: 'request-pr-success', label: 'REQUEST_PR_SUCCESS' },
  { value: 'request-pr-failure', label: 'REQUEST_PR_FAILURE' },
  { value: 'request-plan-success', label: 'REQUEST_PLAN_SUCCESS' },
  { value: 'request-plan-failure', label: 'REQUEST_PLAN_FAILURE' },
  { value: 'request-apply-success', label: 'REQUEST_APPLY_SUCCESS' },
  { value: 'request-apply-failure', label: 'REQUEST_APPLY_FAILURE' },
  { value: 'request-create-success', label: 'REQUEST_CREATE_SUCCESS' },
  { value: 'request-create-failure', label: 'REQUEST_CREATE_FAILURE' },
  { value: 'request-update-success', label: 'REQUEST_UPDATE_SUCCESS' },
  { value: 'request-update-failure', label: 'REQUEST_UPDATE_FAILURE' },
  { value: 'request-delete-success', label: 'REQUEST_DELETE_SUCCESS' },
  { value: 'request-delete-failure', label: 'REQUEST_DELETE_FAILURE' },
  { value: 'workflow-delete-success', label: 'WORKFLOW_DELETE_SUCCESS' },
  { value: 'workflow-delete-failure', label: 'WORKFLOW_DELETE_FAILURE' },
  { value: 'api-account-delete-success', label: 'TEAM_API_ACCOUNT_DELETE_SUCCESS' },
  { value: 'api-account-delete-failure', label: 'TEAM_API_ACCOUNT_DELETE_FAILURE' },
  { value: 'api-account-restore-success', label: 'TEAM_API_ACCOUNT_RESTORE_SUCCESS' },
  { value: 'api-account-restore-failure', label: 'TEAM_API_ACCOUNT_RESTORE_FAILURE' },
  { value: 'team-create-success', label: 'TEAM_CREATE_SUCCESS' },
  { value: 'team-update-success', label: 'TEAM_UPDATE_SUCCESS' },
  { value: 'team-delete-success', label: 'TEAM_DELETE_SUCCESS' },
  { value: 'team-member-added', label: 'TEAM_MEMBER_ADDED' },
  { value: 'team-member-removed', label: 'TEAM_MEMBER_REMOVED' },
  { value: 'team-member-role-updated', label: 'TEAM_MEMBER_ROLE_UPDATED' },
  { value: 'role-create-success', label: 'ROLE_CREATE_SUCCESS' },
  { value: 'role-create-failure', label: 'ROLE_CREATE_FAILURE' },
  { value: 'role-create-requested', label: 'ROLE_CREATE_REQUESTED' },
  { value: 'role-update-success', label: 'ROLE_UPDATE_SUCCESS' },
  { value: 'role-update-failure', label: 'ROLE_UPDATE_FAILURE' },
  { value: 'role-update-requested', label: 'ROLE_UPDATE_REQUESTED' },
  { value: 'role-delete-success', label: 'ROLE_DELETE_SUCCESS' },
  { value: 'role-delete-failure', label: 'ROLE_DELETE_FAILURE' },
  { value: 'role-delete-requested', label: 'ROLE_DELETE_REQUESTED' },
  { value: 'role-assign-success', label: 'ROLE_ASSIGN_SUCCESS' },
  { value: 'role-assign-failure', label: 'ROLE_ASSIGN_FAILURE' },
  { value: 'role-assign-requested', label: 'ROLE_ASSIGN_REQUESTED' },
  { value: 'role-bulk-reconcile-success', label: 'ROLE_BULK_RECONCILE_SUCCESS' },
  { value: 'role-bulk-reconcile-failure', label: 'ROLE_BULK_RECONCILE_FAILURE' },
  { value: 'role-bulk-reconcile-requested', label: 'ROLE_BULK_RECONCILE_REQUESTED' },
  { value: 'role-unassign-success', label: 'ROLE_UNASSIGN_SUCCESS' },
  { value: 'role-unassign-failure', label: 'ROLE_UNASSIGN_FAILURE' },
  { value: 'role-unassign-requested', label: 'ROLE_UNASSIGN_REQUESTED' },
  { value: 'role-replicate-success', label: 'ROLE_REPLICATE_SUCCESS' },
  { value: 'role-replicate-failure', label: 'ROLE_REPLICATE_FAILURE' },
  { value: 'role-replicate-requested', label: 'ROLE_REPLICATE_REQUESTED' },
  { value: 'sdx-request-create-success', label: 'SDX_REQUEST_CREATE_SUCCESS' },
  { value: 'sdx-request-create-failure', label: 'SDX_REQUEST_CREATE_FAILURE' },
  { value: 'sdx-request-create-requested', label: 'SDX_REQUEST_CREATE_REQUESTED' },
  { value: 'sdx-access-request-update', label: 'SDX_ACCESS_REQUEST_UPDATE_REQUESTED' },
  { value: 'sdx-access-request-update-success', label: 'SDX_ACCESS_REQUEST_UPDATE_SUCCESS' },
  { value: 'sdx-access-request-update-failure', label: 'SDX_ACCESS_REQUEST_UPDATE_FAILURE' },
  { value: 'service-account-secret-rotation-requested', label: 'SERVICE_ACCOUNT_SECRET_ROTATION_REQUESTED' },
  { value: 'service-account-secret-rotated', label: 'SERVICE_ACCOUNT_SECRET_ROTATED' },
  { value: 'service-account-secret-rotation-failure', label: 'SERVICE_ACCOUNT_SECRET_ROTATION_FAILURE' },
  { value: 'user-create-success', label: 'USER_CREATE_SUCCESS' },
  { value: 'user-update-success', label: 'USER_UPDATE_SUCCESS' },
  { value: 'user-delete-success', label: 'USER_DELETE_SUCCESS' },
  { value: 'user-profile-update-success', label: 'USER_PROFILE_UPDATE_SUCCESS' },
  { value: 'transfer-of-ownership-success', label: 'TRANSFER_OF_OWNERSHIP_SUCCESS' },
  { value: 'transfer-of-ownership-failure', label: 'TRANSFER_OF_OWNERSHIP_FAILURE' },
  { value: 'email-submission-failure', label: 'EMAIL_SUBMISSION_FAILURE' },
];

export default function AdminEventPanel({ requestId }: Props) {
  const [eventCode, setEventCode] = useState('all');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  const getData = async () => {
    if (!requestId) return;
    setLoading(true);

    const [data, err] = await getEvents({
      requestId,
      eventCode,
    });
    if (err) {
      setHasError(true);
    } else if (data) {
      setEvents(data.rows);
    }

    setLoading(false);
  };

  useEffect(() => {
    getData();
  }, [requestId, eventCode]);

  const handleFilterChange = (value: string) => {
    setEventCode(value);
  };

  if (hasError) return null;

  return (
    <>
      <SectionHeader data-testid="events-dropdown">
        <br />
        <Select
          options={filterItems}
          onChange={(evt: any) => handleFilterChange(evt.value)}
          maxMenuHeight={300}
          styles={{
            control: (base) => ({
              ...base,
              width: '250px',
            }),
            menu: (base) => ({
              ...base,
              width: '250px',
            }),
          }}
        />
      </SectionHeader>
      {loading ? (
        <AlignCenter>
          <SpinnerGrid color="#000" height={45} width={45} wrapperClass="d-block" visible={loading} />
        </AlignCenter>
      ) : (
        <EventContent events={events} />
      )}
    </>
  );
}
