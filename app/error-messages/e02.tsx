import { getEndSessionUrl } from 'utils/openid';

export function getTemplate() {
  const title = 'An error has occurred: E02.';
  const content = (
    <text transform="translate(228 245)" fill="#777" fontSize="18" fontFamily="OpenSans, Open Sans">
      <tspan x="0" y="0">
        Please try{' '}
      </tspan>
      <tspan fill="#006fc4">
        <a href={getEndSessionUrl()} title="Clear Session">
          clearing your token
        </a>
      </tspan>
      <tspan>, and if the problem</tspan>
      <tspan x="0" y="26">
        persists, contact our SSO support team by{' '}
      </tspan>
      <tspan y="52" x="0" fill="#006fc4">
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
      <tspan y="26">.</tspan>
    </text>
  );

  return [title, content];
}
