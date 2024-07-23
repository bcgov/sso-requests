export function getTemplate() {
  const title = 'Service is temporarily unavailable';
  const content = (
    <text transform="translate(228 245)" fill="#777" fontSize="18" fontFamily="OpenSans, Open Sans">
      <tspan x="0" y="0">
        The server is temorarily unable to service your request due to maintenance
      </tspan>
      <tspan x="0" y="25">
        downtime or capacity problems. Please try again later.
      </tspan>
      <tspan x="0" y="50">
        If the problem persists, contact our SSO support team by{' '}
      </tspan>
      <tspan y="75" x="0" fill="#006fc4">
        <a href="https://chat.developer.gov.bc.ca/channel/sso" target="_blank" title="Rocket Chat" rel="noreferrer">
          Rocket.Chat
        </a>
      </tspan>
      <tspan y="75"> or </tspan>
      <tspan y="75" fill="#006fc4">
        <a href="mailto:bcgov.sso@gov.bc.ca" title="Pathfinder SSO" target="_blank" rel="noreferrer">
          Email
        </a>
      </tspan>
      <tspan y="26">.</tspan>
    </text>
  );

  return [title, content];
}
