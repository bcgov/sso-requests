export function getMaintenanceTemplate() {
  const title = "We'll be back soon";
  const content = (
    <text transform="translate(228 245)" fill="#777" fontSize="18" fontFamily="OpenSans, Open Sans">
      <tspan x="0" y="0">
        The CSS app is currently in maintenance mode.
      </tspan>
      <tspan x="0" y="26">
        You can check the status of both the app and Keycloak at:{' '}
      </tspan>
      <tspan y="52" x="0" fill="#006fc4">
        <a href="https://chat.developer.gov.bc.ca/channel/sso" target="_blank" title="Rocket Chat" rel="noreferrer">
          Rocket.Chat
        </a>
      </tspan>
      <tspan y="52"> or by sending our team an </tspan>
      <tspan y="52" fill="#006fc4">
        <a href="mailto:bcgov.sso@gov.bc.ca" title="Pathfinder SSO" target="_blank" rel="noreferrer">
          e-mail
        </a>
      </tspan>
      <tspan y="26">.</tspan>
    </text>
  );

  return [title, content];
}
