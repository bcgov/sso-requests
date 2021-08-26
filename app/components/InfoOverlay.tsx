import React from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import DefaultPopover from 'react-bootstrap/Popover';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE } from 'styles/theme';

const Popover = styled(DefaultPopover)`
  font-size: ${DEFAULT_FONT_SIZE} !important;
  font-family: ${DEFAULT_FONT_FAMILY} !important;
`;

interface Props {
  tooltipTitle: string;
  tooltipContent: string;
  hide: number;
}

export default function InfoOverlay({ tooltipTitle, tooltipContent, hide }: Props) {
  const popover = (
    <Popover id="popover-basic">
      {tooltipTitle && <Popover.Title>{tooltipTitle}</Popover.Title>}
      {tooltipContent && <Popover.Content dangerouslySetInnerHTML={{ __html: tooltipContent }} />}
    </Popover>
  );
  return (
    <>
      <OverlayTrigger trigger="hover" placement="right-start" overlay={popover} delay={{ show: 250, hide }}>
        <FontAwesomeIcon color="#777777" icon={faInfoCircle} />
      </OverlayTrigger>
    </>
  );
}
