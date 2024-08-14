import React from 'react';
import styled from 'styled-components';
import Link from '@button-inc/bcgov-theme/Link';

const Container = styled.div`
  margin-top: var(--field-top-spacing);
  display: inline-block;
`;

const Title = styled.legend`
  font-weight: bold;
  font-size: 1rem;
  margin: 0;
`;

const InfoText = styled.p`
  font-style: italic;
  font-size: 0.9rem;
  margin-top: 0.7rem;
  font-weight: normal;
`;

export default (
  <Container>
    <Title>
      Additional Settings (Optional)&nbsp;
      <InfoText>
        *If you would like to configure the Additional Settings, or have any questions,{' '}
        <Link href="mailto:bcgov.sso@gov.bc.ca">please contact the Pathfinder SSO Team</Link>.
      </InfoText>
    </Title>
  </Container>
);
