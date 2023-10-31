import React from 'react';
import { Integration } from 'interfaces/Request';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import StatusList from 'components/StatusList';
import { Circle, StyledLi } from './shared';

interface Props {
  integration: Integration;
}

export default function VerifiableCredentialStatus({ integration }: Props) {
  return (
    <>
      <StatusList>
        <StyledLi>
          Requirements email sent to DIT
          <FontAwesomeIcon icon={faCheckCircle} color="#00C45B" />
        </StyledLi>
        <StyledLi>
          <p>Please reach out to DIT if you do not hear back within the next 2-3 business days.</p>
          <FontAwesomeIcon icon={faEnvelope} color="#b3b3b3" />
        </StyledLi>
        <StyledLi>
          <p>Access to prod</p>
          <Circle />
        </StyledLi>
      </StatusList>
    </>
  );
}
