export function getTemplate() {
  const title = "We've run into an issue";
  const content = (
    <text transform="translate(228 245)" fill="#777" fontSize="18" fontFamily="OpenSans, Open Sans">
      <tspan x="0" y="0">
        SSO Pathfinder Team is currently investigating it.
      </tspan>
      <tspan x="0" y="26">
        If the problem persists for 24 hours, contact the team by{' '}
      </tspan>
      <tspan x="0" y="52" fill="#006fc4">
        <a href="https://chat.developer.gov.bc.ca/channel/sso" target="_blank" title="Rocket Chat" rel="noreferrer">
          Rocket.Chat
        </a>
      </tspan>
      <tspan y="52"> or </tspan>
      <tspan y="52" fill="#006fc4">
        <a href="mailto:bcgov.sso@gov.bc.ca" title="Pathfinder SSO" target="_blank" rel="noreferrer">
          Email us
        </a>
      </tspan>
      <tspan y="52">.</tspan>
    </text>
  );

  return [title, content];
}
