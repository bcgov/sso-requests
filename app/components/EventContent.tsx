import styled from 'styled-components';
import { Event } from 'interfaces/Event';
import FormatChangeEventDetails from './FormatChangeEventDetails';
import { actionLabel, eventActor, eventOutcome, eventTarget } from '@app/helpers/events';

const Content = styled.div`
  margin-top: 20px;
  max-height: calc(100vh - 250px);
  overflow: auto;
`;

const OUTCOME_COLOURS: Record<string, string> = {
  requested: '#5f6368',
  success: '#2e8540',
  failure: '#d8292f',
  superseded: '#a8a8a8',
  submitted: '#5f6368',
};

const OutcomeLabel = styled.span<{ outcome: string }>`
  color: ${(props) => OUTCOME_COLOURS[props.outcome] || 'inherit'};
  font-weight: bold;
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
        events.map((event: Event) => {
          const outcome = eventOutcome(event);
          const target = eventTarget(event);
          return (
            <div key={event.id}>
              <div>
                <strong>Event: </strong>
                {actionLabel(event.eventCode || '')} <OutcomeLabel outcome={outcome}>({outcome})</OutcomeLabel>
              </div>
              <div>
                <strong>Created Time: </strong>
                {getReadableDateTime(event.createdAt)}
              </div>
              <div>
                <strong>Created By: </strong>
                {eventActor(event)}
              </div>
              {target && (
                <div>
                  <strong>Target: </strong>
                  {target}
                </div>
              )}
              {event.environment && (
                <div>
                  <strong>Environment: </strong>
                  {event.environment}
                </div>
              )}

              {event.details && Object.keys(event.details).length > 0 && (
                <>
                  <div>
                    <strong>Details</strong>
                  </div>
                  {event.eventCode === 'request-update' && Array.isArray(event.details.changes) ? (
                    <>
                      <FormatChangeEventDetails changes={event.details.changes} />
                      <strong>Comment: </strong>
                      <p>{event.details.comment}</p>
                    </>
                  ) : (
                    <pre>
                      <code>{JSON.stringify(event.details, undefined, 2)}</code>
                    </pre>
                  )}
                </>
              )}

              <hr />
            </div>
          );
        })
      )}
    </Content>
  );
}
