import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';

export const SubTitle = styled.div`
  font-size: 18px;
  font-weight: bold;
  color: #000;
  border-bottom: 1px solid gray;
`;

export const FlexStartBox = styled.div`
  display: flex;
  justify-content: flex-start;

  & > *:nth-child(1) {
    margin-right: 5px;
  }
`;

const CIRCLE_DIAMETER = '15px';
const CIRCLE_MARGIN = '0';

export const Circle = styled.div`
  height: ${CIRCLE_DIAMETER};
  width: ${CIRCLE_DIAMETER};
  border-radius: ${CIRCLE_DIAMETER};
  margin: ${CIRCLE_MARGIN};
  margin-left: 0;
  border: 2px solid #b3b3b3;
`;

export const StyledLi = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0;

  & p {
    max-width: 90%;
    margin: 5px 0;
  }
`;

export const ApprovedAndAvailable = () => (
  <FlexStartBox>
    <div>
      <FontAwesomeIcon icon={faCheckCircle} color="#2E8540" />
    </div>
    <div>
      <span>Your integration is approved and available.</span>
    </div>
  </FlexStartBox>
);

export interface ApprovalContext {
  hasProd: boolean;
  hasBceid: boolean;
  hasGithub: boolean;
  hasDigitalCredential: boolean;
  hasBcServicesCard: boolean;
  bcServicesCardApproved: boolean;
  bceidApproved: boolean;
  githubApproved: boolean;
  awaitingBceidProd: boolean;
  awaitingGithubProd: boolean;
  awaitingBcServicesCardProd: boolean;
  bceidProdApplying: boolean;
  githubProdApplying: boolean;
  bcServicesCardProdApplying: boolean;
}
