import { ProgressBar } from 'react-bootstrap';
import Title from 'components/SHeader3';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faCheckCircle, faTimesCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';
import Link from '@button-inc/bcgov-theme/Link';
import styled from 'styled-components';
import { LINK_COLOR, SECONDARY_BLUE } from 'styles/theme';
import HelpText from 'components/HelpText';
import { Request } from 'interfaces/Request';
import getConfig from 'next/config';
import StatusList from 'components/StatusList';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { app_env } = publicRuntimeConfig;

interface Props {
  selectedRequest: Request;
}

const StyledIcon = styled(FontAwesomeIcon)`
  color: ${SECONDARY_BLUE};
  padding-right: 5px;
`;

const SubTitle = styled(Title)`
  margin-top: 20px;
  border-bottom: none;
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

export default function SubmittedStatusIndicator({ selectedRequest }: Props) {
  const { status, prNumber, updatedAt } = selectedRequest;

  const hasError = getStatusFailure(status);
  const statusMessage = getStatusMessage(status);
  const formattedUpdatedAt = new Date(updatedAt || '').toLocaleString();

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

  return (
    <>
      <Title>
        <StyledIcon icon={faInfoCircle} />
        We are working on your request - Expected processing time is 20 mins
      </Title>
      <SubTitle>{statusMessage}</SubTitle>
      <SProgressBar now={getPercent(status)} animated variant={hasError ? 'danger' : undefined} />
      <HelpText>Last updated at {formattedUpdatedAt}</HelpText>
      <StatusList>{statusItems}</StatusList>
      <br />
      <p>
        If there is an error or the process takes longer than 20 mins then,
        please contact our SSO support team by{' '}
        <SLink href="https://chat.developer.gov.bc.ca/channel/sso" target="_blank" title="Rocket Chat">
          Rocket.Chat
        </SLink>{' '}
        or{' '}
        <SLink href="mailto:bcgov.sso@gov.bc.ca" title="Pathfinder SSO" target="blank">
          Email us
        </SLink>{' '}
      </p>
    </>
  );
}
