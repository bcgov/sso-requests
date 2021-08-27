import styled from 'styled-components';
import { FORM_TOP_SPACING, SUBTITLE_FONT_SIZE } from 'styles/theme';
import Link from '@button-inc/bcgov-theme/Link';

const Title = styled.h2`
  text-transform: uppercase;
  margin-bottom: 0;
  font-size: ${SUBTITLE_FONT_SIZE};
`;

const StyledList = styled.ul`
  & li {
    margin: 0;
  }
`;

const SubItem = styled.li`
  &&& {
    margin-left: 20px;
  }
`;

const Container = styled.div`
  margin-top: ${FORM_TOP_SPACING};
`;

function TermsAndConditions() {
  return (
    <Container>
      <Title>Requirements</Title>
      <StyledList>
        <li>Keep your email address active, and if you are not using your realm, clean it up</li>
        <li>
          If you are not using your realm/client app configuration{' '}
          <Link external href="https://chat.developer.gov.bc.ca/channel/sso/">
            ask us
          </Link>{' '}
          for help
        </li>
      </StyledList>
      <Title>We&apos;re a Community</Title>
      <StyledList>
        <li>
          As part of a community, we can solve things together and quickly. Please join the{' '}
          <Link external href="https://chat.developer.gov.bc.ca/channel/sso/">
            #SSO channel on Rocket.Chat
          </Link>
        </li>
        <li>
          Please follow the BC Government digital standards (
          <Link external href="https://digital.gov.bc.ca/resources/digital-principles" target="_blank" rel="noreferrer">
            link
          </Link>
          )
        </li>
        <li>Coordinate load testing with the Pathfinder SSO Team, and please only use the Test environment</li>
        <li>
          The SSO Service is multitenancy; meaning you share with others, so please coordinate with us (
          <Link external href="https://chat.developer.gov.bc.ca/channel/sso/">
            #SSO channel on Rocket.Chat
          </Link>{' '}
          or email at <Link href="mailto:bcgov.sso@gov.bc.ca">bcgov.sso@gov.bc.ca</Link>) :
          <ul>
            <SubItem>if you predict moderate or high loads</SubItem>
            OR
            <SubItem>if you need to conduct load testing in TEST only</SubItem>
          </ul>
        </li>
      </StyledList>

      <Title>What&apos;s included in the service</Title>
      <StyledList>
        <li>
          The Standard realm is configured to meet the general needs of the community. Currently, custom configurations,
          such as scopes or flows, are not available
        </li>
      </StyledList>
      <Title>Understanding the service level</Title>
      <StyledList>
        <li>
          We are working towards enterprise service levels and in the interim the SSO Pathfinder service level is
          &quot;best-effort&quot; during business hours (Monday to Friday, 9am to 5pm), and after-hours resolution time
          is not guaranteed
        </li>
        <strong>Please take this into account if you have a &quot;critical&quot; application</strong>
        <li>From time to time, we may contact you to confirm if your configuration is needed</li>
      </StyledList>
    </Container>
  );
}

export default TermsAndConditions;
