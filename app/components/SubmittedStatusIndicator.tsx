import { useEffect, useState } from 'react';
import { ProgressBar } from 'react-bootstrap';
import DefaultTitle from 'components/SHeader3';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';
import Link from '@button-inc/bcgov-theme/Link';
import { Button } from '@bcgov-sso/common-react-components';
import styled from 'styled-components';
import { LINK_COLOR } from 'styles/theme';
import HelpText from 'components/HelpText';
import { Integration } from 'interfaces/Request';
import getConfig from 'next/config';
import StatusList from 'components/StatusList';
import { InfoMessage, ErrorMessage } from 'components/MessageBox';
import { withTopAlert, TopAlert } from 'layout/TopAlert';
import { resubmitRequest } from 'services/request';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { app_env } = publicRuntimeConfig;

interface Props {
  integration: Integration;
  title?: string;
  alert: TopAlert;
}

const Title = styled(DefaultTitle)`
  border-bottom: none;
  margin-top: 10px;
`;

const SubTitle = styled(Title)`
  font-size: 14px;
`;

const SLink = styled.a`
  color: ${LINK_COLOR};
`;

const SProgressBar = styled(ProgressBar)`
  margin-bottom: 10px;
`;

const getPercent = (status?: string) => {
  switch (status) {
    case 'submitted':
      return 0;
    case 'pr':
      return 33;
    case 'planned':
      return 66;
    default:
      return 100;
  }
};

const getStatusMessage = (status?: string) => {
  switch (status) {
    case 'submitted':
      return 'Process request submitted...';
    case 'pr':
      return 'Pull request created...';
    case 'planned':
      return 'Terraform plan succeeded...';
    case 'prFailed':
    case 'planFailed':
    case 'applyFailed':
      return 'An error has occurred';
    default:
      return '';
  }
};

const getStatusFailure = (status?: string) => {
  switch (status) {
    case 'prFailed':
    case 'planFailed':
    case 'applyFailed':
      return true;
    default:
      return false;
  }
};

const getStatusStatusCode = (status?: string) => {
  switch (status) {
    case 'submitted':
      return 0;
    case 'pr':
      return 1;
    case 'prFailed':
      return 2;
    case 'planned':
      return 3;
    case 'planFailed':
      return 4;
    case 'applied':
      return 5;
    case 'applyFailed':
      return 6;
    default:
      return 0;
  }
};

const minToMs = (min: number) => min * 60000;

export function IntegrationProgressStatus({ integration }: { integration: Integration }) {
  const { status, updatedAt } = integration;
  const hasError = getStatusFailure(status);
  const updatedAtDate = new Date(updatedAt || '');
  const formattedUpdatedAt = updatedAtDate.toLocaleString();

  return (
    <>
      <SProgressBar now={getPercent(status)} animated variant={hasError ? 'danger' : undefined} />
      <HelpText>Last updated at {formattedUpdatedAt}</HelpText>
    </>
  );
}

function SubmittedStatusIndicator({ integration, title, alert }: Props) {
  const { id, status, updatedAt, prNumber } = integration;
  const [isWaitingTooLong, setIsWaitingTooLong] = useState(false);
  const hasError = getStatusFailure(status);
  const statusMessage = getStatusMessage(status);
  const updatedAtDate = new Date(updatedAt || '');

  useEffect(() => {
    const waiting = minToMs(20) < new Date().getTime() - updatedAtDate.getTime();
    setIsWaitingTooLong(waiting);
  }, [integration]);

  // Step 1.
  const statusItems = [
    <li key="1">
      Process request submitted
      <FontAwesomeIcon icon={faCheckCircle} color="#00C45B" />
    </li>,
  ];

  const code = getStatusStatusCode(status);

  // Step 2.
  if (code < 1) {
    statusItems.push(
      <li key="2">
        Pull request created
        <FontAwesomeIcon icon={faSpinner} color="#B2B2B2" spin />
      </li>,
    );
  } else {
    if (code === 2) {
      statusItems.push(
        <li key="2">
          Pull request creation failed
          <FontAwesomeIcon icon={faTimesCircle} color="#FF0000" />
        </li>,
      );
    } else {
      const prLink =
        app_env === 'production'
          ? `https://github.com/bcgov/sso-terraform/pull/${prNumber}`
          : `https://github.com/bcgov/sso-terraform-dev/pull/${prNumber}`;

      statusItems.push(
        <li key="2">
          Pull request created (
          <Link external href={prLink}>
            link
          </Link>
          )
          <FontAwesomeIcon icon={faCheckCircle} color="#00C45B" />
        </li>,
      );
    }
  }

  // Step 3.
  if (code < 3) {
    statusItems.push(
      <li key="3">
        Terraform plan succeeded
        <FontAwesomeIcon icon={faSpinner} color="#B2B2B2" spin />
      </li>,
    );
  } else {
    if (code === 4) {
      statusItems.push(
        <li key="3">
          Terraform plan failed
          <FontAwesomeIcon icon={faTimesCircle} color="#FF0000" />
        </li>,
      );
    } else {
      statusItems.push(
        <li key="3">
          Terraform plan succeeded
          <FontAwesomeIcon icon={faCheckCircle} color="#00C45B" />
        </li>,
      );
    }
  }

  // Step 4.
  if (code < 5) {
    statusItems.push(
      <li key="4">
        Request processed
        <FontAwesomeIcon icon={faSpinner} color="#B2B2B2" spin />
      </li>,
    );
  } else {
    if (code === 6) {
      statusItems.push(
        <li key="4">
          Request failed
          <FontAwesomeIcon icon={faTimesCircle} color="#FF0000" />
        </li>,
      );
    } else {
      statusItems.push(
        <li key="4">
          Request processed
          <FontAwesomeIcon icon={faCheckCircle} color="#00C45B" />
        </li>,
      );
    }
  }

  let bottomSection = null;
  if (hasError) {
    bottomSection = (
      <ErrorMessage>
        You have an unexpected error. Please contact our SSO support team by{' '}
        <SLink href="https://chat.developer.gov.bc.ca/channel/sso" target="_blank" title="Rocket Chat">
          Rocket.Chat
        </SLink>{' '}
        or{' '}
        <SLink href="mailto:bcgov.sso@gov.bc.ca" title="Pathfinder SSO" target="blank">
          Email us
        </SLink>{' '}
      </ErrorMessage>
    );
  } else if (isWaitingTooLong) {
    bottomSection = (
      <InfoMessage>
        <div>Your integration submission is taking longer than expected, please select resubmit.</div>
        <Button
          variant="bcPrimary"
          size="small"
          type="button"
          onClick={async () => {
            const [result, err] = await resubmitRequest(id as number);
            const variant = err ? 'danger' : 'success';
            const content = err ? 'failed to resubmit the request' : 'resubmitted the request successfully';
            alert.show({
              variant,
              fadeOut: 10000,
              closable: true,
              content,
            });

            setIsWaitingTooLong(false);
          }}
        >
          Resubmit
        </Button>
      </InfoMessage>
    );
  }

  return (
    <>
      {title && <Title>{title}</Title>}
      <SubTitle>{statusMessage}</SubTitle>
      <IntegrationProgressStatus integration={integration} />
      <StatusList>{statusItems}</StatusList>
      {bottomSection}
    </>
  );
}

export default withTopAlert(SubmittedStatusIndicator);
