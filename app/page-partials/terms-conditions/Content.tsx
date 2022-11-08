import React from 'react';
import styled from 'styled-components';
import Link from '@button-inc/bcgov-theme/Link';
import { FORM_TOP_SPACING, SUBTITLE_FONT_SIZE } from 'styles/theme';

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

export default function FaqItems() {
  return (
    <Container>
      <Title>Requirements</Title>
      <StyledList>
        <li>Keep your email address active, and if you are not using your integration, clean it up</li>
        <li>
          If you are not using your client app configuration{' '}
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
          Please follow the
          <Link external href="https://digital.gov.bc.ca/resources/digital-principles" target="_blank" rel="noreferrer">
            BC Government digital standards
          </Link>
        </li>
        <li>Coordinate load testing with the Pathfinder SSO Team, and please only use the Test environment</li>
        <li>
          The SSO Service is multitenancy; meaning you share with others, so please coordinate with us (
          <Link external href="https://chat.developer.gov.bc.ca/channel/sso/">
            #SSO channel on Rocket.Chat
          </Link>{' '}
          or email at <Link href="mailto:bcgov.sso@gov.bc.ca">bcgov.sso@gov.bc.ca</Link>) :
          <ul>
            <SubItem>
              if you predict moderate or high loads
              <br />
              OR
              <br />
            </SubItem>
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
        <li>Our service is available 24/7, with questions and answers addressed during business hours only.</li>
        <li>Client provisioning requests will be reviewed and handled during normal business hours.</li>
        <li>
          To learn more about our service uptime monitoring, please visit our{' '}
          <Link external href="https://github.com/bcgov/sso-keycloak/wiki/Pathfinder-Uptime-Monitoring">
            uptime page on our wiki
          </Link>
          .
        </li>
      </StyledList>
      <Title>Contact Us</Title>
      <StyledList>
        <li>
          If you have any questions, please reach out to us on{' '}
          <Link external href="https://chat.developer.gov.bc.ca">
            Rocket.Chat
          </Link>{' '}
          or{' '}
          <Link external href="mailto:bcgov.sso@gov.bc.ca">
            Email
          </Link>{' '}
          the Pathfinder SSO Product Owner.
        </li>
      </StyledList>
    </Container>
  );
}
