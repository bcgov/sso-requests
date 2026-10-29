import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Grid as SpinnerGrid } from 'react-loader-spinner';
import SectionHeader from 'components/SectionHeader';
import { Event } from 'interfaces/Event';
import { getEvents } from 'services/event';
import EventContent from 'components/EventContent';
import Select from 'react-select';
import { AUDIT_ACTIONS, LEGACY_AUDIT_ACTIONS, LEGACY_OUTCOMES, OUTCOMES } from '@sso/audit';
import { actionLabel } from '@app/helpers/events';

const AlignCenter = styled.div`
  text-align: center;
`;

interface Props {
  requestId?: number;
}

// Filter by action; codes from before @sso/audit that are no longer written are still listed so older rows
// remain findable.
const actionFilterItems = [
  { value: 'all', label: 'All Events' },
  ...[...AUDIT_ACTIONS, ...LEGACY_AUDIT_ACTIONS].map((action) => ({ value: action, label: actionLabel(action) })),
];

const outcomeFilterItems = [
  { value: 'all', label: 'All Outcomes' },
  ...[...OUTCOMES, ...LEGACY_OUTCOMES].map((outcome) => ({ value: outcome, label: actionLabel(outcome) })),
];

const selectStyles = {
  control: (base: any) => ({ ...base, width: '250px' }),
  menu: (base: any) => ({ ...base, width: '250px' }),
};

export default function AdminEventPanel({ requestId }: Props) {
  const [eventCode, setEventCode] = useState('all');
  const [outcome, setOutcome] = useState('all');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  const getData = async () => {
    if (!requestId) return;
    setLoading(true);

    const [data, err] = await getEvents({
      requestId,
      eventCode,
      outcome,
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
  }, [requestId, eventCode, outcome]);

  if (hasError) return null;

  return (
    <>
      <SectionHeader data-testid="events-dropdown">
        <br />
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Select
            options={actionFilterItems}
            onChange={(evt: any) => setEventCode(evt.value)}
            maxMenuHeight={300}
            styles={selectStyles}
          />
          <Select
            options={outcomeFilterItems}
            onChange={(evt: any) => setOutcome(evt.value)}
            maxMenuHeight={300}
            styles={selectStyles}
            aria-label="Filter by outcome"
          />
        </div>
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
