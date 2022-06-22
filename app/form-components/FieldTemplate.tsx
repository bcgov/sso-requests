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
    id,
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

  // prevent array components from displaying the same description in `ArrayFieldTemplate`.
  const descriptionToUse = type === 'array' ? null : description;

  return (
    <>
      {top}
      <div className={classes}>
        <>
          {displayLabel && label && (
            <Title data-test-id={`${id}_title`}>
              {label}&nbsp;
              {tooltip && <InfoOverlay {...tooltip} onClick={() => tooltip?.onClick(formContext) || noop} />}
            </Title>
          )}
          <div data-test-id={`${id}_description`}>{descriptionToUse}</div>
          {children}
          {errors}
          {help}
        </>
      </div>
      {bottom}
    </>
  );
}
