import styled from 'styled-components';
import toLower from 'lodash.tolower';
import ErrorImage from 'svg/ErrorImage';
import { useRouter } from 'next/router';
import { getEndSessionUrl } from 'utils/openid';
import { removeTokens } from 'utils/store';

const Container = styled.div`
  text-align: center;
`;

export default function ApplicationError() {
  const router = useRouter();
  const errorCode = toLower(String(router?.query?.error || ''));
  let title = 'An error has occurred: ';
  let content = null;

  if (errorCode === 'e02') {
    removeTokens();

    title += 'E02.';
    content = (
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
  } else if (errorCode === 'e01') {
    title += 'E01.';
    content = (
      <text transform="translate(228 245)" fill="#777" fontSize="18" fontFamily="OpenSans, Open Sans">
        <tspan x="0" y="0">
          SSO support Team is currently working on this issue.
        </tspan>
        <tspan x="0" y="26">
          If the problem persists for 24 hours,
        </tspan>
        <tspan x="0" y="52">
          contact the team by{' '}
        </tspan>
        <tspan y="52" fill="#006fc4">
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
  } else if (errorCode === 'e03') {
    title = 'Your IDIR account does not have an associated email address.';
    content = (
      <text transform="translate(228 245)" fill="#777" fontSize="18" fontFamily="OpenSans, Open Sans">
        <tspan x="0" y="0">
          Please contact your IDIR account creator or
        </tspan>
        <tspan x="0" y="26">
          the Service Desk to have an email added to this IDIR.
        </tspan>
        <tspan x="130" y="55">
          Service Desk
        </tspan>
        <tspan x="130" y="81">
          Phone: 250-387-7000
        </tspan>
        <tspan x="130" y="107">
          Email:&nbsp;
          <a href="mailto:77000@gov.bc.ca" title="77000@gov.bc.ca" target="_blank" rel="noreferrer">
            77000@gov.bc.ca
          </a>
        </tspan>
      </text>
    );
  }

  return (
    <Container>
      <ErrorImage title={title}>{content}</ErrorImage>
    </Container>
  );
}
