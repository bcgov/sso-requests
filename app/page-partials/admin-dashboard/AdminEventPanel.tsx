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
