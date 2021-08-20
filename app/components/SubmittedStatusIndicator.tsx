import { ProgressBar } from 'react-bootstrap';
import Title from 'components/SHeader3';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import styled from 'styled-components';
import { LINK_COLOR, SECONDARY_BLUE } from 'styles/theme';
import HelpText from 'components/HelpText';

interface Props {
  status?: string;
  updatedAt?: string;
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

export default function SubmittedStatusIndicator({ status, updatedAt }: Props) {
  const hasError = getStatusFailure(status);
  const statusMessage = getStatusMessage(status);
  const formattedUpdatedAt = new Date(updatedAt || '').toLocaleString();
  console.log(updatedAt, typeof updatedAt);

  return (
    <>
      <Title>
        <StyledIcon icon={faInfoCircle} />
        SSO Team is working on your request - Expected processing time is 45 mins
      </Title>
      <SubTitle>{statusMessage}</SubTitle>
      <SProgressBar now={getPercent(status)} animated variant={hasError ? 'danger' : undefined} />
      <HelpText>Last updated at {formattedUpdatedAt}</HelpText>
      {hasError && (
        <p>
          Please contact our SSO support team by{' '}
          <SLink href="https://chat.developer.gov.bc.ca/channel/sso" target="_blank" title="Rocket Chat">
            Rocket.Chat
          </SLink>{' '}
          or{' '}
          <SLink href="mailto:zorin.samji@gov.bc.ca" title="Pathfinder SSO" target="blank">
            Email us
          </SLink>{' '}
        </p>
      )}
    </>
  );
}
