import React from 'react';
import styled from 'styled-components';
import Link from '@button-inc/bcgov-theme/Link';
import { FORM_TOP_SPACING } from 'styles/theme';
import { docusaurusURL, formatWikiURL } from '@app/utils/constants';

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
  const wikiUrl = formatWikiURL();
  return (
    <Container>
      <h2>Requirements</h2>
      <StyledList>
        <li>Keep your email address active, and if you are not using your integration, clean it up</li>
        <li>
          If you are not using your client app configuration,{' '}
          <Link external href="https://chat.developer.gov.bc.ca/channel/sso/">
            ask us at rocketchat
          </Link>{' '}
          for the detailed info
        </li>
        <li>
          In order to reduce your application's potential exposure, we recommend using a unique integration for each
          application.
        </li>
      </StyledList>
      <h2>We&apos;re a Community</h2>
      <StyledList>
        <li>
          As part of a community, we can solve things together and quickly. Please join the{' '}
          <Link external href="https://chat.developer.gov.bc.ca/channel/sso/">
            #SSO channel on Rocket.Chat
          </Link>
        </li>
        <li>
          Please follow the{' '}
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
            <SubItem>if you need to conduct load testing or security scans please do in TEST only</SubItem>
          </ul>
        </li>
      </StyledList>

      <h2>What&apos;s included in the service</h2>
      <StyledList>
        <li>
          The Standard realm is configured to meet the general needs of the community. Currently, custom configurations,
          such as scopes or flows, are not available
        </li>
      </StyledList>
      <h2>Understanding the service level</h2>
      <StyledList>
        <li>
          Our service is available 24/7, except during planned outages within the Kamloops and Calgary data centres.
          Planned outages are communicated through{' '}
          <Link external href="https://chat.developer.gov.bc.ca/channel/sso/">
            RocketChat
          </Link>
          .
        </li>
        <li>
          Our regular business hours are weekdays from 9:00 am to 5:00 pm Pacific Time, excluding statutory holidays.
          Client provisioning questions and requests will be reviewed and handled during normal business hours. After
          hours support is provided by the Pathfinder SSO team, and is only available for service outages and other
          incidents that impact the service.
        </li>
        <li>
          To learn more about our service uptime monitoring, please visit our{' '}
          <Link external href={formatWikiURL('Pathfinder-Uptime-Monitoring/')}>
            uptime page on our wiki
          </Link>{' '}
          and join our{' '}
          <Link external href="https://digital.gov.bc.ca/sso-notifications/">
            newsletter
          </Link>{' '}
          to receive important updates on the service and any outages.
        </li>
      </StyledList>
      <h2>Contact Us</h2>
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
        <li>
          Visit our documentation: one for{' '}
          <Link external href={wikiUrl}>
            business
          </Link>{' '}
          areas and one for{' '}
          <Link external href={docusaurusURL}>
            technical
          </Link>{' '}
          areas.
        </li>
      </StyledList>
    </Container>
  );
}
