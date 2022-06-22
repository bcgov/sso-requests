import React, { useState, useEffect } from 'react';
import Dropdown from '@button-inc/bcgov-theme/Dropdown';
import styled from 'styled-components';
import { Grid as SpinnerGrid } from 'react-loader-spinner';
import SectionHeader from 'components/SectionHeader';
import { Event } from 'interfaces/Event';
import { getEvents } from 'services/event';
import EventContent from 'components/EventContent';

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
  { value: 'all', text: 'All Events' },
  { value: 'request-pr-success', text: 'REQUEST_PR_SUCCESS' },
  { value: 'request-pr-failure', text: 'REQUEST_PR_FAILURE' },
  { value: 'request-plan-success', text: 'REQUEST_PLAN_SUCCESS' },
  { value: 'request-plan-failure', text: 'REQUEST_PLAN_FAILURE' },
  { value: 'request-apply-success', text: 'REQUEST_APPLY_SUCCESS' },
  { value: 'request-apply-failure', text: 'REQUEST_APPLY_FAILURE' },
  { value: 'request-create-success', text: 'REQUEST_CREATE_SUCCESS' },
  { value: 'request-create-failure', text: 'REQUEST_CREATE_FAILURE' },
  { value: 'request-update-success', text: 'REQUEST_UPDATE_SUCCESS' },
  { value: 'request-update-failure', text: 'REQUEST_UPDATE_FAILURE' },
  { value: 'request-delete-success', text: 'REQUEST_DELETE_SUCCESS' },
  { value: 'request-delete-failure', text: 'REQUEST_DELETE_FAILURE' },
  { value: 'email-submission-failure', text: 'EMAIL_SUBMISSION_FAILURE' },
];

const generateOptions = (items: FilterItem[]) => (
  <>
    {items.map((item) => (
      <option key={item.value} value={item.value}>
        {item.text}
      </option>
    ))}
  </>
);

const getReadableDateTime = (date: any) => {
  return new Date(date).toLocaleString();
};

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

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEventCode(event.target.value);
  };

  if (hasError) return null;

  return (
    <>
      <SectionHeader>
        <br />
        <Dropdown style={{ display: 'inline-block', width: '250px' }} value={eventCode} onChange={handleFilterChange}>
          {generateOptions(filterItems)}
        </Dropdown>
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
