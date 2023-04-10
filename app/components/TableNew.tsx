import { Table as StyledTable, SearchBar } from '@bcgov-sso/common-react-components';
import Button from '@button-inc/bcgov-theme/Button';
import React, { useEffect, useState } from 'react';
import { useTable, usePagination, useFilters, useGlobalFilter, Column, useSortBy, Row } from 'react-table';
import Grid from '@button-inc/bcgov-theme/Grid';
import Pagination from 'react-bootstrap/Pagination';
import styled from 'styled-components';
import Select from 'react-select';
import SectionHeader from './SectionHeader';
import { MultiSelect } from 'react-multi-select-component';
import { faSortDown, faSortUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Option } from 'interfaces/Request';
import noop from 'lodash.noop';
import InfoOverlay from './InfoOverlay';
import ReactPlaceholder from 'react-placeholder/lib';
import { TextBlock } from 'react-placeholder/lib/placeholders';
import { TABLE_ROW_HEIGHT, TABLE_ROW_SPACING } from 'styles/theme';

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

// function GlobalFilter({ preGlobalFilteredRows, globalFilter, setGlobalFilter, searchPlaceholder }: any) {
//   const count = preGlobalFilteredRows.length;
//   const [value, setValue] = React.useState(globalFilter);
//   const onChange = useAsyncDebounce((value) => {
//     setGlobalFilter(value || undefined);
//   }, 200);

//   return (
//     <SearchBar
//       type="text"
//       size="small"
//       maxLength="1000"
//       placeholder={searchPlaceholder}
//       onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
//         setValue(e.target.value);
//         onChange(e.target.value);
//       }}
//     />
//   );
// }

function SelectColumnFilter({ setFilter, options, setValue }: any) {
  return (
    <>
      <Select
        className="basic-multi-select"
        classNamePrefix="select"
        onChange={(val) => {
          //const allValues = Array.from(val.map((o: any) => o.value).filter(Boolean));
          setFilter('status', val);
          setValue(val);
        }}
        options={options}
        isMulti
      ></Select>
    </>
  );
}

export interface TableFilter {
  key?: string;
  value?: string | Option[];
  multiselect?: boolean;
  onChange?: Function;
  options: Option[];
  label?: string;
}

interface Props {
  variant?: string;
  headers: Column[];
  data: any;
  activateRow?: (row: Row) => void;
  searchKey?: string;
  searchPlaceholder?: string;
  searchTooltip?: string;
  colfilters: TableFilter[];
  searchLocation?: 'left' | 'right';
  totalColSpan?: number;
  searchColSpan?: number;
  filterColSpan?: number;
  showFilters?: boolean;
  showContent?: boolean;
  headerAlign?: string;
  headerGutter?: number[];
  loading?: boolean;
  onPage?: (val: number) => void;
  rowCount?: number;
  onEnter?: (val: string) => void;
  onSearch?: (val: string) => void;
  pageLimits?: number[];
  onLimit?: (val: number) => void;
  limit?: number;
}

function Table({
  variant = 'medium',
  headers,
  data,
  activateRow = noop,
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
  onPage = noop,
  onEnter = noop,
  rowCount = 10,
  searchKey = '',
  onSearch = noop,
  loading,
  pageLimits = [],
  onLimit = noop,
  limit = 10,
}: Props) {
  const pageItemsSize = [5, 10, 15, 30, 50, 100];
  const columns: Column[] = React.useMemo(() => headers, [headers]);
  const rowsData = React.useMemo(() => data, [data]);
  const [selectedRow, setSelectedRow] = useState<Row>();
  const [_searchKey, setSearchKey] = useState(searchKey);
  const handleSearchKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKey(event.target.value);
  };

  const handleKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onEnter(_searchKey);
    }
  };

  const handleSearchSubmit = () => {
    onSearch(_searchKey);
  };

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
  } = useTable(
    {
      columns,
      data: rowsData,
      initialState: { pageIndex: 0 },
      manualPagination: true,
      pageCount: Math.ceil(rowCount / limit),
      autoResetPage: false,
    },
    useFilters,
    useGlobalFilter,
    useSortBy,
    usePagination,
  );

  let rowSpaces = rowCount || pageSize;
  if (rowCount > pageSize) rowSpaces = pageSize;

  const awesomePlaceholder = (
    <td colSpan={100}>
      <div
        style={{
          height: `${rowSpaces * (TABLE_ROW_HEIGHT + TABLE_ROW_SPACING) - TABLE_ROW_SPACING}px`,
          paddingTop: '10px',
        }}
      >
        <TextBlock rows={rowSpaces * 2} color="#CCC" />
      </div>
    </td>
  );

  const PaginationItemsDetail = () => {
    return (
      <>
        <Pagination.Item
          key="prev"
          disabled={!canPreviousPage}
          onClick={() => {
            previousPage();
            //setCurrPage(currPage > 1 ? currPage - 1 : 1);
            //onPage(currentPage !== 1 ? currentPage - 1 : 1);
          }}
        >
          Previous
        </Pagination.Item>
        <Pagination.Item
          key="next"
          disabled={!canNextPage}
          onClick={() => {
            nextPage();
            //setCurrPage(currPage + 1);
            //onPage((currentPage += 1));
          }}
        >
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

  const handlePageLimitChange = (val: number) => {
    onLimit(val);
  };

  const updateSelectedRow = (row: any) => {
    activateRow(row);
    setSelectedRow(row);
  };

  const searchCol = (
    <Grid.Col span={searchColSpan}>
      <Grid cols={12}>
        <Grid.Row gutter={[5, 0]} align="center">
          <Grid.Col span={8}>
            <SearchBar
              type="text"
              size="small"
              maxLength="1000"
              placeholder={searchPlaceholder}
              value={_searchKey}
              onChange={handleSearchKeyChange}
              onKeyUp={handleKeyUp}
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <InfoOverlay content={searchTooltip}>
              <Button type="button" size="small" onClick={handleSearchSubmit}>
                Search
              </Button>
            </InfoOverlay>
          </Grid.Col>
        </Grid.Row>
      </Grid>
    </Grid.Col>
  );

  const filterCol = (
    <Grid.Col span={filterColSpan} style={{ textAlign: 'right' }}>
      <FiltersContainer itemsLength={colfilters.length}>
        {colfilters.map((filter: TableFilter, index: number) => (
          <Label key={index}>
            {filter.multiselect ? (
              <>
                {filter.label}
                <SelectColumnFilter setFilter={setFilter} options={filter.options} setValue={filter.onChange} />
              </>
            ) : (
              <>
                {filter.label}
                <Select
                  className="basic-single"
                  classNamePrefix="select"
                  //@ts-ignore
                  options={filter.options}
                  onChange={(val) => filter.onChange && filter.onChange([val])}
                  defaultValue={typeof filter.value === 'string' ? filter.value : ''}
                  isSearchable={true}
                />
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

  useEffect(() => {
    onPage(pageIndex + 1);
  }, [pageIndex]);

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
        <ReactPlaceholder ready={!loading || false} showLoadingAnimation customPlaceholder={awesomePlaceholder}>
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
        </ReactPlaceholder>
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
                onChange={(v: any) => handlePageLimitChange(v.value)}
              ></StyledSelect>
            </div>
          </Grid.Col>
        </Grid.Row>
      </Grid>
    </>
  );
}

export default Table;
