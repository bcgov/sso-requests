import React, { ReactNode } from 'react';
import styled from 'styled-components';
import clsx from 'clsx';
import InfoOverlay from 'components/InfoOverlay';
import { FieldTemplateProps } from '@rjsf/utils/lib/types';

const Label = styled.span`
  width: 16rem;
  & label {
    font-weight: 700;
    font-size: 1rem;
  }
`;

const Container = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 0.7rem;
  margin-bottom: 0.7rem;
`;

export default function FieldTemplate(
  props: FieldTemplateProps & { top?: React.ReactElement; bottom?: React.ReactElement },
) {
  const { id, classNames, label, displayLabel, help, errors, children, schema, bottom = null } = props;
  const { type, tooltip, description, additionalClassNames, top = null } = schema as any;

  const classes = clsx(classNames, additionalClassNames);

  // prevent array components from displaying the same description in `ArrayFieldTemplate`.
  const descriptionToUse = type === 'array' ? null : description;
  return (
    <>
      {top}
      <div className={classes}>
        <Container>
          {displayLabel && label && (
            <Label>
              <label htmlFor={props.id}>{label}&nbsp;</label>
              {tooltip && (
                <InfoOverlay {...tooltip} trigger={tooltip?.trigger ? tooltip?.trigger : ['hover', 'focus']} />
              )}
            </Label>
          )}
          <div data-testid={`${id}_description`}>{descriptionToUse}</div>
          {children as ReactNode}
        </Container>
        {errors as ReactNode}
        {help as ReactNode}
      </div>
      {bottom}
    </>
  );
}
