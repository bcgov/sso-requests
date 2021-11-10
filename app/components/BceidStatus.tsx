import React from 'react';
import { Request } from 'interfaces/Request';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import Link from '@button-inc/bcgov-theme/Link';
import StatusList from 'components/StatusList';
import Title from 'components/SHeader3';
import { ProgressBar } from 'react-bootstrap';
import HelpText from 'components/HelpText';

interface Props {
  request: Request;
}

const CIRCLE_DIAMETER = '15px';
const CIRCLE_MARGIN = '0';

const Circle = styled.div`
  height: ${CIRCLE_DIAMETER};
  width: ${CIRCLE_DIAMETER};
  border-radius: ${CIRCLE_DIAMETER};
  margin: ${CIRCLE_MARGIN};
  margin-left: 0;
  border: 2px solid #b3b3b3;
`;

const SubTitle = styled(Title)`
  margin-top: 20px;
  border-bottom: none;
`;

const StyledLi = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0;

  & p {
    max-width: 90%;
    margin: 5px 0;
  }
`;

export default function Bceidstatus({ request }: Props) {
  const { updatedAt } = request;
  const formattedUpdatedAt = new Date(updatedAt || '').toLocaleString();

  return (
    <>
      <ProgressBar now={50} animated />
      <HelpText>Last updated at {formattedUpdatedAt}</HelpText>

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
