import React, { useEffect, useState } from 'react';
import { getEvents } from 'services/event';
import { Event } from 'interfaces/Event';
import Loader from 'components/PageLoader';
import EventContent from 'components/EventContent';

interface Props {
  requestId?: number;
}

export default function UserEventPanel({ requestId }: Props) {
  const [loading, setLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [events, setEvents] = useState<Event[]>([]);

  const getData = async () => {
    if (!requestId) return;
    setLoading(true);
    const [data, err] = await getEvents({
      requestId,
      eventCode: 'request-update-success',
    });
    if (err) {
      setHasError(true);
    } else if (data) {
      setEvents(data.rows as Event[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    getData();
  }, [requestId]);

  if (loading) return <Loader />;

  return (
    <>
      <EventContent events={events} />
    </>
  );
}
