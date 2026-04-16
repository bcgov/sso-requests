import { useEffect, useState } from 'react';
import { getEvents } from 'services/event';
import { Event } from 'interfaces/Event';
import Loader from 'components/PageLoader';
import EventContent from 'components/EventContent';
import Alert from 'react-bootstrap/Alert';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

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
      clearNotifications: true,
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
  }, [requestId]);

  if (hasError)
    return (
      <div style={{ margin: '1rem 0rem' }}>
        <Alert variant="warning">
          <FontAwesomeIcon icon={faTriangleExclamation} /> Failed to load details.
        </Alert>
      </div>
    );
  if (loading) return <Loader />;

  return (
    <>
      <EventContent events={events} />
    </>
  );
}
