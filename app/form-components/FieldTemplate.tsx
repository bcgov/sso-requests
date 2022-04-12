import React from 'react';
import { FieldTemplateProps } from 'react-jsonschema-form';
import styled from 'styled-components';
import clsx from 'clsx';
import { noop } from 'lodash';
import InfoOverlay from 'components/InfoOverlay';

const Title = styled.legend`
  font-weight: bold;
  font-size: 1rem;
  margin: 0;
`;

export default function FieldTemplate(
  props: FieldTemplateProps & { top?: React.ReactElement; bottom?: React.ReactElement },
) {
  const {
    formContext,
    classNames,
    label,
    displayLabel,
    help,
    errors,
    children,
    schema,
    top = null,
    bottom = null,
  } = props;
  const { type, tooltip, description, additionalClassNames } = schema as any;

  const classes = clsx(classNames, additionalClassNames);

  if (type === 'array') {
    return (
      <>
        {top}
        <div className={classes}>{children}</div>
        {bottom}
      </>
    );
  }

  return (
    <>
      {top}
      <div className={classes}>
        {displayLabel && label && (
          <Title>
            {label}&nbsp;
            {tooltip && <InfoOverlay {...tooltip} onClick={() => tooltip?.onClick(formContext) || noop} />}
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
