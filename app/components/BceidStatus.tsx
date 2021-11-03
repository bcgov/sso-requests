import React from 'react';
import { Request } from 'interfaces/Request';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import Link from '@button-inc/bcgov-theme/Link';
import StatusList from 'components/StatusList';
import Title from 'components/SHeader3';

interface Props {
  request: Request;
}

const CIRCLE_DIAMETER = '15px';
const CIRCLE_MARGIN = '0';

const Circle = styled.div`
  height: ${CIRCLE_DIAMETER};
  width: ${CIRCLE_DIAMETER};
  line-height: ${CIRCLE_DIAMETER};
  border-radius: ${CIRCLE_DIAMETER};
  margin: ${CIRCLE_MARGIN};
  margin-left: 0;
  border: 2px solid #b3b3b3;
`;

const SubTitle = styled(Title)`
  margin-top: 20px;
  border-bottom: none;
`;

export default function Bceidstatus({ request }: Props) {
  return (
    <>
      <SubTitle>Expected processing time for prod</SubTitle>
      <StatusList>
        <li>
          Introduction email submitted
          <FontAwesomeIcon icon={faCheckCircle} color="#00C45B" />
        </li>
        <li>
          Please reach out to IDIM if you do not hear back within the next 2-3 business days (
          <Link href="mailto:IDIM.Consulting@gov.bc.ca">IDIM.Consulting@gov.bc.ca</Link>)
          <FontAwesomeIcon icon={faEnvelope} color="#b3b3b3" />
        </li>
        <li>
          Access to prod
          <Circle className="icon" />
        </li>
      </StatusList>
    </>
  );
}
