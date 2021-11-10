import React from 'react';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { SECONDARY_BLUE } from 'styles/theme';

interface Props {
  children?: any;
}

const PaddedIcon = styled(FontAwesomeIcon)`
  margin-right: 10px;
`;

const FlexContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export default function InfoMessage({ children }: Props) {
  return (
    <FlexContainer>
      <PaddedIcon icon={faInfoCircle} color={SECONDARY_BLUE} size="2x" />
      <span>
        <em>{children}</em>
      </span>
    </FlexContainer>
  );
}
