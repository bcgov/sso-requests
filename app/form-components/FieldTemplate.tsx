import React from 'react';
import styled from 'styled-components';
import clsx from 'clsx';
import noop from 'lodash.noop';
import InfoOverlay from 'components/InfoOverlay';
import { FieldTemplateProps } from '@rjsf/utils/lib/types';

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
            <Title data-testid={`${id}_title`}>
              <label htmlFor={props.id}>{label}&nbsp;</label>
              {tooltip && (
                <InfoOverlay {...tooltip} trigger={tooltip?.trigger ? tooltip?.trigger : ['hover', 'focus']} />
              )}
            </Title>
          )}
          <div data-testid={`${id}_description`}>{descriptionToUse}</div>
          {children}
          {errors}
          {help}
        </>
      </div>
      {bottom}
    </>
  );
}
