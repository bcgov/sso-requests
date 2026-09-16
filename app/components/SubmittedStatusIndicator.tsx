import styled from 'styled-components';
import { ProgressBar } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';
import DefaultTitle from 'components/SHeader3';
import StatusList from 'components/StatusList';
import { ErrorMessage, InfoMessage } from 'components/MessageBox';
import Link from '@app/components/Link';
import {
  RequestWorkflowStepState,
  RequestWorkflowProgress,
  RequestWorkflowProgressStep,
} from 'interfaces/WorkflowProgress';

const Title = styled(DefaultTitle)`
  border-bottom: none;
  margin-top: 10px;
`;

const SubTitle = styled(Title)`
  font-size: 14px;
`;

const SProgressBar = styled(ProgressBar)`
  margin-bottom: 10px;
`;

const HelpText = styled.p`
  font-size: 12px;
  color: #606060;
  margin-top: 5px;
`;

const SETTLED_STATES: Set<RequestWorkflowStepState> = new Set([
  'COMPLETED',
  'SKIPPED',
  'FAILED',
] as RequestWorkflowStepState[]);

const stepIcon = (state: RequestWorkflowStepState) => {
  switch (state) {
    case 'COMPLETED':
      return <FontAwesomeIcon icon={faCheckCircle} color="#00C45B" title="completed" />;
    case 'FAILED':
      return <FontAwesomeIcon icon={faTimesCircle} color="#FF0000" title="failed" />;
    case 'RUNNING':
      return <FontAwesomeIcon icon={faSpinner} color="#B2B2B2" spin title="in progress" />;
    default:
      return <FontAwesomeIcon icon={faSpinner} color="#D4D4D4" title="pending" />;
  }
};

const stepText = (step: RequestWorkflowProgressStep) =>
  step.state === 'FAILED' ? `${step.label} - failed` : step.label;

export const getProgressPercent = (progress: RequestWorkflowProgress) => {
  if (progress.steps.length === 0) return 0;
  const settled = progress.steps.filter((step) => SETTLED_STATES.has(step.state)).length;
  return Math.round((settled / progress.steps.length) * 100);
};

const getStatusMessage = (progress: RequestWorkflowProgress) => {
  if (progress.state === 'COMPLETED') return 'Your integration has been processed successfully.';
  if (progress.state === 'FAILED') return 'An error has occurred.';

  const active = progress.steps.find((step) => !SETTLED_STATES.has(step.state));
  return active ? `${active.label}...` : 'Processing your request...';
};

interface Props {
  progress: RequestWorkflowProgress;
  title?: string;
}

/**
 * Live view of the integration submission workflow. Each entry maps to a persisted workflow step, so the
 * progress shown here survives a page refresh or a backend restart.
 */
function SubmittedStatusIndicator({ progress, title }: Readonly<Props>) {
  const hasFailed = progress.state === 'FAILED';
  const isRetrying = progress.steps.some((step) => step.attempts > 1) && !hasFailed;

  return (
    <div data-testid="submission-progress">
      {title && <Title>{title}</Title>}
      <SubTitle data-testid="submission-progress-message">{getStatusMessage(progress)}</SubTitle>
      <SProgressBar
        now={getProgressPercent(progress)}
        animated={!hasFailed}
        variant={hasFailed ? 'danger' : undefined}
      />

      <StatusList>
        {progress.steps.map((step) => (
          <li key={step.name} data-testid={`submission-progress-step-${step.name}`}>
            {stepText(step)}
            {stepIcon(step.state)}
          </li>
        ))}
      </StatusList>

      {isRetrying && (
        <InfoMessage>
          A step did not succeed on the first attempt and is being retried automatically. No action is needed.
        </InfoMessage>
      )}

      {hasFailed && (
        <ErrorMessage>
          <div>
            We could not complete your integration request
            {progress.failedStep ? ` (failed at: ${progress.failedStep})` : ''}. The steps that already succeeded are
            left in place. Please contact the SSO team on{' '}
            <Link external href="https://chat.developer.gov.bc.ca/channel/sso">
              Rocket.Chat
            </Link>{' '}
            or by <Link href="mailto:bcgov.sso@gov.bc.ca">email</Link> and quote reference{' '}
            <strong>{progress.correlationId}</strong>.
          </div>
        </ErrorMessage>
      )}

      <HelpText>Reference: {progress.correlationId}</HelpText>
    </div>
  );
}

export default SubmittedStatusIndicator;
