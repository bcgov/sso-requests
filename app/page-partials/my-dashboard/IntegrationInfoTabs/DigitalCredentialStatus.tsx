import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import StatusList from 'components/StatusList';
import { Circle, StyledLi } from './shared';
import Link from '@button-inc/bcgov-theme/Link';

export default function DigitalCredentialStatus() {
  return (
    <StatusList>
      <StyledLi>
        Requirements email sent to DIT
        <FontAwesomeIcon icon={faCheckCircle} color="#00C45B" />
      </StyledLi>
      <StyledLi>
        <p>
          Please reach out to DIT if you do not hear back within the next 2-3 business days (
          <Link href="mailto:ditp.support@gov.bc.ca">ditp.support@gov.bc.ca</Link>).
        </p>
        <FontAwesomeIcon icon={faEnvelope} color="#b3b3b3" />
      </StyledLi>
      <StyledLi>
        <p>Access to prod</p>
        <Circle />
      </StyledLi>
    </StatusList>
  );
}
