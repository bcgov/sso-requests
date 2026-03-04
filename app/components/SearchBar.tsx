import React from 'react';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';

const Wrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const Icon = styled.i`
  position: absolute;
  top: 50%;
  right: 12px; /* Adjust position as needed */
  transform: translateY(-50%);
  pointer-events: none; /* Prevent icon from capturing clicks */
`;

const Input = styled.input`
  border: 2px solid #606060;
  padding: 0.3em 0.5em;
  border-radius: 0.25em;
  width: 100%;
  flex-grow: 1;
  padding-right: 24px;

  ::placeholder {
    font-size: 1rem;
  }
`;

function SearchBar(props: any) {
  return (
    <Wrapper>
      <Input type="text" maxLength={100} {...props} />
      <Icon>
        <FontAwesomeIcon icon={faMagnifyingGlass} />
      </Icon>
    </Wrapper>
  );
}

export default SearchBar;
