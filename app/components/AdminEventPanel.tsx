import React, { useState, useEffect } from 'react';
import Dropdown from '@button-inc/bcgov-theme/Dropdown';
import Grid from '@button-inc/bcgov-theme/Grid';
import styled from 'styled-components';
import Loader from 'react-loader-spinner';
import SectionHeader from 'components/SectionHeader';
import { Event } from 'interfaces/Event';
import { getEvents } from 'services/event';
import { SUBTITLE_FONT_SIZE } from 'styles/theme';

const Title = styled.h3`
  color: #777777;
  font-size: ${SUBTITLE_FONT_SIZE};
  font-weight: bold;
  margin-bottom: 0;
`;

const AlignCenter = styled.div`
  text-align: center;
`;

interface Props {
  requestId: number;
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

export default function AdminEventPanel({ requestId }: Props) {
  const [eventType, setEventType] = useState('all');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  const getData = async () => {
    setLoading(true);

    const [data, err] = await getEvents({
      requestId,
      eventType,
      // order,
      // limit,
      // page,
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
  }, [eventType]);

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEventType(event.target.value);
  };

  if (hasError) return null;

  return (
    <>
      <SectionHeader>
        <Grid cols={12}>
          <Grid.Row collapse="992" gutter={[]} align="center">
            <Grid.Col span={5}>
              <Title>Events</Title>
            </Grid.Col>
            <Grid.Col span={7} style={{ textAlign: 'right' }}>
              <Dropdown
                style={{ display: 'inline-block', width: '250px' }}
                value={eventType}
                onChange={handleFilterChange}
              >
                {generateOptions(filterItems)}
              </Dropdown>
            </Grid.Col>
          </Grid.Row>
        </Grid>
      </SectionHeader>
      {loading ? (
        <AlignCenter>
          <Loader type="Grid" color="#000" height={45} width={45} visible={loading} />
        </AlignCenter>
      ) : (
        events.map((event: Event) => {
          <>
            <div>Event Code: {event.eventCode}</div>
            <div>Time: {event.createdAt}</div>
            <div>Details</div>
            <pre>
              <code>{event.details}</code>
            </pre>
          </>;
        })
      )}
    </>
  );
}
