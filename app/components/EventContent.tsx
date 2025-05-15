import React from 'react';
import styled from 'styled-components';
import { Event } from 'interfaces/Event';
import FormatChangeEventDetails from './FormatChangeEventDetails';

const Content = styled.div`
  margin-top: 20px;
  max-height: calc(100vh - 250px);
  overflow: auto;
`;

interface Props {
  events: Event[];
}

const getReadableDateTime = (date: any) => {
  return new Date(date).toLocaleString();
};

export default function EventContent({ events }: Props) {
  return (
    <Content>
      {!events || events.length === 0 ? (
        <div>No events found</div>
      ) : (
        events.map((event: Event) => (
          <div key={event.id}>
            <div>
              <strong>Event Code: </strong>
              {event.eventCode}
            </div>
            <div>
              <strong>Created Time: </strong>
              {getReadableDateTime(event.createdAt)}
            </div>
            {event.idirUserDisplayName && (
              <>
                <div>
                  <strong>Created By: </strong>
                  {event.idirUserDisplayName}
                </div>
              </>
            )}

            {event.details && (
              <>
                <div>
                  <strong>Details</strong>
                </div>
                {event.eventCode === 'request-update-success' ? (
                  <>
                    <FormatChangeEventDetails changes={event.details.changes} />
                    <strong>Comment: </strong>
                    <p>{event.details.comment}</p>
                  </>
                ) : (
                  <pre>
                    <code>{JSON.stringify(event.details || {}, undefined, 2)}</code>
                  </pre>
                )}
              </>
            )}

            <hr />
          </div>
        ))
      )}
    </Content>
  );
}
