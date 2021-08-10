import styled from 'styled-components';
import { FORM_TOP_SPACING, DEFAULT_FONT_SIZE } from 'styles/theme';

const Title = styled.h2`
  text-transform: uppercase;
  margin-bottom: 0;
  font-size: ${DEFAULT_FONT_SIZE};
`;

const StyledList = styled.ul`
  & li {
    margin: 0;
  }
`;

const Container = styled.div`
  margin-top: ${FORM_TOP_SPACING};
`;

function TermsAndConditions() {
  return (
    <Container>
      <Title>We&apos;re a Community</Title>
      <StyledList>
        <li>
          As part of a community, we can solve things together and quickly. Please join the #SSO channel on Rocket.Chat
        </li>
        <li>Coordinate load testing with the Pathfinder SSO Team, and please only use the Test environment</li>
        <li>
          The SSO Service is multitenancy; please coordinate with the Pathfinder SSO Team if you predict moderate or
          high loads. Contact options are available on the toolbar.
        </li>
        <li>
          Please follow the BC Government digital standards (
          <a href="https://digital.gov.bc.ca/resources/digital-principles" target="_blank" rel="noreferrer">
            link
          </a>
          )
        </li>
      </StyledList>
      <Title>Understanding the service level</Title>
      <StyledList>
        <li>
          The SSO service level is &quot;best-effort&quot; during business hours (Monday to Friday, 9am to 5pm), and
          after-hours resolution time is not guaranteed
        </li>
        <li>Please take this into account if you have a &quot;critical&quot; application</li>
        <li>From time to time, we may contact you to confirm if your configuration is needed</li>
      </StyledList>
      <Title>What&apos;s included in the service</Title>
      <StyledList>
        <li>
          The Standard realm is configured to meet the general needs of the community. Currently, custom configurations,
          such as scopes or flows, are not available
        </li>
      </StyledList>
      <Title>Requirements</Title>
      <StyledList>
        <li>Keep your email address active, and if you are not using your realm, clean it up</li>
        <li>Let us know if you do not need the client app configuration</li>
      </StyledList>
    </Container>
  );
}

export default TermsAndConditions;
