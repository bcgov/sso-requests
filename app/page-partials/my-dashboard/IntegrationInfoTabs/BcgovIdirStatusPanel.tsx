import { ApprovalContext, ApprovedAndAvailable, Circle, StyledLi, SubTitle } from './shared';
import StatusList from 'components/StatusList';

interface Props {
  approvalContext: ApprovalContext;
}

function BcgovIdirStatusPanel({ approvalContext }: Readonly<Props>) {
  const { hasProd, hasBcgovIdir, bcgovidirApproved } = approvalContext;
  if (!hasProd || !hasBcgovIdir) return null;

  return (
    <>
      <br />
      <SubTitle>Access to BCGOV IDIR Prod</SubTitle>
      <br />
      {bcgovidirApproved ? (
        <ApprovedAndAvailable />
      ) : (
        <StatusList>
          <StyledLi>
            <p>Production approval is pending</p>
            <Circle />
          </StyledLi>
        </StatusList>
      )}
    </>
  );
}

export default BcgovIdirStatusPanel;
