import React from 'react';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { SECONDARY_BLUE, PRIMARY_RED } from 'styles/theme';

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

export function InfoMessage({ children }: Props) {
  return (
    <FlexContainer>
      <PaddedIcon icon={faInfoCircle} color={SECONDARY_BLUE} size="2x" />
      <span>
        <em>{children}</em>
      </span>
    </FlexContainer>
  );
}

export function ErrorMessage({ children }: Props) {
  return (
    <FlexContainer>
      <PaddedIcon icon={faExclamationTriangle} color={PRIMARY_RED} size="2x" />
      <span>
        <em>{children}</em>
      </span>
    </FlexContainer>
  );
}
