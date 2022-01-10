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
    font-size: 16px;
    color: black;

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
        background-color: #f0f8fe;
        cursor: pointer;
      }
      &.active {
        background-color: #f0f8fe;
        font-weight: bold;
        border: 2px solid #9fadc0 !important;
      }
    }
  }

  td:first-child {
    padding-left: 1em;
    text-align: left;
  }

  th:last-child {
    text-align: right;
  }

  & th,
  & td {
    border: none;
    padding: 0;
  }
`;

export default Table;
