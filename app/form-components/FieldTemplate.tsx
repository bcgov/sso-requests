import React from 'react';
import { FieldTemplateProps } from 'react-jsonschema-form';
import styled from 'styled-components';
import InfoOverlay from 'components/InfoOverlay';

const Title = styled.legend`
  font-weight: bold;
  font-size: 1rem;
  margin: 0;
`;

export default function FieldTemplate(
  props: FieldTemplateProps & { top?: React.ReactElement; bottom?: React.ReactElement },
) {
  const { classNames, label, displayLabel, help, errors, children, schema, top = null, bottom = null } = props;
  const { type, tooltipTitle, tooltipContent, hide = 250, description } = schema as any;

  if (type === 'array') {
    return (
      <>
        {top}
        <div className={classNames}>{children}</div>
        {bottom}
      </>
    );
  }

  return (
    <>
      {top}
      <div className={classNames}>
        {displayLabel && label && (
          <Title>
            {label}&nbsp;
            {tooltipContent && <InfoOverlay tooltipTitle={tooltipTitle} tooltipContent={tooltipContent} hide={hide} />}
          </Title>
        )}
        {description}
        {children}
        {errors}
        {help}
      </div>
      {bottom}
    </>
  );
}
