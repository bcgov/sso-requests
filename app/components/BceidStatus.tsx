import React from 'react';
import { Request } from 'interfaces/Request';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faMinusCircle } from '@fortawesome/free-solid-svg-icons';
import Link from '@button-inc/bcgov-theme/Link';

const Section = styled.p`
  border-bottom: 2px solid #7d7d7d;
  display: flex;
  justify-content: space-between;
  padding-bottom: 5px;
`;

interface Props {
  request: Request;
}

export default function Bceidstatus({ request }: Props) {
  return (
    <>
      <h2>Expected processing time for prod</h2>
      <Section>
        Introduction email submitted
        <FontAwesomeIcon icon={faCheckCircle} color="#00C45B" size="2x" />
      </Section>
      <Section>
        <p>
          Please reach out to IDIM if you do not hear back within the next 2-3 business days (
          <Link href="mailto:IDIM.Consulting@gov.bc.ca">IDIM.Consulting@gov.bc.ca</Link>)
        </p>
      </Section>
      <Section>
        Access to prod
        <FontAwesomeIcon icon={faMinusCircle} size="2x" color="grey" />
      </Section>
    </>
  );
}
