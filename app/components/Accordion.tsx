import React, { useState } from 'react';
import AccordionPanel from 'components/AccordionPanel';
import styled from 'styled-components';

interface Props {
  children: any;
}

const ActionsContainer = styled.div`
  display: flex;
  flex-direction: row;
  & span {
    cursor: pointer;
  }
`;

const Divider = styled.span`
  border-right: 1px solid black;
  margin: 0 10px;
`;

function Accordion({ children }: Props) {
  const [allOpen, setAllOpen] = useState<boolean | null>(null);

  const handleClose = () => {
    setAllOpen(false);
  };

  const handleOpen = () => {
    setAllOpen(true);
  };

  return (
    <>
      <ActionsContainer>
        <span onClick={handleOpen}>Expand All</span>
        <Divider />
        <span onClick={handleClose}>Collapse All</span>
      </ActionsContainer>
      {Array.isArray(children)
        ? children?.map((child: any) => React.cloneElement(child, { allOpen, setAllOpen }))
        : React.cloneElement(children, { allOpen, setAllOpen })}
    </>
  );
}

Accordion.Panel = AccordionPanel;

export default Accordion;
