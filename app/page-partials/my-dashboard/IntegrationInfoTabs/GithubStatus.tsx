import React from 'react';
import { Integration } from 'interfaces/Request';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import StatusList from 'components/StatusList';
import { Circle, StyledLi } from './shared';

interface Props {
  integration: Integration;
}

export default function Bceidstatus({ integration }: Props) {
  return (
    <>
      <StatusList>
        <StyledLi>
          Requirements email sent to GCIO
          <FontAwesomeIcon icon={faCheckCircle} color="#00C45B" />
        </StyledLi>
        <StyledLi>
          <p>Access to prod</p>
          <Circle />
        </StyledLi>
      </StatusList>
    </>
  );
}
