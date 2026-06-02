import React from 'react';
import Link from '@app/components/Link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import StatusList from 'components/StatusList';
import { Circle, StyledLi } from './shared';

interface Props {
  hasDev: boolean;
  hasTest: boolean;
  hasProd: boolean;
  devBceidApproved: boolean;
  testBceidApproved: boolean;
  bceidApproved: boolean;
}

const EnvApprovalRow = ({ label, approved }: { label: string; approved: boolean }) => (
  <StyledLi>
    <p>{label}</p>
    {approved ? <FontAwesomeIcon icon={faCheckCircle} color="#00C45B" /> : <Circle />}
  </StyledLi>
);

export default function Bceidstatus({
  hasDev,
  hasTest,
  hasProd,
  devBceidApproved,
  testBceidApproved,
  bceidApproved,
}: Readonly<Props>) {
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
        {hasDev && <EnvApprovalRow label="Access to dev" approved={devBceidApproved} />}
        {hasTest && <EnvApprovalRow label="Access to test" approved={testBceidApproved} />}
        {hasProd && <EnvApprovalRow label="Access to prod" approved={bceidApproved} />}
      </StatusList>
    </>
  );
}
