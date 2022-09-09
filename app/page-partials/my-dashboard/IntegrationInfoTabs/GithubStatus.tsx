import React from 'react';
import { Integration } from 'interfaces/Request';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import Link from '@button-inc/bcgov-theme/Link';
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
          Requirements email sent to IDIM
          <FontAwesomeIcon icon={faCheckCircle} color="#00C45B" />
        </StyledLi>
        <StyledLi>
          <p>
            Please reach out to IDIM if you do not hear back within the next 2-3 business days (
            <Link href="mailto:IDIM.Consulting@gov.bc.ca">IDIM.Consulting@gov.bc.ca</Link>)
          </p>
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
