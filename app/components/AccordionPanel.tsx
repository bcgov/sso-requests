import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleDown, faAngleUp } from '@fortawesome/free-solid-svg-icons';

const ACCORDION_HEADER_COLOR = '#eaeaea';
const ACCORDION_BODY_COLOR = '#f5f5f5';

interface SmoothTransitionProps {
  open?: boolean | null;
}

const SmoothTransition = styled.div<SmoothTransitionProps>`
  transition: max-height 0.4s, padding 0.4s;
  max-height: 300px;
  padding: 10px 20px;
  background-color: ${ACCORDION_BODY_COLOR};
  ${(props) => !props.open && 'max-height: 0px; padding: 0 20px;'};
  overflow-y: hidden;
`;

const Container = styled.div`
  margin: 10px 0;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  cursor: pointer;
  padding: 10px 20px;
  background-color: ${ACCORDION_HEADER_COLOR};
  & header {
    font-size: 1.5rem;
    font-weight: bold;
  }
`;

export default function Accordionpanel({ title, allOpen, setAllOpen, children }: any) {
  const [open, setOpen] = useState(allOpen);

  const handleClick = () => {
    setOpen(!open);
    setAllOpen(null);
  };

  useEffect(() => {
    if (allOpen === null) return;
    setOpen(allOpen);
  }, [allOpen]);

  return (
    <Container>
      <Header onClick={handleClick}>
        <span>{title}</span>
        <FontAwesomeIcon icon={open ? faAngleUp : faAngleDown} size="2x"></FontAwesomeIcon>
      </Header>
      <SmoothTransition open={open}>{children}</SmoothTransition>
    </Container>
  );
}
