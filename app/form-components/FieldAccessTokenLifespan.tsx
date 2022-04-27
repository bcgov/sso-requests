import React from 'react';
import styled from 'styled-components';
import { FieldTemplateProps } from 'react-jsonschema-form';
import InfoOverlay from 'components/InfoOverlay';
import FieldTemplate from './FieldTemplate';

const Container = styled.div`
  margin-top: var(--field-top-spacing);
`;

const Title = styled.legend`
  font-weight: bold;
  font-size: 1rem;
  margin: 0;
`;

export default function FieldAccessTokenLifespan(props: FieldTemplateProps) {
  const top = (
    <>
      <Container>
        <Title>
          Additional Settings (Optional)&nbsp;
          <InfoOverlay content="If you would like this to be set for your integration, please contact the Pathifnder SSO Team" />
        </Title>
      </Container>
      <br />
    </>
  );

  return <FieldTemplate {...props} top={top} />;
}
