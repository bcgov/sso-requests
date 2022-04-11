import React from 'react';
import styled from 'styled-components';
import { FieldTemplateProps } from 'react-jsonschema-form';
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
    <Container>
      <Title>Additional Settings (Optional)</Title>
    </Container>
  );

  return <FieldTemplate {...props} top={top} />;
}
