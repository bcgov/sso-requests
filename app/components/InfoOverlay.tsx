import React from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import DefaultPopover from 'react-bootstrap/Popover';
import styled from 'styled-components';
import { noop } from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE } from 'styles/theme';

const Popover = styled(DefaultPopover)`
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
}

export default function InfoOverlay({
  title,
  content,
  show = 250,
  hide = 250,
  icon = faInfoCircle,
  onClick = noop,
}: Props) {
  const popover = (
    <Popover id="popover-basic">
      {title && <Popover.Title>{title}</Popover.Title>}
      {content && <Popover.Content dangerouslySetInnerHTML={{ __html: content }} />}
    </Popover>
  );
  return (
    <>
      <OverlayTrigger trigger={['hover', 'focus']} placement="right-start" overlay={popover} delay={{ show, hide }}>
        <FontAwesomeIcon color="#777777" icon={icon} onClick={onClick} />
      </OverlayTrigger>
    </>
  );
}
