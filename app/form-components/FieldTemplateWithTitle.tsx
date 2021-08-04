import React, { useState, useRef } from 'react';
import Overlay from 'react-bootstrap/Overlay';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import Tooltip from 'react-bootstrap/Tooltip';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';

const Title = styled.legend`
  font-weight: bold;
  font-size: 1rem;
  margin: 0;
`;

export default function FieldTemplateWithTitle(props: any) {
  const { id, classNames, label, help, required, description, errors, children, schema } = props;
  const { tooltipTitle, tooltipContent } = schema;

  const popover = (
    <Popover id="popover-basic">
      {tooltipTitle && <Popover.Title>{tooltipTitle}</Popover.Title>}
      {tooltipContent && <Popover.Content dangerouslySetInnerHTML={{ __html: tooltipContent }} />}
    </Popover>
  );

  return (
    <div className={classNames}>
      <Title>
        {label}&nbsp;
        <OverlayTrigger trigger="click" placement="right" overlay={popover}>
          <FontAwesomeIcon color="#777777" icon={faInfoCircle} />
        </OverlayTrigger>
      </Title>
      {description}
      {children}
      {errors}
      {help}
    </div>
  );
}
