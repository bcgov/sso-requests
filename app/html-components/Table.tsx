import styled from 'styled-components';
import { TABLE_ROW_HEIGHT, TABLE_ROW_SPACING, TABLE_ROW_HEIGHT_MINI } from 'styles/theme';

const Table = styled.table<{ variant?: string; readOnly?: boolean }>`
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
          background-color: #f0f8fe;
          cursor: pointer;
        }
        &.active {
          background-color: #f0f8fe;
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
    text-align: ${(props) => (props.variant === 'mini' ? `left` : `right`)};
  }

  & th,
  & td {
    border: none;
    padding: 0;
  }
`;

export default Table;
