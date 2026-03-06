import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  Row,
  PaginationState,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnFiltersState,
  ColumnDef,
  VisibilityState,
  InitialTableState,
} from '@tanstack/react-table';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSortDown, faSortUp, faSort } from '@fortawesome/free-solid-svg-icons';
import SearchBar from './SearchBar';
import Button from './Button';
import { use } from 'chai';
import { filter } from 'lodash';
import TextBlock from 'react-placeholder/lib/placeholders/TextBlock';
import ReactPlaceholder from 'react-placeholder';

export const TABLE_BACKGROUND_COLOR = '#ededed';
export const TABLE_ROW_ACTIVE_COLOR = '#4950FA';
export const TABLE_ROW_HOVER_COLOR = '#fdb913';
export const TABLE_ROW_HEIGHT = 40;
export const TABLE_ROW_HEIGHT_MINI = 40;
export const TABLE_ROW_SPACING = 5;
export const TABLE_ROW_BORDER_RADIUS = 6;

const StyledTable = styled.table<{ variant?: string; readOnly?: boolean }>`
  width: 100%;
  -webkit-box-shadow: none;
  background-color: ${TABLE_BACKGROUND_COLOR};
  padding: 0 0.6em;
  box-shadow: none;
  text-align: left;
  border-collapse: separate;
  border-spacing: 0 ${TABLE_ROW_SPACING}px;
  color: black;
  margin-bottom: 0.5em;

  & thead {
    font-size: 16px;
    & > th {
      min-width: ${(props) => (props.variant === 'mini' ? '30px' : '140px')};
    }
  }

  & tbody {
    font-size: ${(props) => (props.variant === 'mini' ? '14px' : '16px')};
    & > tr {
      height: ${(props) => (props.variant === 'mini' ? `${TABLE_ROW_HEIGHT_MINI}px` : `${TABLE_ROW_HEIGHT}px`)};
      background-color: #fff;

      td:first-child {
        border-top-left-radius: ${TABLE_ROW_BORDER_RADIUS}px;
      }
      td:last-child {
        border-top-right-radius: ${TABLE_ROW_BORDER_RADIUS}px;
      }

      td:first-child {
        border-bottom-left-radius: ${TABLE_ROW_BORDER_RADIUS}px;
      }
      td:last-child {
        border-bottom-right-radius: ${TABLE_ROW_BORDER_RADIUS}px;
      }

      ${(props) =>
        !props.readOnly &&
        `
        &.active {
          background-color: ${TABLE_ROW_ACTIVE_COLOR};
          color: #fff;
          font-weight: bold;
        }
        &:hover {
          background-color: ${TABLE_ROW_HOVER_COLOR};
          color: #fff;
          cursor: pointer;
        }
      `}
    }
  }

  & th:first-child,
  & td:first-child {
    padding-left: 1em;
    text-align: left;
  }

  & th,
  & td {
    border: none;
    padding: 0;
    overflow: hidden;
  }
`;

const approvalOptions: { value: null | boolean; label: string }[] = [
  { value: null, label: 'Submitted' },
  { value: true, label: 'Completed' },
  { value: false, label: 'Draft' },
];

export interface Option {
  value: string | string[];
  label: string;
}

export interface TableFilter {
  key?: string;
  value?: string | Option[];
  multiselect?: boolean;
  onChange?: Function;
  options: Option[];
  label?: string;
}

export interface Column {
  header: string;
  accessorKey: string;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  meta?: {
    filterLabel?: string;
    filterOptions?: Option[];
    multiSelect?: boolean;
    filterPlaceholder?: string;
    defaultValue?: string | Option[];
  };
  cell?: (props: { value: any; row: Row<unknown> }) => React.ReactNode;
  footer?: React.ReactNode;
}

export interface TableProps<T extends object> {
  variant?: string;
  readOnly?: boolean;
  columns: ColumnDef<T, any>[];
  hiddenColumns?: string[];
  data: T[];
  onRowSelect?: Function;
  defaultPageSize?: number;
  enableGlobalSearch?: boolean;
  globalSearchPlaceholder?: string;
  globalSearchStyle?: React.CSSProperties;
  enablePagination?: boolean;
  pageSizeOptions?: number[];
  noDataFoundMessage?: React.ReactNode;
  initialState?: InitialTableState;
  loading?: boolean;
  autoSelectFirstRow?: boolean;
}

const awesomePlaceholder = (
  <tr>
    <td colSpan={100}>
      <div
        style={{
          height: `${10 * (TABLE_ROW_HEIGHT_MINI + TABLE_ROW_SPACING) - TABLE_ROW_SPACING}px`,
          paddingTop: '10px',
        }}
      >
        <TextBlock rows={10 * 2} color="#CCC" />
      </div>
    </td>
  </tr>
);

const buildDefaultFilters = (columns: any[]) => {
  const filterState: any = {};
  const columnFilters: any[] = [];

  columns.forEach((col) => {
    const meta = col.columnDef?.meta;
    const id = col.id;

    if (meta?.defaultValue) {
      filterState[id] = meta.defaultValue;

      const value = meta.multiSelect ? meta.defaultValue.map((v: any) => v.value) : meta.defaultValue.value;

      columnFilters.push({
        id,
        value,
      });
    }
  });

  return { filterState, columnFilters };
};

const Table = <T extends object>({
  variant = 'default',
  columns = [],
  hiddenColumns = [],
  data = [],
  readOnly = false,
  onRowSelect = (rowData: T) => {},
  defaultPageSize = 5,
  enableGlobalSearch = true,
  globalSearchPlaceholder = 'Search all columns...',
  globalSearchStyle = {},
  enablePagination = true,
  pageSizeOptions = [5, 10, 20, 30, 40, 50],
  noDataFoundMessage = <p>No data found</p>,
  loading = false,
  autoSelectFirstRow = true,
}: TableProps<T>) => {
  const [selectedRow, setSelectedRow] = useState<Row<T>>();
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });
  const [globalFilter, setGlobalFilter] = React.useState('');

  const initialColumnFilterState: ColumnFiltersState = useMemo(() => {
    return columns
      .map((col: any) => {
        if (col.meta?.defaultValue) {
          const defaultValue = col.meta.defaultValue;
          const filterValue = col.meta.multiSelect
            ? Array.isArray(defaultValue)
              ? defaultValue.map((option: any) => option.value)
              : [defaultValue]
            : defaultValue.value || defaultValue;

          return {
            id: col.accessorKey,
            value: filterValue,
          };
        }
        return null;
      })
      .filter((item) => item !== null);
  }, [columns]);

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(initialColumnFilterState || []);

  const initialVisibility: VisibilityState = useMemo(() => {
    const visibility: VisibilityState = {};

    columns.forEach((col: any) => {
      const key = col.accessorKey;
      if (key) {
        visibility[key] = !hiddenColumns.includes(key);
      }
    });

    return visibility;
  }, [columns, hiddenColumns]);

  const [columnVisibility, setColumnVisibility] = React.useState(initialVisibility);

  const table = useReactTable({
    data,
    columns,
    enableColumnFilters: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    manualPagination: !enablePagination,
    filterFns: {},
    state: {
      pagination,
      globalFilter,
      columnFilters,
      columnVisibility,
    },
    onColumnVisibilityChange: setColumnVisibility,
  });

  useEffect(() => {
    if (table.getRowModel().rows.length === 1 || (autoSelectFirstRow && table.getRowModel().rows.length > 0)) {
      onRowClick(table.getRowModel().rows[0]);
    }
  }, [table.getRowModel().rows.length]);

  const onRowClick = (row: Row<unknown>) => {
    if (!readOnly) {
      setSelectedRow(row as Row<T>);
      onRowSelect(row.original);
    }
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'flex-end',
          gap: '0.5em',
          padding: '0.5em 0',
          flexWrap: 'wrap',
        }}
      >
        {enableGlobalSearch && (
          <div style={{ width: '250px' }}>
            <SearchBar
              value={globalFilter ?? ''}
              onChange={(e: any) => setGlobalFilter(String(e.target.value))}
              placeholder={globalSearchPlaceholder}
              style={globalSearchStyle}
            />
          </div>
        )}

        {table.getAllLeafColumns().map((column) => {
          if (!column.getCanFilter()) return null;

          const meta: any = column.columnDef.meta || {};

          // Raw filter value stored in table state
          const filterValue = column.getFilterValue();

          // Convert primitive filter value → React Select option object
          const options = meta.filterOptions || [];

          let selectedValue = null;

          if (meta.multiSelect && Array.isArray(filterValue)) {
            selectedValue = options.filter((opt: any) => filterValue.includes(opt.value));
          } else if (!meta.multiSelect && filterValue) {
            selectedValue = options.find((opt: any) => opt.value === filterValue);
          }

          return (
            <div key={column.id} style={{ width: '250px' }}>
              <label style={{ fontWeight: 'bold' }}>{String(meta.filterLabel ?? column.id)}:</label>

              <Select
                value={selectedValue}
                onChange={(selected: any) => {
                  const isMulti = meta.multiSelect;

                  let newFilterValue;

                  if (!selected) {
                    newFilterValue = undefined;
                  } else if (isMulti) {
                    newFilterValue = selected.map((s: any) => s.value);
                  } else {
                    newFilterValue = selected.value;
                  }

                  column.setFilterValue(newFilterValue);
                }}
                options={options}
                isMulti={meta.multiSelect || false}
                placeholder={meta.filterPlaceholder || 'Select...'}
                isClearable
              />
            </div>
          );
        })}
      </div>

      <StyledTable variant={variant} readOnly={readOnly}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>
                  <div
                    {...{
                      className: header.column.getCanSort() ? 'sortable' : '',
                      onClick: () => header.column.toggleSorting(),
                    }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() &&
                      ({
                        asc: <FontAwesomeIcon icon={faSortDown} />,
                        desc: <FontAwesomeIcon icon={faSortUp} />,
                      }[header.column.getIsSorted() as string] ?? <FontAwesomeIcon icon={faSort} />)}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          <ReactPlaceholder ready={!loading || false} showLoadingAnimation customPlaceholder={awesomePlaceholder}>
            {table.getRowModel().rows.length === 0 ? (
              <tr key="no-data">
                <td style={{ textAlign: 'center' }} colSpan={columns.length}>
                  {noDataFoundMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => {
                    onRowClick(row);
                  }}
                  className={row.id === selectedRow?.id ? 'active' : ''}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))
            )}
          </ReactPlaceholder>
        </tbody>
        <tfoot>
          {table.getFooterGroups().map((footerGroup) => (
            <tr key={footerGroup.id}>
              {footerGroup.headers.map((header) => (
                <th key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.footer, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </tfoot>
      </StyledTable>
      {enablePagination && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.5em' }}>
            <Button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              Prev
            </Button>
            <Button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Next
            </Button>
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Select
              defaultValue={{
                label: `${table.getState().pagination.pageSize} per page`,
                value: table.getState().pagination.pageSize,
              }}
              options={pageSizeOptions.map((value) => ({ value, label: `${value} per page` }))}
              onChange={(e: any) => {
                table.setPageSize(Number(e.value));
              }}
              menuPosition="fixed"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Table;
