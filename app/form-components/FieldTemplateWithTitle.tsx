import React from 'react';
import styled from 'styled-components';
import InfoOverlay from 'components/InfoOverlay';

const Title = styled.legend`
  font-weight: bold;
  font-size: 1rem;
  margin: 0;
`;

export default function FieldTemplateWithTitle(props: any) {
  const { id, classNames, label, help, required, errors, children, schema } = props;
  const { tooltipTitle, tooltipContent, hide = 250, description, displayTitle } = schema;
  return (
    <div className={classNames}>
      <Title>
        {displayTitle || label}&nbsp;
        {tooltipContent && <InfoOverlay tooltipTitle={tooltipTitle} tooltipContent={tooltipContent} hide={hide} />}
      </Title>
      {description}
      {children}
      {errors}
      {help}
    </div>
  );
}
