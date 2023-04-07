import { Table as StyledTable, SearchBar, Button } from '@bcgov-sso/common-react-components';
import camelCase from 'lodash.camelcase';
import React, { useEffect, useState } from 'react';
import {
  useTable,
  usePagination,
  useFilters,
  useGlobalFilter,
  useAsyncDebounce,
  Column,
  Row,
  useSortBy,
} from 'react-table';
import Grid from '@button-inc/bcgov-theme/Grid';
import Pagination from 'react-bootstrap/Pagination';
import styled from 'styled-components';
import Select from 'react-select';
import SectionHeader from './SectionHeader';
import InfoOverlay from './InfoOverlay';
import { MultiSelect } from 'react-multi-select-component';
import { Dropdown } from '@button-inc/bcgov-theme';
import { faSortDown, faSortUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const StyledMultiSelect = styled(MultiSelect)`
  font-size: 0.9rem;

  .dropdown-container {
    border: 1.8px solid black !important;

    .dropdown-heading {
      height: 32px;
    }
  }
`;

const StyledPagination = styled(Pagination)`
  margin: 0 !important;
  & li {
    margin: 0 !important;
  }
`;

const Label = styled.label`
  cursor: pointer;
  font-weight: bold;
  & * {
    font-weight: normal;
  }
`;

const PageInfo = styled.li`
  padding-left: 5px;
  line-height: 40px;
`;

const StyledSelect = styled(Select)`
  width: 150px;
  display: inline-block;
`;

const FiltersContainer = styled.div<{ itemsLength: number }>`
  display: grid;
  grid-template-columns:
    ${(props) => `repeat(${props.itemsLength}, 1fr);`}
    &> * {
    margin-right: 10px;
    white-space: nowrap;
  }
`;

const overrideStrings = {
  allItemsAreSelected: 'All',
  selectSomeItems: '',
};

function GlobalFilter({ preGlobalFilteredRows, globalFilter, setGlobalFilter, searchPlaceholder }: any) {
  const count = preGlobalFilteredRows.length;
  const [value, setValue] = React.useState(globalFilter);
  const onChange = useAsyncDebounce((value) => {
    setGlobalFilter(value || undefined);
  }, 200);

  return (
    <SearchBar
      type="text"
      size="small"
      maxLength="1000"
      placeholder={searchPlaceholder}
      onChange={(e) => {
        setValue(e.target.value);
        onChange(e.target.value);
      }}
    />
  );
}

function SelectColumnFilter({ setFilter, options, value, setValue }) {
  return (
    <>
      <Select
        className="basic-multi-select"
        classNamePrefix="select"
        onChange={(val) => {
          setFilter('status', val);
          setValue(val);
        }}
        options={options}
        isMulti
      ></Select>
    </>
  );
}

function Table({
  variant = 'medium',
  headers,
  data,
  pagination = false,
  manageRowSelection,
  searchLocation = 'left',
  colfilters = [],
  showFilters = false,
  showContent = true,
  searchPlaceholder = 'Search...',
  searchTooltip = '',
  totalColSpan = 14,
  headerAlign = 'center',
  headerGutter = [],
  filterColSpan = 10,
  searchColSpan = 4,
}: any) {
  const pageItemsSize = [5, 10, 15, 30, 50, 100];

  const columns = React.useMemo(() => headers, [headers]);

  const rowsData = React.useMemo(() => data, [data]);

  const [selectedRow, setSelectedRow] = useState({});

  const tableInstance = useTable(
    { columns, data: rowsData, initialState: { pageIndex: 0, pageSize: pageItemsSize[0] } },
    useFilters,
    useGlobalFilter,
    useSortBy,
    usePagination,
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize, globalFilter, filters },
    visibleColumns,
    preGlobalFilteredRows,
    setGlobalFilter,
    preFilteredRows,
    setFilter,
  } = tableInstance;

  const PaginationItemsDetail = ({ rowCount, limit, page, onPage, onPrev, onNext }: any) => {
    return (
      <>
        <Pagination.Item key="prev" disabled={!canPreviousPage} onClick={() => previousPage()}>
          Previous
        </Pagination.Item>
        <Pagination.Item key="next" disabled={!canNextPage} onClick={() => nextPage()}>
          Next
        </Pagination.Item>
        <PageInfo>{`${pageIndex + 1} of ${pageOptions.length}`}</PageInfo>
      </>
    );
  };

  const numOfItemsPerPage = () => {
    const options = pageItemsSize.map((val) => {
      return { value: val, label: `${val} per page` };
    });

    return options;
  };

  const handlePageSizeChange = (numOfItems: any) => {
    setPageSize(numOfItems.value);
  };

  const updateSelectedRow = (row: any) => {
    manageRowSelection(row);
    setSelectedRow(row);
  };

  const searchCol = (
    <Grid.Col span={searchColSpan}>
      <Grid cols={12}>
        <Grid.Row gutter={[]} align="center">
          <Grid.Col span={8}>
            <GlobalFilter
              preGlobalFilteredRows={preGlobalFilteredRows}
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
              searchPlaceholder={searchPlaceholder}
            />
          </Grid.Col>
        </Grid.Row>
      </Grid>
    </Grid.Col>
  );

  const filterCol = (
    <Grid.Col span={filterColSpan} style={{ textAlign: 'right' }}>
      <FiltersContainer itemsLength={colfilters.length}>
        {colfilters.map((filter, index) => (
          <Label key={index}>
            {filter.multiselect ? (
              <>
                {filter.label}
                <SelectColumnFilter
                  setFilter={setFilter}
                  options={filter.options}
                  value={filter.value}
                  setValue={filter.onChange}
                />
              </>
            ) : (
              <>
                {filter.label}
                <Dropdown
                  data-testid={filter.key}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    filter?.onChange && filter.onChange(event.target.value)
                  }
                  value={typeof filter.value === 'string' ? filter.value : ''}
                >
                  {filter.options.map((option) => (
                    <option
                      value={option.value}
                      key={Array.isArray(option.value) ? JSON.stringify(option.value) : option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </Dropdown>
              </>
            )}
          </Label>
        ))}
      </FiltersContainer>
    </Grid.Col>
  );

  let leftCol = null;
  let rightCol = null;
  if (searchLocation === 'left') {
    leftCol = searchCol;
    rightCol = filterCol;
  } else {
    leftCol = filterCol;
    rightCol = searchCol;
  }

  return (
    <>
      {showFilters && (
        <SectionHeader>
          <Grid cols={totalColSpan}>
            <Grid.Row collapse="1160" gutter={headerGutter} align={headerAlign}>
              {leftCol}
              {rightCol}
            </Grid.Row>
          </Grid>
        </SectionHeader>
      )}
      <StyledTable variant={variant} {...getTableProps()}>
        <thead>
          {
            // Loop over the header rows
            headerGroups.map((headerGroup, index) => (
              // Apply the header row props
              <tr {...headerGroup.getHeaderGroupProps()} key={index}>
                {
                  // Loop over the headers in each row
                  headerGroup.headers.map((column, index) => (
                    // Apply the header cell props
                    <th {...column.getHeaderProps(column.getSortByToggleProps())} key={index}>
                      {
                        // Render the header
                        column.render('Header')
                      }
                      &nbsp;
                      <span>
                        {column.isSorted ? (
                          column.isSortedDesc ? (
                            <FontAwesomeIcon style={{ color: '#000' }} icon={faSortDown} size="sm" />
                          ) : (
                            <FontAwesomeIcon style={{ color: '#000' }} icon={faSortUp} size="sm" />
                          )
                        ) : (
                          ''
                        )}
                      </span>
                    </th>
                  ))
                }
              </tr>
            ))
          }
        </thead>
        <tbody {...getTableBodyProps()}>
          {page.map((row, index: number) => {
            prepareRow(row);
            return (
              <tr
                {...row.getRowProps()}
                className={selectedRow?.id === row?.id ? 'active' : ''}
                key={index}
                onClick={() => updateSelectedRow(row)}
              >
                {row.cells.map((cell, index) => {
                  return (
                    <td {...cell.getCellProps()} key={index}>
                      {cell.render('Cell')}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </StyledTable>
      <Grid cols={12}>
        <Grid.Row collapse="992" gutter={[]} align="center">
          <Grid.Col span={8}>
            <StyledPagination>
              <PaginationItemsDetail />
            </StyledPagination>
          </Grid.Col>
          <Grid.Col span={4}>
            <div style={{ textAlign: 'right' }}>
              <StyledSelect
                menuPosition="fixed"
                defaultValue={pageIndex || numOfItemsPerPage()[0]}
                options={numOfItemsPerPage()}
                onChange={(v: any) => handlePageSizeChange(v)}
              ></StyledSelect>
            </div>
          </Grid.Col>
        </Grid.Row>
      </Grid>
    </>
  );
}

export default Table;
