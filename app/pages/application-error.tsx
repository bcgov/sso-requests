import styled from 'styled-components';
import ErrorImage from 'svg/ErrorImage';
import { useRouter } from 'next/router';
import { getEndSessionUrl } from 'utils/openid';

const Container = styled.div`
  text-align: center;
`;

export default function ApplicationError() {
  const router = useRouter();
  const errorCode = router?.query?.error as string;
  let content = null;

  if (errorCode === 'E02') {
    content = (
      <text transform="translate(291 258)" fill="#777" fontSize="18" fontFamily="OpenSans, Open Sans">
        <tspan x="0" y="0">
          Please try{' '}
          <a href={getEndSessionUrl()} title="Clear Session">
            clearning you token
          </a>
          , and if the problem persists,
        </tspan>
        <tspan x="0" y="26">
          contact our SSO support team by{' '}
        </tspan>
        <tspan y="26" fill="#006fc4">
          <a href="https://chat.developer.gov.bc.ca/channel/sso" target="_blank" title="Rocket Chat" rel="noreferrer">
            Rocket.Chat
          </a>
        </tspan>
        <tspan y="26"> or </tspan>
        <tspan y="26" fill="#006fc4">
          <a href="mailto:zorin.samji@gov.bc.ca" title="Pathfinder SSO" target="_blank" rel="noreferrer">
            Email us
          </a>
        </tspan>
        <tspan y="26">.</tspan>
      </text>
    );
  } else if (errorCode === 'E01') {
    content = (
      <text transform="translate(291 258)" fill="#777" fontSize="18" fontFamily="OpenSans, Open Sans">
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
          <a href="mailto:zorin.samji@gov.bc.ca" title="Pathfinder SSO" target="_blank" rel="noreferrer">
            Email us
          </a>
        </tspan>
        <tspan y="52">.</tspan>
      </text>
    );
  }

  return (
    <Container>
      <ErrorImage message={errorCode}>{content}</ErrorImage>
    </Container>
  );
}
