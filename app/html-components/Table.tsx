import styled from 'styled-components';
import { TABLE_ROW_HEIGHT, TABLE_ROW_SPACING, TABLE_ROW_HEIGHT_MINI, TABLE_ACTIVE_BLUE } from 'styles/theme';

const Table = styled.table<{ variant?: string; readOnly?: boolean }>`
  width: 100%;
  -webkit-box-shadow: none;
  box-shadow: none;
  text-align: left;
  border-collapse: separate;
  border-spacing: 0 ${TABLE_ROW_SPACING}px;
  table-layout: fixed;

  & thead {
    font-size: 16px;
    color: black;

    & th {
      min-width: ${(props) => (props.variant === 'mini' ? '30px' : '140px')};
    }
  }

  & tbody {
    font-size: ${(props) => (props.variant === 'mini' ? '14px' : '16px')};
    tr {
      height: ${(props) => (props.variant === 'mini' ? `${TABLE_ROW_HEIGHT_MINI}px` : `${TABLE_ROW_HEIGHT}px`)};
      background-color: #f8f8f8;
      ${(props) =>
        !props.readOnly &&
        `
        &:hover {
          background-color: ${TABLE_ACTIVE_BLUE};
          cursor: pointer;
        }
        &.active {
          background-color: ${TABLE_ACTIVE_BLUE};
          font-weight: bold;
          border: 2px solid #9fadc0 !important;
        }
      `}
    }
  }

  td:first-child {
    padding-left: 1em;
    text-align: left;
  }

  th:last-child {
    text-align: right;
  }

  td:last-child {
    text-align: right;
  }

  & th,
  & td {
    border: none;
    padding: 0;
    overflow: hidden;
  }

  & th.w60,
  & td.w60 {
    width: 60px;
  }

  & th.w120,
  & td.w120 {
    width: 120px;
  }

  & td {
    ${(props) => props.variant === 'mini' && `background-color: ${TABLE_ACTIVE_BLUE};`}
  }
`;

export default Table;
