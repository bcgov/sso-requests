import styled from 'styled-components';

const Title = styled.h2`
  text-transform: uppercase;
`;

function TermsAndConditions() {
  return (
    <>
      <Title>We&apos;re a Community</Title>
      <ul>
        <li>
          As part of a community, we can solve things together and quickly. Please join the #SSO channel on Rocket.Chat
        </li>
        <li>Coordinate load testing with the Pathfinder SSO Team, and please only use the Test environment</li>
        <li>The SSO Service is multitenancy, please keep request load levels within &quot;x&quot; requests/second</li>
        <li>
          Please follow the BC Government digital standards (
          <a href="https://digital.gov.bc.ca/resources/digital-principles">link</a>)
        </li>
      </ul>
      <Title>Understanding the service level</Title>
      <ul>
        <li>
          The SSO service level is &quot;best-effort&quot; during business hours (Monday to Friday, 9am to 5pm), and
          after-hours resolution time is not guaranteed
        </li>
        <li>Please take this into account if you have a &quot;critical&quot; application</li>
        <li>From time to time, we may contact you to confirm if your configuration is needed</li>
      </ul>
      <Title>What&apos;s included in the service</Title>
      <ul>
        <li>
          The Standard realm is configured to meet the general needs of the community. Currently, custom configurations,
          such as scopes or flows, are not available
        </li>
      </ul>
      <Title>Requirements</Title>
      <ul>
        <li>Keep your email address active, and if you are not using your realm, clean it up</li>
        <li>Let us know if you do not need the client app configuration</li>
      </ul>
    </>
  );
}

export default TermsAndConditions;
