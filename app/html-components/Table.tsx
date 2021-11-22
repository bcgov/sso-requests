import React from 'react';
import styled from 'styled-components';
import { TABLE_ROW_HEIGHT, TABLE_ROW_SPACING } from 'styles/theme';

const Table = styled.table`
  width: 100%;
  -webkit-box-shadow: none;
  box-shadow: none;
  text-align: left;
  border-collapse: separate;
  border-spacing: 0 ${TABLE_ROW_SPACING}px;

  & thead {
    font-size: 12px;
    color: #777777;

    & th {
      min-width: 140px;
    }
  }

  & tbody {
    font-size: 16px;

    tr {
      height: ${TABLE_ROW_HEIGHT}px;
      background-color: #f8f8f8;
      &:hover {
        background-color: #fff7d5;
      }
      &.active {
        background-color: #ffed9f;
      }
    }
  }

  th:first-child,
  td:first-child {
    padding-left: 1em;
  }

  & th,
  & td {
    border: none;
    padding: 0;
  }
`;

export default Table;
