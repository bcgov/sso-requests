import React from 'react';
import styled from 'styled-components';

const Table = styled.table`
  width: 100%;
  background: #ffffff;
  margin: 1em 0em;
  border: 1px solid rgba(34, 36, 38, 0.15);
  -webkit-box-shadow: none;
  box-shadow: none;
  border-radius: 0.28571429rem;
  text-align: left;
  color: rgba(0, 0, 0, 0.87);
  border-collapse: separate;
  border-spacing: 0px;

  th:first-child,
  td:first-child {
    padding-left: 1em;
  }

  & th,
  & td {
    -webkit-transition: background 0.1s ease, color 0.1s ease;
    transition: background 0.1s ease, color 0.1s ease;
  }
`;

export default Table;
