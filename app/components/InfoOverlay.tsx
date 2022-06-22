import React from 'react';
import OverlayTrigger, { OverlayTriggerType } from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import PopoverHeader from 'react-bootstrap/PopoverHeader';
import PopoverBody from 'react-bootstrap/PopoverBody';
import styled from 'styled-components';
import { noop } from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE } from 'styles/theme';

const StyledPopover = styled(Popover)`
  font-size: ${DEFAULT_FONT_SIZE} !important;
  font-family: ${DEFAULT_FONT_FAMILY} !important;
`;

interface Props {
  title?: string;
  content?: string;
  show?: number;
  hide?: number;
  icon?: IconDefinition;
  onClick?: () => void;
  trigger?: OverlayTriggerType[];
}

export default function InfoOverlay({
  title,
  content,
  show = 250,
  hide = 250,
  icon = faInfoCircle,
  onClick = noop,
  trigger = ['hover', 'focus'],
}: Props) {
  const popover = (
    <Popover id="popover-basic">
      {title && <PopoverHeader>{title}</PopoverHeader>}
      {content && <PopoverBody dangerouslySetInnerHTML={{ __html: content }} />}
    </Popover>
  );

  return (
    <OverlayTrigger trigger={trigger} placement="right-start" overlay={popover} delay={{ show, hide }}>
      <span>
        <FontAwesomeIcon color="#777777" icon={icon} onClick={onClick} />
      </span>
    </OverlayTrigger>
  );
}
